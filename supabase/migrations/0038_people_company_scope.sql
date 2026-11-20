-- Phase 3, security fix: list_people() showed people from EVERY company to any manager.
-- It is security definer, so the company rules in RLS do not apply inside it. This adds the
-- company check. Department scope from 0025 is kept.
-- Safe to run twice (create or replace). Grants are kept by create or replace.

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
    -- Only people in the caller's own company (0038).
    where p.company_id = public.current_user_company()
      -- A general manager (no department) sees all of the company; a department manager sees
      -- their own department's agents and managers (0025).
      and (public.current_user_department() is null
       or (p.department = public.current_user_department() and p.role in ('agent', 'manager')))
    order by p.active desc, p.full_name;
end;
$$;
