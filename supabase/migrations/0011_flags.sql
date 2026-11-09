-- 0011: flagged replies (S2-26, AI risk and compliance). Owner: Samukelo.
--
-- Compliance can't read every reply, so Relay points them at the risky ones.
-- A flag marks one sent reply for a second look. It comes from:
--   - an automatic check when the reply is sent (src/lib/flags.ts):
--       "Sent without edits"       the AI draft went out exactly as written;
--       "Possible invented detail" the reply has an amount, date or number that
--                                  isn't in the request or the template;
--   - a person (agent, manager or compliance) who clicks Flag and writes why.
-- Compliance reviews each flag on Flagged replies and resolves it with a note.
--
-- Flags are only added and resolved through the two functions below, so each
-- step checks who is calling and writes its audit entry (docs/audit-actions.md).
-- Safe to run twice: "if not exists" and "create or replace".

-- ---------------------------------------------------------------
-- 1. The flags table
-- ---------------------------------------------------------------
create table if not exists public.flags (
  id bigint generated always as identity primary key,
  response_id bigint not null references public.responses (id) on delete cascade,
  ticket_id bigint not null references public.tickets (id) on delete cascade,
  -- Why it was flagged. "person" means someone flagged it by hand.
  kind text not null check (kind in ('sent_without_edits', 'invented_detail', 'person')),
  source text not null check (source in ('auto', 'person')),
  -- Automatic: what was found (e.g. "R750, 14 November"). Person: the reason they wrote.
  note text,
  flagged_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  -- Filled in when compliance resolves it.
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  outcome text check (outcome in ('ok', 'needs_change')),
  resolution_note text
);

-- Flagged replies lists open flags first, newest first.
create index if not exists flags_open_idx on public.flags (resolved_at, created_at desc);
-- The ticket view and the risk report (S2-30) look flags up by reply.
create index if not exists flags_response_idx on public.flags (response_id);
-- An automatic check flags a reply once per reason, even if it runs again.
create unique index if not exists flags_auto_once on public.flags (response_id, kind) where source = 'auto';

alter table public.flags enable row level security;

-- Agents, managers and compliance read flags on tickets they can see (the
-- ticket rules from 0003 apply inside the sub-query). Staff never see flags:
-- they are an internal check on the team's replies.
drop policy if exists "Team reads flags on visible tickets" on public.flags;
create policy "Team reads flags on visible tickets"
  on public.flags for select
  to authenticated
  using (
    public.current_user_role() in ('agent', 'manager', 'compliance')
    and exists (select 1 from public.tickets t where t.id = ticket_id)
  );
-- No insert, update or delete rules: only the functions below change flags.

