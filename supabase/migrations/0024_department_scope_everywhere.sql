
-- 0024_department_scope_everywhere.sql
-- Applied to the database on 16 Nov 2026 (Samukelo). Safe to run twice.
-- Decision (16 Nov 2026): a department manager sees only their own department's tickets,
-- approvals, and the agents and managers in it. Staff have no department, so every
-- department manager still sees staff: they need the list to remove staff (AGENTS.md, section 4).
-- A general manager (no department) and compliance see everything.

-- 1. Tickets: read
drop policy if exists "Managers and compliance read all tickets" on public.tickets;
create policy "Compliance reads all tickets, managers read their department's tickets"
  on public.tickets for select to authenticated
  using (
    (select public.current_user_role()) = 'compliance'
    or (
      (select public.current_user_role()) = 'manager'
      and ((select public.current_user_department()) is null
           or tickets.department = (select public.current_user_department()))
    )
  );

-- 2. Tickets: update (the lifecycle functions also check the department)
drop policy if exists "Managers update all tickets" on public.tickets;
create policy "Managers update their department's tickets"
  on public.tickets for update to authenticated
  using (
    (select public.current_user_role()) = 'manager'
    and ((select public.current_user_department()) is null
         or tickets.department = (select public.current_user_department()))
  )
  with check (
    (select public.current_user_role()) = 'manager'
    and ((select public.current_user_department()) is null
         or tickets.department = (select public.current_user_department()))
  );

-- 3. Profiles: read
drop policy if exists "Managers and compliance read all profiles" on public.profiles;
create policy "Compliance reads all profiles, managers read their department and staff"
  on public.profiles for select to authenticated
  using (
    (select public.current_user_role()) = 'compliance'
    or (
      (select public.current_user_role()) = 'manager'
      and ((select public.current_user_department()) is null
           or profiles.department = (select public.current_user_department())
           or profiles.role = 'staff')
    )
  );

-- 4. Manage users list: the same rule as the profiles policy above.
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
       or p.department = public.current_user_department()
       or p.role = 'staff'
    order by p.active desc, p.full_name;
end;
$$;

-- Verify after running:
--   select tablename, policyname, qual from pg_policies where tablename in ('tickets','profiles') and cmd in ('SELECT','UPDATE');
--   Sign in as a department manager: Manage users shows your department's agents and managers and all staff.
