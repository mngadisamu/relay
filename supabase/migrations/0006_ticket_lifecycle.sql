-- 0006: the whole ticket journey (S2-06, contract 1).
--
-- Until now a ticket could be received and answered, but nobody could take it,
-- assign it, confirm its department or close it. This migration adds:
--   1. who a ticket is assigned to (tickets.assigned_to);
--   2. who confirmed the AI's department (classifications.confirmed_by / _at);
--   3. ticket_messages: a staff member's "I still need help" follow-up (S2-20);
--   4. four functions, each one safe step that also writes its audit entry:
--        assign_ticket, confirm_department, close_ticket, reopen_ticket
--      (reroute_ticket from 0004 already does the same for re-routing);
--   5. rules so managers, compliance and agents can read the names they need;
--
-- Who does what (agreed for Sprint 2+3):
--   Agents take tickets from their own department's queue (the fast, normal path).
--   A department manager (a manager WITH a department) assigns, reassigns,
--   confirms and closes tickets in their own department only. A manager with
--   no department (a general manager) can do this in every department.
--   The agent replies. The staff member confirms "This solved it", or the
--   agent closes the ticket.
--   Managers still READ every ticket (0003), because reports compare departments.
--   6. ticket references dated in South African time, not UTC.
--
-- Why functions instead of plain updates: staff have no right to update
-- tickets at all (0003), and each step must change the ticket AND write the
-- audit entry together. A function does both, after checking who is calling.
-- They are "security definer", so they skip row-level security; that is why
-- every function checks the caller's role and department itself first.
 
-- ---------------------------------------------------------------
-- 1. Who a ticket is assigned to
-- ---------------------------------------------------------------
alter table public.tickets
  add column assigned_to uuid references public.profiles (id);
 
-- The inbox's "Mine" filter (S2-16) looks tickets up by this column.
create index on public.tickets (assigned_to);
 
-- ---------------------------------------------------------------
-- 2. Who confirmed the department the AI chose (S2-11)
-- ---------------------------------------------------------------
-- Stored on the classification, which agents can already read (0004),
-- so the routing panel can say "Confirmed by Sipho".
alter table public.classifications
  add column confirmed_by uuid references public.profiles (id),
  add column confirmed_at timestamptz;
 
-- ---------------------------------------------------------------
-- 3. Staff follow-up messages (S2-20, decided at planning)
-- ---------------------------------------------------------------
-- A staff member who taps "I still need help" writes what is still wrong.
-- Staff can't write to responses (those are the team's replies), so their
-- messages get their own table. Sprint 4 can grow this into a conversation.
create table public.ticket_messages (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references public.tickets (id) on delete cascade,
  author uuid not null references public.profiles (id),
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);
 
create index on public.ticket_messages (ticket_id, created_at);
 
alter table public.ticket_messages enable row level security;
 
-- Anyone who can see the ticket can read its messages (the ticket rules
-- from 0003 apply inside the sub-query). Messages are only added through
-- reopen_ticket() below, so there is no insert, update or delete rule.
create policy "Read messages on visible tickets"
  on public.ticket_messages for select
  to authenticated
  using (exists (select 1 from public.tickets t where t.id = ticket_id));
 
-- ---------------------------------------------------------------
-- 4. Reading other people's names
-- ---------------------------------------------------------------
-- Until now everyone could only read their own profile (0002).
-- Managers need everyone for Manage users and Assign (S2-16, S2-25);
-- compliance needs names for the audit log (S2-12).
create policy "Managers and compliance read all profiles"
  on public.profiles for select
  to authenticated
  using ((select public.current_user_role()) in ('manager', 'compliance'));
 
-- Agents see the people in their own department, e.g. "Assigned to Sipho".
-- Staff have no department, so this never shows agents a staff profile;
-- a ticket's sender still comes from ticket_submitter() (0005).
create policy "Agents read their department's profiles"
  on public.profiles for select
  to authenticated
  using (
    (select public.current_user_role()) = 'agent'
    and department = (select public.current_user_department())
  );
 