-- ---------------------------------------------------------------
-- 2. flag_reply(): add a flag
-- ---------------------------------------------------------------
-- p_kind 'person': anyone on the team who can see the ticket, with a reason.
-- p_kind 'sent_without_edits' or 'invented_detail': the automatic check, run as
--   the agent who sent the reply (so nobody can add "automatic" flags to
--   someone else's reply). Returns the new flag's id, or null if the
--   automatic flag was already there.
-- "security definer" skips row-level security, so it checks everything itself.
create or replace function public.flag_reply(p_response_id bigint, p_kind text, p_note text default null)
returns bigint
language plpgsql
security definer set search_path = ''
as $$
declare
  v_role text := public.current_user_role();
  v_response public.responses%rowtype;
  v_ticket public.tickets%rowtype;
  v_source text;
  v_flag_id bigint;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if v_role is null or v_role not in ('agent', 'manager', 'compliance') then
    raise exception 'Only agents, managers and compliance can flag replies';
  end if;

  select * into v_response from public.responses where id = p_response_id;
  if not found then
    raise exception 'Reply % not found', p_response_id;
  end if;
  if v_response.sent_at is null then
    raise exception 'Only a sent reply can be flagged';
  end if;

  select * into v_ticket from public.tickets where id = v_response.ticket_id;
  -- Agents only see their own department's tickets (0003); managers and compliance see all.
  if v_role = 'agent' and v_ticket.department is distinct from public.current_user_department() then
    raise exception 'This reply is on a ticket in another department';
  end if;

  if p_kind = 'person' then
    if v_note is null then
      raise exception 'Write why this reply needs a second look';
    end if;
    v_source := 'person';
  elsif p_kind in ('sent_without_edits', 'invented_detail') then
    if v_response.sent_by is distinct from auth.uid() then
      raise exception 'Automatic flags are added by the agent who sent the reply';
    end if;
    -- Double-check the claim, so the flag is always true.
    if p_kind = 'sent_without_edits'
       and not (v_response.ai_generated and trim(coalesce(v_response.ai_draft, '')) = trim(coalesce(v_response.final_text, ''))) then
      raise exception 'This reply was edited before it was sent';
    end if;
    if p_kind = 'invented_detail' and v_note is null then
      raise exception 'Say which detail was found';
    end if;
    v_source := 'auto';
  else
    raise exception 'Unknown flag reason %', p_kind;
  end if;

  insert into public.flags (response_id, ticket_id, kind, source, note, flagged_by)
  values (p_response_id, v_response.ticket_id, p_kind, v_source, v_note, auth.uid())
  on conflict (response_id, kind) where source = 'auto' do nothing
  returning id into v_flag_id;

  if v_flag_id is null then
    return null; -- already flagged for this reason
  end if;

  -- The audit entry keeps the reason's name, not the note: notes can hold a
  -- person's words, and the audit log is read more widely (POPIA).
  insert into public.audit_log (actor, action, ticket_id, details)
  values (
    auth.uid(), 'flag', v_response.ticket_id,
    jsonb_build_object(
      'flag_id', v_flag_id,
      'response_id', p_response_id,
      'reason', case p_kind
        when 'sent_without_edits' then 'Sent without edits'
        when 'invented_detail' then 'Possible invented detail'
        else 'Flagged by a person' end,
      'source', v_source
    )
  );
  return v_flag_id;
end;
$$;

-- ---------------------------------------------------------------
-- 3. resolve_flag(): compliance reviews a flag
-- ---------------------------------------------------------------
-- p_outcome 'ok' (no change needed) or 'needs_change'; a note is required,
-- so the decision can be explained later.
create or replace function public.resolve_flag(p_flag_id bigint, p_outcome text, p_note text)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_flag public.flags%rowtype;
begin
  if public.current_user_role() is distinct from 'compliance' then
    raise exception 'Only compliance can resolve flags';
  end if;

  select * into v_flag from public.flags where id = p_flag_id;
  if not found then
    raise exception 'Flag % not found', p_flag_id;
  end if;
  if v_flag.resolved_at is not null then
    raise exception 'This flag was already resolved';
  end if;
  if p_outcome is null or p_outcome not in ('ok', 'needs_change') then
    raise exception 'Choose an outcome';
  end if;
  if p_note is null or length(trim(p_note)) = 0 then
    raise exception 'Write a note about what you found';
  end if;

  update public.flags
  set resolved_by = auth.uid(), resolved_at = now(), outcome = p_outcome, resolution_note = trim(p_note)
  where id = p_flag_id;

  insert into public.audit_log (actor, action, ticket_id, details)
  values (auth.uid(), 'flag_resolve', v_flag.ticket_id, jsonb_build_object('flag_id', p_flag_id, 'outcome', p_outcome));
end;
$$;

-- Only signed-in users may call these (not the public "anon" key).
revoke execute on function public.flag_reply(bigint, text, text) from public, anon;
revoke execute on function public.resolve_flag(bigint, text, text) from public, anon;
grant execute on function public.flag_reply(bigint, text, text) to authenticated;
grant execute on function public.resolve_flag(bigint, text, text) to authenticated;
grant select on public.flags to authenticated;
