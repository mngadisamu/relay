-- Migration 0027: email notifications and in-app notices (S4-10). Owner: Samukelo.
-- Built on Baphakamise's notify.ts. Run after 0021 (notices), 0019 (cron_secret) and 0020 (approvals).
--
-- Why: the 0021 policy "System can insert notices" had check (true), so any signed-in person
-- could write a notice for anyone. Now the only way to write a notice is notify_ticket_event(),
-- which decides who gets it and checks that the caller really did the action.

-- 1. Close the open insert policy. Only the functions below write notices.
drop policy if exists "System can insert notices" on public.notices;

-- 2. The outbox: emails waiting to be sent. It holds the reference and a link only,
--    never the text of the request. RLS is on with no policies, so nobody reads or writes it
--    directly; only the functions below do.
create table if not exists public.email_outbox (
  id bigint generated always as identity primary key,
  notice_id uuid references public.notices (id) on delete cascade,
  to_email text not null,
  subject text not null,
  reference text not null,
  title text not null,
  link_path text not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.email_outbox enable row level security;

create index if not exists email_outbox_unsent_idx on public.email_outbox (created_at) where sent_at is null;

-- 3. queue_notice(): writes one in-app notice and, when the person has an email address,
--    one email to the outbox. Only notify_ticket_event() calls it (no grants to app roles).
create or replace function public.queue_notice(
  p_user uuid,
  p_reference text,
  p_title text,
  p_message text,
  p_link text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_notice_id uuid;
  v_email text;
begin
  insert into public.notices (user_id, title, message, link)
  values (p_user, p_title, p_message, p_link)
  returning id into v_notice_id;

  -- The email address is read here, inside the database, so the app never sees it.
  select u.email into v_email from auth.users u where u.id = p_user;
  if v_email is not null then
    insert into public.email_outbox (notice_id, to_email, subject, reference, title, link_path)
    values (v_notice_id, v_email, 'Relay: ' || p_title || ' (' || p_reference || ')', p_reference, p_title, p_link);
  end if;
end;
$$;

revoke execute on function public.queue_notice(uuid, text, text, text, text) from public, anon, authenticated;

-- 4. notify_ticket_event(): the one function the app calls. The caller must have done the
--    action for that ticket, and the function decides who is told.
--      received        the person who sent the request (they must be the caller)
--      needs_approval  managers of the ticket's department and general managers, except the sender
--      decided         the person who sent the request (the caller must be the approver)
--      reply_sent      the person who sent the request (the caller must have sent the reply)
create or replace function public.notify_ticket_event(p_ticket_id bigint, p_event text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  t record;
  appr record;
  m record;
begin
  if v_me is null then
    raise exception 'Sign in first';
  end if;

  select t0.id, t0.reference, t0.submitted_by, t0.department, t0.request_type, t0.is_historical
    into t
    from public.tickets t0
    where t0.id = p_ticket_id;
  if not found or t.is_historical then
    raise exception 'Ticket not found';
  end if;

  -- Check the caller really did this action for this ticket.
  if p_event in ('received', 'needs_approval') then
    if t.submitted_by <> v_me then raise exception 'Not allowed'; end if;
  elsif p_event = 'decided' then
    if not exists (
      select 1 from public.approvals a
      where a.ticket_id = p_ticket_id and a.approver = v_me and a.decided_at is not null
    ) then raise exception 'Not allowed'; end if;
  elsif p_event = 'reply_sent' then
    if not exists (
      select 1 from public.responses r
      where r.ticket_id = p_ticket_id and r.sent_by = v_me and r.sent_at is not null
    ) then raise exception 'Not allowed'; end if;
  else
    raise exception 'Unknown event';
  end if;

  if p_event = 'received' then
    perform public.queue_notice(
      t.submitted_by, t.reference, 'Request received',
      'We have received your request and sent it to the ' || t.department || ' team.',
      '/staff/requests/' || t.id
    );

  elsif p_event = 'needs_approval' then
    -- Every manager who can decide this request, except the person who sent it.
    for m in
      select p.id from public.profiles p
      where p.role = 'manager' and p.active
        and (p.department is null or p.department = t.department)
        and p.id <> t.submitted_by
    loop
      perform public.queue_notice(
        m.id, t.reference, 'Approval needed',
        'A ' || coalesce(t.request_type::text, 'request') || ' request in ' || t.department || ' is waiting for your decision.',
        '/manager/approvals'
      );
    end loop;

  elsif p_event = 'decided' then
    select a.decision into appr
      from public.approvals a
      where a.ticket_id = p_ticket_id and a.decided_at is not null
      order by a.decided_at desc
      limit 1;
    if appr.decision = 'approved' then
      perform public.queue_notice(
        t.submitted_by, t.reference, 'Request approved',
        'Your request was approved, and the team will now work on it.',
        '/staff/requests/' || t.id
      );
    else
      perform public.queue_notice(
        t.submitted_by, t.reference, 'Request declined',
        'Your request was declined. Open it to see the reason.',
        '/staff/requests/' || t.id
      );
    end if;

  elsif p_event = 'reply_sent' then
    perform public.queue_notice(
      t.submitted_by, t.reference, 'Reply sent',
      'The ' || t.department || ' team has replied to your request.',
      '/staff/requests/' || t.id
    );
  end if;
end;
$$;

revoke execute on function public.notify_ticket_event(bigint, text) from public, anon;
grant execute on function public.notify_ticket_event(bigint, text) to authenticated;

-- 5. take_pending_emails(): the server sends the emails in the outbox. Checked with
--    cron_secret (migration 0019), so only the app's server, which holds CRON_SECRET, can call it.
create or replace function public.take_pending_emails(p_secret text)
returns table (
  outbox_id bigint,
  to_email text,
  subject text,
  reference text,
  title text,
  link_path text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.check_cron_secret(p_secret);
  return query
    select o.id, o.to_email, o.subject, o.reference, o.title, o.link_path
    from public.email_outbox o
    where o.sent_at is null
    order by o.created_at
    limit 50;
end;
$$;

-- 6. mark_emails_sent(): called after each email has gone. Anything not marked is tried again.
create or replace function public.mark_emails_sent(p_secret text, p_ids bigint[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.check_cron_secret(p_secret);
  update public.email_outbox set sent_at = now()
  where id = any(p_ids) and sent_at is null;
end;
$$;

grant execute on function public.take_pending_emails(text) to anon, authenticated;
grant execute on function public.mark_emails_sent(text, bigint[]) to anon, authenticated;