-- ---------------------------------------------------------------
-- 5a. Take or assign a ticket (S2-16)
-- ---------------------------------------------------------------
-- Agent "Take ticket":   supabase.rpc("assign_ticket", { p_ticket_id: 42 })
-- Manager "Assign":      supabase.rpc("assign_ticket", { p_ticket_id: 42, p_agent: "<agent id>" })
-- An agent may only take tickets in their own department, for themselves.
-- A manager may assign an open ticket in their own department (or in any
-- department, if they have none) to an agent of that ticket's department.
create or replace function public.assign_ticket(
  p_ticket_id bigint,
  p_agent uuid default null
)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_role public.user_role := public.current_user_role();
  v_my_department public.department := public.current_user_department();
  v_agent uuid := coalesce(p_agent, auth.uid());
  v_ticket public.tickets%rowtype;
begin
  select * into v_ticket from public.tickets where id = p_ticket_id;
  if not found then
    raise exception 'Ticket % not found', p_ticket_id;
  end if;
 
  if v_ticket.status = 'closed' then
    raise exception 'This ticket is closed, so it can''t be assigned';
  end if;
 
  if v_role = 'agent' then
    if v_ticket.department is distinct from v_my_department or v_agent <> auth.uid() then
      raise exception 'Agents can only take tickets in their own department, for themselves';
    end if;
  elsif v_role = 'manager' then
    if v_my_department is not null and v_ticket.department is distinct from v_my_department then
      raise exception 'You can only assign tickets in the % department', v_my_department;
    end if;
    if not exists (
      select 1 from public.profiles p
      where p.id = v_agent and p.role = 'agent' and p.department = v_ticket.department
    ) then
      raise exception 'Choose an agent from the % department', v_ticket.department;
    end if;
  else
    raise exception 'Only agents and managers can assign tickets';
  end if;
 
  update public.tickets
  set assigned_to = v_agent,
      -- Received becomes Assigned; an Answered ticket keeps its status.
      status = case when status = 'received' then 'assigned'::public.ticket_status else status end,
      -- Keep the first assignment time, so "time to assign" isn't reset by a hand-over.
      assigned_at = coalesce(assigned_at, now())
  where id = p_ticket_id;
 
  insert into public.audit_log (actor, action, ticket_id, details)
  values (
    auth.uid(), 'assign', p_ticket_id,
    jsonb_build_object('assigned_to', v_agent, 'previous', v_ticket.assigned_to)
  );
end;
$$;
 
-- ---------------------------------------------------------------
-- 5b. Confirm the department the AI chose (S2-11)
-- ---------------------------------------------------------------
-- supabase.rpc("confirm_department", { p_ticket_id: 42 })
-- Clears "Needs review" without moving the ticket. To move it, use reroute_ticket().
create or replace function public.confirm_department(p_ticket_id bigint)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_role public.user_role := public.current_user_role();
  v_department public.department;
begin
  select department into v_department from public.tickets where id = p_ticket_id;
  if not found then
    raise exception 'Ticket % not found', p_ticket_id;
  end if;
 
  -- Agents and department managers: own department only. General managers: any.
  if not (
    (v_role = 'manager' and public.current_user_department() is null)
    or (v_role in ('agent', 'manager') and v_department = public.current_user_department())
  ) then
    raise exception 'Only an agent or manager of this ticket''s department can confirm it';
  end if;
 
  update public.tickets set needs_review = false where id = p_ticket_id;
 
  -- Record who confirmed it on the latest classification.
  update public.classifications
  set confirmed_by = auth.uid(), confirmed_at = now()
  where id = (
    select id from public.classifications
    where ticket_id = p_ticket_id
    order by created_at desc, id desc
    limit 1
  );
 
  insert into public.audit_log (actor, action, ticket_id, details)
  values (auth.uid(), 'confirm_department', p_ticket_id, jsonb_build_object('department', v_department));
end;
$$;
 
