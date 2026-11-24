-- 0039: company-scoped scheduled jobs, reports and summaries, notifications and grants.
-- Written after the 25 Nov audit. Owner: Samukelo (migrations are his).
--
-- What was wrong (all on the live database before this runs):
--  1. The Monday summaries and reports run with nobody signed in, so row-level security does
--     not apply and dashboard_metrics() counted every company's tickets, not one company's.
--  2. reports and insights were unique per department and week (not per company), so a second
--     company's report or summary would have been skipped, or would have overwritten the first.
--  3. auto_assign_ticket() and escalate_urgent_tickets() read profiles without a company check,
--     so they could pick an agent or notify a manager from another company.
--  4. notify_ticket_event() notified managers across companies the same way.
--  5. queue_notice() relied on the column default for company_id, which is the caller's
--     company, so jobs run without a signed-in user wrote Kopano's company id.
--  6. Several database-only functions were executable by anonymous visitors.
--
-- Safe to run twice where possible (if exists, create or replace).

-- ---------------------------------------------------------------------------
-- 1. Metrics for one company (p_company_id) or for all the caller can see.
--    The old 3-argument version is replaced. The new fourth argument has a default, so
--    existing calls with p_from, p_to and p_department still work.
-- ---------------------------------------------------------------------------
drop function if exists public.dashboard_metrics(date, date, text);

create or replace function public.dashboard_metrics(
  p_from date,
  p_to date,
  p_department text default null,
  p_company_id bigint default null
)
returns jsonb
language plpgsql
stable
set search_path to 'public'
as $$
declare
  v_days int;
  v_prev_from date;
  v_prev_to date;
  v_week date;
  m record;
  v_c_review numeric;
  v_p_review numeric;
  v_weekly jsonb;
  v_daily jsonb;
  v_depts jsonb;
