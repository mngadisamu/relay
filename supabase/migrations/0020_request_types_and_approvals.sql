-- S4-01 and S4-03: request types, amounts, and the approvals rules.
-- Samukelo reviews and runs this in the Supabase SQL Editor. It is safe to run twice.
-- Rules this migration follows: docs/approval-rules.md.

-- 1. The kinds of request a staff member can make (S4-01).
do $$ begin
  create type public.request_type as enum ('purchase', 'leave', 'system_access', 'other');
exception when duplicate_object then null;
end $$;

-- 2. Tickets get a request type and an amount. Both are empty on older tickets.
alter table public.tickets add column if not exists request_type public.request_type;
alter table public.tickets add column if not exists amount numeric(12, 2);

-- A purchase must have an amount; an amount can never be negative.
alter table public.tickets drop constraint if exists tickets_amount_not_negative;
alter table public.tickets add constraint tickets_amount_not_negative check (amount is null or amount >= 0);
alter table public.tickets drop constraint if exists tickets_purchase_needs_amount;
alter table public.tickets add constraint tickets_purchase_needs_amount
  check (request_type is distinct from 'purchase' or amount is not null);

-- 3. A new status for a request that is waiting for a manager (S4-07).
alter type public.ticket_status add value if not exists 'awaiting_approval';

-- 4. The approvals table (created in 0001) gets who asked, and the reason for a decline.
alter table public.approvals add column if not exists requested_by uuid references public.profiles (id);
alter table public.approvals add column if not exists decision_note text;
alter table public.approvals add column if not exists requested_at timestamptz not null default now();

-- The database refuses a decision on your own request, and refuses a decline with no reason.
alter table public.approvals drop constraint if exists approvals_not_own_request;
alter table public.approvals add constraint approvals_not_own_request
  check (approver is null or requested_by is null or approver <> requested_by);
alter table public.approvals drop constraint if exists approvals_decline_needs_reason;
alter table public.approvals add constraint approvals_decline_needs_reason
  check (decision <> 'rejected' or nullif(trim(coalesce(decision_note, '')), '') is not null);

create index if not exists approvals_ticket_decision_idx on public.approvals (ticket_id, decision);

-- 5. Who can read approvals. Nobody writes them directly; the two functions below do.
drop policy if exists "Managers and compliance read approvals" on public.approvals;
create policy "Managers and compliance read approvals"
  on public.approvals for select to authenticated
  using ((select public.current_user_role()) in ('manager', 'compliance'));

drop policy if exists "Requesters read their own approvals" on public.approvals;
create policy "Requesters read their own approvals"
  on public.approvals for select to authenticated
  using (requested_by = (select auth.uid()));

-- 6. request_approval: called by the person who submitted the request, after it is saved.
--    Creates one pending approval when the rules in docs/approval-rules.md say so.
create or replace function public.request_approval(p_ticket_id bigint)
returns bigint
language plpgsql
security definer set search_path = ''
as $$
declare
  t record;
  v_needs boolean;
  v_id bigint;
begin
  select id, submitted_by, department, request_type, amount
    into t
  from public.tickets
  where id = p_ticket_id;

  if not found then
    raise exception 'Ticket % not found', p_ticket_id;
  end if;

  if t.submitted_by is distinct from auth.uid() then
    raise exception 'Only the person who submitted the request can ask for approval';
  end if;

  -- Leave always needs sign-off. Finance purchases over R5,000 need sign-off.
  v_needs := t.request_type = 'leave'
          or (t.request_type = 'purchase' and t.department = 'Finance' and coalesce(t.amount, 0) > 5000);
  if not v_needs then
    return null;
  end if;

  -- No second pending approval for the same ticket.
  if exists (select 1 from public.approvals where ticket_id = p_ticket_id and decision = 'pending') then
    return null;
  end if;

  insert into public.approvals (ticket_id, requested_by, decision)
  values (p_ticket_id, auth.uid(), 'pending')
  returning id into v_id;

  update public.tickets set status = 'awaiting_approval' where id = p_ticket_id;

  insert into public.audit_log (actor, action, ticket_id, details)
  values (auth.uid(), 'approval_request', p_ticket_id,
          jsonb_build_object('request_type', t.request_type, 'amount', t.amount, 'department', t.department));

  return v_id;
end;
$$;

-- 7. decide_approval: a manager approves or declines. Checks the decider, then records it.
create or replace function public.decide_approval(p_approval_id bigint, p_decision text, p_note text default null)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_role public.user_role := public.current_user_role();
  v_my_department public.department := public.current_user_department();
  a record;
  t record;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'The decision must be approved or rejected';
  end if;

  select id, ticket_id, requested_by, decision into a
  from public.approvals where id = p_approval_id;
  if not found then
    raise exception 'Approval % not found', p_approval_id;
  end if;
  if a.decision <> 'pending' then
    raise exception 'This request has already been decided';
  end if;

  select id, department into t from public.tickets where id = a.ticket_id;

  -- A manager of the ticket's department, or a general manager (no department).
  if v_role is distinct from 'manager' then
    raise exception 'Only a manager can decide an approval';
  end if;
  if v_my_department is not null and v_my_department <> t.department then
    raise exception 'Only a manager of this department, or a general manager, can decide this approval';
  end if;
  if a.requested_by = auth.uid() then
    raise exception 'You cannot decide your own request';
  end if;
  if p_decision = 'rejected' and v_note is null then
    raise exception 'Add a reason';
  end if;

  update public.approvals
  set approver = auth.uid(), decision = p_decision, decided_at = now(), decision_note = v_note
  where id = p_approval_id;

  -- Approved: the request goes back into the normal flow. Declined: staff see it as answered.
  update public.tickets
  set status = case when p_decision = 'approved' then 'received'::public.ticket_status else 'answered'::public.ticket_status end,
      answered_at = case when p_decision = 'rejected' then now() else answered_at end
  where id = t.id;

  insert into public.audit_log (actor, action, ticket_id, details)
  values (auth.uid(), 'approval_decision', t.id,
          jsonb_build_object('approval_id', p_approval_id, 'decision', p_decision, 'note', v_note));
end;
$$;

-- Only signed-in users may call these, as with the other ticket functions.
revoke execute on function public.request_approval(bigint) from public, anon;
grant execute on function public.request_approval(bigint) to authenticated;
revoke execute on function public.decide_approval(bigint, text, text) from public, anon;
grant execute on function public.decide_approval(bigint, text, text) to authenticated;