-- ---------------------------------------------------------------
-- 5c. Close an answered ticket (S2-20)
-- ---------------------------------------------------------------
-- Staff "This solved it", or an agent's "Close ticket":
--   supabase.rpc("close_ticket", { p_ticket_id: 42 })
-- Allowed for the person who sent it, an agent or manager of its department,
-- or a general manager (no department).
create or replace function public.close_ticket(p_ticket_id bigint)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_role public.user_role := public.current_user_role();
  v_ticket public.tickets%rowtype;
begin
  select * into v_ticket from public.tickets where id = p_ticket_id;
  if not found then
    raise exception 'Ticket % not found', p_ticket_id;
  end if;
 
  if not (
    v_ticket.submitted_by = auth.uid()
    or (v_role = 'manager' and public.current_user_department() is null)
    or (v_role in ('agent', 'manager') and v_ticket.department = public.current_user_department())
  ) then
    raise exception 'You can only close your own requests, or tickets in your department';
  end if;
 
  if v_ticket.status <> 'answered' then
    raise exception 'Only an answered ticket can be closed (this one is %)', v_ticket.status;
  end if;
 
  update public.tickets set status = 'closed', closed_at = now() where id = p_ticket_id;
 
  insert into public.audit_log (actor, action, ticket_id, details)
  values (auth.uid(), 'close', p_ticket_id, jsonb_build_object('closed_by_role', v_role));
end;
$$;
 
-- ---------------------------------------------------------------
-- 5d. "I still need help" (S2-20)
-- ---------------------------------------------------------------
-- supabase.rpc("reopen_ticket", { p_ticket_id: 42, p_message: "The printer still jams" })
-- Only the person who sent the request, while it is Answered. It goes back
-- to Assigned (or Received, if nobody had taken it), and the message is saved
-- for the agent to read above the reply box.
create or replace function public.reopen_ticket(p_ticket_id bigint, p_message text)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_ticket public.tickets%rowtype;
  v_message_id bigint;
begin
  select * into v_ticket from public.tickets where id = p_ticket_id;
  if not found then
    raise exception 'Ticket % not found', p_ticket_id;
  end if;
 
  if v_ticket.submitted_by is distinct from auth.uid() then
    raise exception 'Only the person who sent this request can reopen it';
  end if;
 
  if v_ticket.status <> 'answered' then
    raise exception 'Only an answered request can be reopened (this one is %)', v_ticket.status;
  end if;
 
  if p_message is null or length(trim(p_message)) = 0 then
    raise exception 'Write what still needs fixing';
  end if;
 
  insert into public.ticket_messages (ticket_id, author, body)
  values (p_ticket_id, auth.uid(), trim(p_message))
  returning id into v_message_id;
 
  -- answered_at keeps the first reply time, so the dashboard's reply time stays true.
  update public.tickets
  set status = case when assigned_to is null then 'received'::public.ticket_status else 'assigned'::public.ticket_status end
  where id = p_ticket_id;
 
  insert into public.audit_log (actor, action, ticket_id, details)
  values (auth.uid(), 'reopen', p_ticket_id, jsonb_build_object('message_id', v_message_id));
end;
$$;
 
-- Only signed-in users may call these (not the public "anon" key).
revoke execute on function public.assign_ticket(bigint, uuid) from public, anon;
revoke execute on function public.confirm_department(bigint) from public, anon;
revoke execute on function public.close_ticket(bigint) from public, anon;
revoke execute on function public.reopen_ticket(bigint, text) from public, anon;
grant execute on function public.assign_ticket(bigint, uuid) to authenticated;
grant execute on function public.confirm_department(bigint) to authenticated;
grant execute on function public.close_ticket(bigint) to authenticated;
grant execute on function public.reopen_ticket(bigint, text) to authenticated;
 
-- ---------------------------------------------------------------
-- 6. Ticket references in South African time (G7)
-- ---------------------------------------------------------------
-- now() is UTC on Supabase, so a request sent at 00:30 SAST on 5 Nov was
-- getting KF-261104-…. Existing references are not changed.
alter table public.tickets
  alter column reference set default (
    'KF-' || to_char(now() at time zone 'Africa/Johannesburg', 'YYMMDD') || '-'
    || lpad((floor(random() * 10000))::text, 4, '0')
  );
 
