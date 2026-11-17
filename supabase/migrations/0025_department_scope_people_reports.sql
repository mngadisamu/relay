-- 0025_department_scope_people_reports.sql
-- Owner: Samukelo. Safe to run twice. Review, then run in the Supabase SQL Editor.
-- Rules (agreed 17 Nov 2026):
--   General manager (no department) and compliance: see and do everything.
--   Department manager (HR, IT, Finance or Operations):
--     - sees only their department's agents and managers on Manage users (not staff);
--     - adds and changes AGENTS in their own department only (role agent, department fixed);
--     - sees and saves only their department's reports and weekly summaries;
--     - sees audit entries for their department's tickets, and their own actions.
--   Nobody handles their own request: an agent or manager who submitted a ticket cannot take it.

-- 1. Who a department manager may manage: agents of their own department. Staff are the
--    general manager's job. Used by deactivate_user, update_user_details and can_manage_user.
create or replace function public.can_manage_person(p_person public.profiles)
returns boolean
language sql
stable security definer
set search_path = ''
as $$
  select case
    when public.current_user_department() is null then true
    else p_person.role = 'agent' and p_person.department = public.current_user_department()
  end
$$;

-- 2. set_user_role: a department manager may only add or change agents in their own department.
create or replace function public.set_user_role(p_user_id uuid, p_role user_role, p_department department default null, p_new boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_my_department public.department;
  v_person public.profiles%rowtype;
  v_department public.department := p_department;
begin
  if public.current_user_role() is distinct from 'manager' then
    raise exception 'Only managers can change roles';
  end if;
  v_my_department := public.current_user_department();

  select * into v_person from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Person not found';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You can''t change your own role. Ask another manager.';
  end if;

  -- Agents always belong to a department; staff and compliance never do.
  if p_role = 'agent' and v_department is null then
    raise exception 'Choose a department for this agent';
  end if;
  if p_role in ('staff', 'compliance') then
    v_department := null;
  end if;

  -- A department manager adds and changes agents in their own department only.
  if v_my_department is not null then
    if p_role <> 'agent' then
      raise exception 'Only a general manager can add or change staff, managers or compliance officers';
    end if;
    if v_department is distinct from v_my_department then
      raise exception 'You can only add agents to %', v_my_department;
    end if;
    if not p_new and not (v_person.role = 'agent' and v_person.department = v_my_department) then
      raise exception 'Only a general manager can change this person';
    end if;
  end if;

  if p_new and v_person.created_at < now() - interval '10 minutes' then
    raise exception 'This person was added earlier: change their role instead';
  end if;

  -- Nothing changed: no update, no audit entry.
  if not p_new and v_person.role = p_role and v_person.department is not distinct from v_department then
    return;
  end if;

  update public.profiles set role = p_role, department = v_department where id = p_user_id;

  -- No email or name in the audit details (docs/audit-actions.md): the id is enough.
  if p_new then
    insert into public.audit_log (actor, action, details)
    values (auth.uid(), 'user_create',
      jsonb_build_object('user_id', p_user_id, 'role', p_role, 'department', v_department));
  else
    insert into public.audit_log (actor, action, details)
    values (auth.uid(), 'role_change',
      jsonb_build_object('user_id', p_user_id,
        'from_role', v_person.role, 'to_role', p_role,
        'from_department', v_person.department, 'to_department', v_department));
  end if;
end;
$$;

-- 3. The Manage users list. A department manager sees their department's agents and
--    managers (themselves included), not staff. A general manager sees everyone.
create or replace function public.list_people()
returns table (
  id uuid, full_name text, email text, role public.user_role, department public.department,
  created_at timestamptz, active boolean, deactivated_at timestamptz
)
language plpgsql
stable security definer
set search_path = ''
as $$
begin
  if public.current_user_role() is distinct from 'manager' then
    raise exception 'Only managers can see the list of people';
  end if;
  return query
    select p.id, p.full_name, u.email::text, p.role, p.department, p.created_at, p.active, p.deactivated_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where public.current_user_department() is null
       or (p.department = public.current_user_department() and p.role in ('agent', 'manager'))
    order by p.active desc, p.full_name;
end;
$$;

-- 4. Profiles: the same rule as the list, for direct reads.
drop policy if exists "Compliance reads all profiles, managers read their department and staff" on public.profiles;
create policy "Compliance reads all profiles, managers read their department's agents and managers"
  on public.profiles for select to authenticated
  using (
    (select public.current_user_role()) = 'compliance'
    or (
      (select public.current_user_role()) = 'manager'
      and ((select public.current_user_department()) is null
           or (profiles.department = (select public.current_user_department())
               and profiles.role in ('agent', 'manager')))
    )
  );

-- 5. Reports: a department manager sees and saves their own department's reports only.
drop policy if exists "Managers read and save reports" on public.reports;
create policy "Managers read and save their department's reports"
  on public.reports for all to authenticated
  using (
    (select public.current_user_role()) = 'manager'
    and ((select public.current_user_department()) is null
         or reports.department = (select public.current_user_department()))
  )
  with check (
    (select public.current_user_role()) = 'manager'
    and ((select public.current_user_department()) is null
         or reports.department = (select public.current_user_department()))
  );

-- 6. Weekly summaries (insights): the same rule. A summary with no department covers all
--    departments, so only a general manager sees it.
drop policy if exists "Managers read insights" on public.insights;
drop policy if exists "Managers save insights" on public.insights;
drop policy if exists "Managers update insights" on public.insights;
create policy "Managers read their department's insights"
  on public.insights for select to authenticated
  using (
    (select public.current_user_role()) = 'manager'
    and ((select public.current_user_department()) is null
         or insights.department = (select public.current_user_department())::text)
  );
create policy "Managers save their department's insights"
  on public.insights for insert to authenticated
  with check (
    (select public.current_user_role()) = 'manager'
    and ((select public.current_user_department()) is null
         or insights.department = (select public.current_user_department())::text)
  );
create policy "Managers update their department's insights"
  on public.insights for update to authenticated
  using (
    (select public.current_user_role()) = 'manager'
    and ((select public.current_user_department()) is null
         or insights.department = (select public.current_user_department())::text)
  )
  with check (
    (select public.current_user_role()) = 'manager'
    and ((select public.current_user_department()) is null
         or insights.department = (select public.current_user_department())::text)
  );

-- 7. Audit log: a department manager sees entries for their department's tickets, and
--    their own actions. Compliance and the general manager see everything.
drop policy if exists "Managers and compliance read the audit log" on public.audit_log;
create policy "Compliance and general managers read the audit log; department managers read their tickets"
  on public.audit_log for select to authenticated
  using (
    (select public.current_user_role()) = 'compliance'
    or (
      (select public.current_user_role()) = 'manager'
      and (
        (select public.current_user_department()) is null
        or audit_log.actor = (select auth.uid())
        or exists (
          select 1 from public.tickets t
          where t.id = audit_log.ticket_id
            and t.department = (select public.current_user_department())
        )
      )
    )
  );

-- 8. Nobody takes their own request. Replaces assign_ticket (0006) with that one check added.
create or replace function public.assign_ticket(p_ticket_id bigint, p_agent uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
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

  -- The person who sent a request never handles it themselves (their own ticket is shown
  -- to them, but another agent in the department takes it).
  if v_agent = v_ticket.submitted_by then
    raise exception 'You can''t take your own request. Another agent in the department handles it.';
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
      status = case when status = 'received' then 'assigned'::public.ticket_status else status end,
      assigned_at = coalesce(assigned_at, now())
  where id = p_ticket_id;

  insert into public.audit_log (actor, action, ticket_id, details)
  values (
    auth.uid(), 'assign', p_ticket_id,
    jsonb_build_object('assigned_to', v_agent, 'previous', v_ticket.assigned_to)
  );
end;
$$;