begin
  -- Staff don't use the dashboard. (No signed-in user = the SQL Editor or a trusted
  -- server call, which is allowed so the function can be tested.)
  if auth.uid() is not null
     and coalesce(public.current_user_role()::text, '') not in ('agent', 'manager', 'compliance') then
    raise exception 'Not allowed: the dashboard is for agents, managers and compliance';
  end if;

  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'p_from and p_to are required, and p_to must not be before p_from';
  end if;

  v_days      := p_to - p_from + 1;
  v_prev_from := p_from - v_days;
  v_prev_to   := p_from - 1;
  v_week      := date_trunc('week', p_to::timestamp)::date;  -- Monday of the last week

  -- Current period (cur) and previous period (prv) in one pass over the tickets.
  select
    count(*) filter (where cur)                                              as c_n,
    count(*) filter (where cur and answered_at is not null)                  as c_reply_n,
    avg(extract(epoch from answered_at - created_at)::numeric / 3600.0)
      filter (where cur and answered_at is not null)                         as c_reply_h,
    count(*) filter (where cur and status <> 'closed')                       as c_open,
    count(*) filter (where cur and needs_review)                             as c_review,
    count(*) filter (where cur and closed_at is not null)                    as c_res_n,
    avg(extract(epoch from closed_at - created_at)::numeric / 3600.0)
      filter (where cur and closed_at is not null)                           as c_res_h,
    count(*) filter (where cur and priority = 'low')                         as c_low,
    count(*) filter (where cur and priority = 'medium')                      as c_med,
    count(*) filter (where cur and priority = 'high')                        as c_high,
    count(*) filter (where cur and priority = 'urgent')                      as c_urgent,
    count(*) filter (where prv)                                              as p_n,
    avg(extract(epoch from answered_at - created_at)::numeric / 3600.0)
      filter (where prv and answered_at is not null)                         as p_reply_h,
    count(*) filter (where prv and status <> 'closed')                       as p_open,
    count(*) filter (where prv and needs_review)                             as p_review,
    avg(extract(epoch from closed_at - created_at)::numeric / 3600.0)
      filter (where prv and closed_at is not null)                           as p_res_h
  into m
  from (
    select t.created_at, t.answered_at, t.closed_at, t.needs_review,
           lower(t.status::text)   as status,
           lower(t.priority::text) as priority,
           (t.created_at at time zone 'Africa/Johannesburg')::date
             between p_from and p_to           as cur,
           (t.created_at at time zone 'Africa/Johannesburg')::date
             between v_prev_from and v_prev_to as prv
    from public.tickets t
    where (p_department is null or t.department::text = p_department)
      and (p_company_id is null or t.company_id = p_company_id)
  ) z;

  v_c_review := case when m.c_n = 0 then null else round(m.c_review * 100.0 / m.c_n, 1) end;
  v_p_review := case when m.p_n = 0 then null else round(m.p_review * 100.0 / m.p_n, 1) end;

  -- 12 weeks ending with the week that contains p_to (weeks start on Monday)
  select coalesce(jsonb_agg(jsonb_build_object('week_start', w.week_start, 'tickets', w.n)
                            order by w.week_start), '[]'::jsonb)
  into v_weekly
  from (
    select s::date as week_start,
           (select count(*) from public.tickets t
             where (p_department is null or t.department::text = p_department)
               and (p_company_id is null or t.company_id = p_company_id)
               and (t.created_at at time zone 'Africa/Johannesburg')::date
                   between s::date and s::date + 6) as n
    from generate_series(v_week - 77, v_week, interval '7 days') s
  ) w;

  -- One entry for every day from p_from to p_to, with 0 on empty days
  select coalesce(jsonb_agg(jsonb_build_object('date', d.day, 'tickets', d.n)
                            order by d.day), '[]'::jsonb)
  into v_daily
  from (
    select s::date as day,
           (select count(*) from public.tickets t
             where (p_department is null or t.department::text = p_department)
               and (p_company_id is null or t.company_id = p_company_id)
               and (t.created_at at time zone 'Africa/Johannesburg')::date = s::date) as n
    from generate_series(p_from, p_to, interval '1 day') s
  ) d;

  select coalesce(jsonb_agg(jsonb_build_object('department', x.department, 'tickets', x.n)
                            order by x.n desc, x.department), '[]'::jsonb)
  into v_depts
  from (
    select t.department::text as department, count(*) as n
    from public.tickets t
    where (t.created_at at time zone 'Africa/Johannesburg')::date between p_from and p_to
      and (p_department is null or t.department::text = p_department)
      and (p_company_id is null or t.company_id = p_company_id)
    group by t.department
  ) x;

  return jsonb_build_object(
    'period',          jsonb_build_object('from', p_from, 'to', p_to, 'days', v_days),
    'previous_period', jsonb_build_object('from', v_prev_from, 'to', v_prev_to),
    'department',      p_department,
    'generated_at',    now(),
    'cards', jsonb_build_object(
      'tickets', jsonb_build_object(
        'value', m.c_n, 'previous', m.p_n,
        'change_pct', public.metrics_pct_change(m.c_n, m.p_n)),
      'first_reply_hours', jsonb_build_object(
        'value',      round(m.c_reply_h, 1),
        'previous',   round(m.p_reply_h, 1),
        'change_pct', public.metrics_pct_change(m.c_reply_h, m.p_reply_h),
        'based_on',   m.c_reply_n),
      'open_tickets', jsonb_build_object(
        'value', m.c_open, 'previous', m.p_open,
        'change_pct', public.metrics_pct_change(m.c_open, m.p_open)),
      'needs_review', jsonb_build_object(
        'value', v_c_review, 'previous', v_p_review,
        'change_points', case when v_c_review is not null and v_p_review is not null
                              then round(v_c_review - v_p_review, 1) end,
        'count', m.c_review)
    ),
    'resolution_hours', jsonb_build_object(
      'value',      round(m.c_res_h, 1),
      'previous',   round(m.p_res_h, 1),
      'change_pct', public.metrics_pct_change(m.c_res_h, m.p_res_h),
      'based_on',   m.c_res_n),
    'by_priority', jsonb_build_object(
      'Low', m.c_low, 'Medium', m.c_med, 'High', m.c_high, 'Urgent', m.c_urgent),
    'by_department', v_depts,
    'weekly',        v_weekly,
    'daily',         v_daily
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. The companies that had tickets in a period. The Monday summary loops over these,
--    so a company with no activity costs no AI calls.
-- ---------------------------------------------------------------------------
create or replace function public.scheduled_companies(p_secret text, p_from date, p_to date)
returns setof bigint
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform public.check_cron_secret(p_secret);
  return query
    select distinct t.company_id
    from public.tickets t
    where (t.created_at at time zone 'Africa/Johannesburg')::date between p_from and p_to
    order by t.company_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Scheduled metrics and summaries take the company. The old versions are dropped first,
--    so the database does not hold two overloads with the same name.
-- ---------------------------------------------------------------------------
drop function if exists public.scheduled_period_metrics(text, date, date, text);

create or replace function public.scheduled_period_metrics(
  p_secret text,
  p_from date,
  p_to date,
  p_department text,
  p_company_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform public.check_cron_secret(p_secret);
  return public.dashboard_metrics(p_from, p_to, p_department, p_company_id);
end;
$$;

-- An insight is unique per company, period and department (was: period and department only).
alter table public.insights drop constraint if exists insights_period_department_key;
drop index if exists public.insights_period_department_key;
create unique index if not exists insights_company_period_department_key
  on public.insights (company_id, period_from, period_to, (coalesce(department, 'all')));

drop function if exists public.save_scheduled_summary(text, date, date, text, text, jsonb, text);

create or replace function public.save_scheduled_summary(
  p_secret text,
  p_period_from date,
  p_period_to date,
  p_department text,
  p_summary text,
  p_metrics jsonb,
  p_status text,
  p_company_id bigint
)
returns bigint
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id bigint;
begin
  perform public.check_cron_secret(p_secret);

  update public.insights
  set summary = p_summary,
      metrics = p_metrics,
      status = p_status,
      week_start = p_period_from
  where company_id = p_company_id
    and period_from = p_period_from
    and period_to = p_period_to
    and coalesce(department, 'all') = coalesce(p_department, 'all')
  returning id into v_id;

  if v_id is null then
    insert into public.insights (company_id, week_start, period_from, period_to, department, summary, metrics, status)
    values (p_company_id, p_period_from, p_period_from, p_period_to, p_department, p_summary, p_metrics, p_status)
    returning id into v_id;
  end if;

  -- Every generated summary is logged (docs/audit-actions.md). No signed-in user, so actor is empty.
  insert into public.audit_log (actor, action, details, company_id)
  values (null, 'insight_generate', jsonb_build_object(
    'insight_id', v_id,
    'department', p_department,
    'period_from', p_period_from,
    'period_to', p_period_to,
    'ai_generated', p_status = 'ok',
    'scheduled', true
  ), p_company_id);

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Reports are unique per company, department and week (was: department and week only).
-- ---------------------------------------------------------------------------
alter table public.reports drop constraint if exists reports_department_week_key;
drop index if exists public.reports_department_week_key;
create unique index if not exists reports_company_department_week_key
  on public.reports (company_id, department, week_start);

-- Monday job: one report per company that had tickets last week, for each department.
create or replace function public.generate_weekly_reports()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_company bigint;
  v_dept text;
  v_today date := (now() at time zone 'Africa/Johannesburg')::date;
  v_week_start date := date_trunc('week', v_today - 7)::date;  -- the Monday of last week
  v_week_end date := v_week_start + 6;                          -- the Sunday of last week
  v_metrics jsonb;
begin
  for v_company in
    select distinct t.company_id
    from public.tickets t
    where (t.created_at at time zone 'Africa/Johannesburg')::date between v_week_start and v_week_end
    order by t.company_id
  loop
    foreach v_dept in array array['HR', 'IT', 'Finance', 'Operations'] loop
      -- The same numbers the preview shows (0007), for this company only.
      v_metrics := public.dashboard_metrics(v_week_start, v_week_end, v_dept, v_company);

      -- ai_summary and forecast stay empty here: the summary is written by insights.ts
      -- when a manager opens the report, and the forecast needs the TypeScript method.
      insert into public.reports (company_id, department, week_start, metrics, ai_summary, forecast)
      values (v_company, v_dept::public.department, v_week_start, v_metrics, null, '{}'::jsonb)
      on conflict (company_id, department, week_start) do nothing;  -- never overwrite a saved report
    end loop;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Notifications go only to people in the ticket's company.
-- ---------------------------------------------------------------------------

-- Notices and emails take the recipient's company, not the caller's.
create or replace function public.queue_notice(p_user uuid, p_reference text, p_title text, p_message text, p_link text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_notice_id uuid;
  v_email text;
  v_company bigint;
begin
  select p.company_id into v_company from public.profiles p where p.id = p_user;
  if v_company is null then
    return;  -- no such person: nothing to tell
  end if;

  insert into public.notices (user_id, title, message, link, company_id)
  values (p_user, p_title, p_message, p_link, v_company)
  returning id into v_notice_id;

  -- The email address is read here, inside the database, so the app never sees it.
  select u.email into v_email from auth.users u where u.id = p_user;
  if v_email is not null then
    insert into public.email_outbox (notice_id, to_email, subject, reference, title, link_path, company_id)
    values (v_notice_id, v_email, 'Relay: ' || p_title || ' (' || p_reference || ')', p_reference, p_title, p_link, v_company);
  end if;
end;
$$;

create or replace function public.notify_ticket_event(p_ticket_id bigint, p_event text)
returns void
language plpgsql
security definer
set search_path to ''
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

  select t0.id, t0.reference, t0.submitted_by, t0.department, t0.request_type, t0.is_historical, t0.company_id
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
    -- Every manager in this company who can decide this request, except the person who sent it.
    for m in
      select p.id from public.profiles p
      where p.role = 'manager' and p.active
        and p.company_id = t.company_id
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

-- ---------------------------------------------------------------------------
-- 6. Auto-assign and escalation stay inside the ticket's company.
-- ---------------------------------------------------------------------------
create or replace function public.auto_assign_ticket(p_ticket_id bigint, p_actor uuid)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_ticket public.tickets%rowtype;
  v_agent uuid;
begin
  select * into v_ticket from public.tickets where id = p_ticket_id for update;
  if not found then
    raise exception 'Ticket % not found', p_ticket_id;
  end if;

  -- Only the person who sent the request can trigger this (the submit action does, right after saving it).
  if v_ticket.submitted_by is distinct from auth.uid() then
    raise exception 'Only the person who sent this request can trigger assignment';
  end if;

  if v_ticket.assigned_to is not null or v_ticket.status = 'closed' or v_ticket.is_sensitive then
    return null;
  end if;

  -- Least-busy active agent in the ticket's department AND company.
  select p.id into v_agent
  from public.profiles p
  left join public.tickets t
    on t.assigned_to = p.id and t.status <> 'closed'
  where p.role = 'agent' and p.active
    and p.department = v_ticket.department
    and p.company_id = v_ticket.company_id
  group by p.id
  order by count(t.id), p.id
  limit 1;

  if v_agent is null then
    return null;  -- no active agent: the ticket stays unassigned for the manager's queue
  end if;

  update public.tickets
     set assigned_to = v_agent, assigned_at = now(), status = 'assigned'
   where id = p_ticket_id;

  insert into public.audit_log (actor, action, ticket_id, details, company_id)
  values (p_actor, 'auto_assign', p_ticket_id,
          jsonb_build_object('agent', v_agent, 'department', v_ticket.department),
          v_ticket.company_id);

  return v_agent;
end;
$$;

create or replace function public.escalate_urgent_tickets()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  t record;
  m record;
  v_count integer := 0;
begin
  for t in
    select id, reference, department, company_id
    from public.tickets
    where priority = 'urgent'
      and status = 'assigned'
      and answered_at is null
      and assigned_at <= now() - interval '4 hours'
      and not escalated
      and not is_historical
    for update
  loop
    update public.tickets
       set escalated = true, escalated_at = now()
     where id = t.id;

    insert into public.audit_log (actor, action, ticket_id, details, company_id)
    values (null, 'escalate', t.id,
            jsonb_build_object('department', t.department, 'after_hours', 4),
            t.company_id);

    -- The same managers in this company who can decide this department's approvals (0027).
    for m in
      select p.id from public.profiles p
      where p.role = 'manager' and p.active
        and p.company_id = t.company_id
        and (p.department is null or p.department = t.department)
    loop
      perform public.queue_notice(
        m.id, t.reference, 'Urgent request escalated',
        'An urgent ' || t.department || ' request has had no reply for 4 hours.',
        '/agent/' || t.id
      );
    end loop;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Who may run what. The database's own jobs and triggers run as the owner (postgres),
--    so they keep working after these revokes. Anonymous visitors are removed from every
--    function they have no use for. The cron routes call only the three secret-checked
--    functions below with the anon key, and each one checks CRON_SECRET itself.
-- ---------------------------------------------------------------------------

-- Run only by cron, triggers or other database functions: nobody signed in or anonymous.
revoke all on function public.escalate_urgent_tickets() from public, anon, authenticated;
revoke all on function public.generate_weekly_reports() from public, anon, authenticated;
revoke all on function public.queue_notice(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.check_cron_secret(text) from public, anon, authenticated;
revoke all on function public.set_company_from_ticket() from public, anon, authenticated;

-- Signed-in app code calls these; anonymous visitors don't.
revoke all on function public.auto_assign_ticket(bigint, uuid) from public, anon;
grant execute on function public.auto_assign_ticket(bigint, uuid) to authenticated;
revoke all on function public.notify_ticket_event(bigint, text) from public, anon;
grant execute on function public.notify_ticket_event(bigint, text) to authenticated;

-- The anonymous cron routes call these with CRON_SECRET; each checks the secret itself.
revoke all on function public.scheduled_companies(text, date, date) from public;
grant execute on function public.scheduled_companies(text, date, date) to anon, authenticated;
revoke all on function public.scheduled_period_metrics(text, date, date, text, bigint) from public;
grant execute on function public.scheduled_period_metrics(text, date, date, text, bigint) to anon, authenticated;
revoke all on function public.save_scheduled_summary(text, date, date, text, text, jsonb, text, bigint) from public;
grant execute on function public.save_scheduled_summary(text, date, date, text, text, jsonb, text, bigint) to anon, authenticated;
