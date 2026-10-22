-- Row-level security rules for the rest of Sprint 1.
-- Without these, the app can't save classifications, templates, replies or
-- ticket updates, because RLS is on and nothing is allowed by default.
--
-- A sub-query on tickets inside a rule obeys the tickets rules from 0003,
-- so "exists (select 1 from tickets ...)" means "a ticket this user can see".

-- ---------------------------------------------------------------
-- TICKETS: agents and managers update tickets (status, department)
-- ---------------------------------------------------------------
-- Agents update tickets in their own department (status, answered time).
-- Moving a ticket to another department goes through reroute_ticket() below,
-- because after the move the agent can no longer see it.
create policy "Agents update their department's tickets"
  on public.tickets for update
  to authenticated
  using (
    (select public.current_user_role()) = 'agent'
    and department = (select public.current_user_department())
  )
  with check (
    (select public.current_user_role()) = 'agent'
    and department = (select public.current_user_department())
  );

create policy "Managers update all tickets"
  on public.tickets for update
  to authenticated
  using ((select public.current_user_role()) = 'manager')
  with check ((select public.current_user_role()) = 'manager');

-- ---------------------------------------------------------------
-- CLASSIFICATIONS: one row per AI routing decision (S1-21, S1-25)
-- ---------------------------------------------------------------
-- Anyone who can see a ticket can see how it was classified.
create policy "Read classifications of visible tickets"
  on public.classifications for select
  to authenticated
  using (exists (select 1 from public.tickets t where t.id = ticket_id));

-- Saved when a ticket is submitted, so the submitter (or an agent) adds it.
create policy "Add classifications to visible tickets"
  on public.classifications for insert
  to authenticated
  with check (exists (select 1 from public.tickets t where t.id = ticket_id));

-- Agents and managers record a department override (S1-25).
create policy "Agents and managers record overrides"
  on public.classifications for update
  to authenticated
  using (
    (select public.current_user_role()) in ('agent', 'manager')
    and exists (select 1 from public.tickets t where t.id = ticket_id)
  )
  with check (overridden_by = (select auth.uid()));

-- ---------------------------------------------------------------
-- TEMPLATES: reply templates per department (S1-04, S1-27)
-- ---------------------------------------------------------------
create policy "Agents, managers and compliance read templates"
  on public.templates for select
  to authenticated
  using ((select public.current_user_role()) in ('agent', 'manager', 'compliance'));

-- Agents manage their own department's templates; managers manage all.
create policy "Agents and managers add templates"
  on public.templates for insert
  to authenticated
  with check (
    (select public.current_user_role()) = 'manager'
    or (
      (select public.current_user_role()) = 'agent'
      and department = (select public.current_user_department())
    )
  );

create policy "Agents and managers edit templates"
  on public.templates for update
  to authenticated
  using (
    (select public.current_user_role()) = 'manager'
    or (
      (select public.current_user_role()) = 'agent'
      and department = (select public.current_user_department())
    )
  )
  with check (
    (select public.current_user_role()) = 'manager'
    or (
      (select public.current_user_role()) = 'agent'
      and department = (select public.current_user_department())
    )
  );

-- ---------------------------------------------------------------
-- RESPONSES: AI drafts and the replies agents send (S1-13, S1-23, S1-28)
-- ---------------------------------------------------------------
-- Agents, managers and compliance see drafts and replies on tickets they
-- can see. Staff only see a reply once it has been sent (S1-28), never
-- an unsent AI draft.
create policy "Read responses"
  on public.responses for select
  to authenticated
  using (
    exists (select 1 from public.tickets t where t.id = ticket_id)
    and (
      (select public.current_user_role()) in ('agent', 'manager', 'compliance')
      or sent_at is not null
    )
  );

-- Drafts are created when an agent asks for one (S1-08, S1-13).
create policy "Agents and managers create drafts"
  on public.responses for insert
  to authenticated
  with check (
    (select public.current_user_role()) in ('agent', 'manager')
    and exists (select 1 from public.tickets t where t.id = ticket_id)
  );

-- Agents edit drafts and send them (S1-14, S1-23).
create policy "Agents and managers edit and send replies"
  on public.responses for update
  to authenticated
  using (
    (select public.current_user_role()) in ('agent', 'manager')
    and exists (select 1 from public.tickets t where t.id = ticket_id)
  )
  with check ((select public.current_user_role()) in ('agent', 'manager'));

-- ---------------------------------------------------------------
-- AUDIT LOG: a record of every AI decision and human action (S1-25, Sprint 3)
-- ---------------------------------------------------------------
-- Anyone signed in can add an entry, but only in their own name.
-- Entries are never edited or deleted, so there are no update or delete rules.
create policy "Users add audit entries as themselves"
  on public.audit_log for insert
  to authenticated
  with check (actor = (select auth.uid()));

create policy "Managers and compliance read the audit log"
  on public.audit_log for select
  to authenticated
  using ((select public.current_user_role()) in ('manager', 'compliance'));

-- ---------------------------------------------------------------
-- RE-ROUTING: move a ticket to another department (S1-25)
-- ---------------------------------------------------------------
-- One safe step that moves the ticket, records who overrode the AI's
-- choice, and writes an audit entry. Only an agent of the ticket's current
-- department, or a manager, may do it. Call from the app with:
--   supabase.rpc("reroute_ticket", { p_ticket_id: 42, p_department: "HR" })
create or replace function public.reroute_ticket(
  p_ticket_id bigint,
  p_department public.department
)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_role public.user_role := public.current_user_role();
  v_my_department public.department := public.current_user_department();
  v_old_department public.department;
begin
  select department into v_old_department
  from public.tickets
  where id = p_ticket_id;

  if not found then
    raise exception 'Ticket % not found', p_ticket_id;
  end if;

  if not (
    v_role = 'manager'
    or (v_role = 'agent' and v_old_department = v_my_department)
  ) then
    raise exception 'Only an agent of this ticket''s department or a manager can re-route it';
  end if;

  update public.tickets
  set department = p_department, needs_review = false
  where id = p_ticket_id;

  -- Mark the latest classification as overridden by this person.
  update public.classifications
  set overridden_by = auth.uid(), overridden_department = p_department
  where id = (
    select id from public.classifications
    where ticket_id = p_ticket_id
    order by created_at desc, id desc
    limit 1
  );

  insert into public.audit_log (actor, action, ticket_id, details)
  values (
    auth.uid(), 'reroute', p_ticket_id,
    jsonb_build_object('from', v_old_department, 'to', p_department)
  );
end;
$$;

revoke execute on function public.reroute_ticket(bigint, public.department) from public, anon;
grant execute on function public.reroute_ticket(bigint, public.department) to authenticated;

-- approvals: rules come in Sprint 4 with the approval workflow.