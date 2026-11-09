-- 0012: Manage users (S2-25). Owner: Samukelo.
--
-- Managers add people and set their role and department in Relay, so nobody
-- has to open the Supabase dashboard. Two parts:
--   - Adding a person sends an invite email. Only Supabase's secret key can do
--     that, and the secret key never goes in Relay's code, so it happens in a
--     Supabase Edge Function (supabase/functions/invite-user), which then calls
--     set_user_role() below as the manager.
--   - Changing a role or department: set_user_role() below.
--
-- Who may do what (same idea as 0006):
--   A general manager (no department) may give anyone any role.
--   A department manager may only add or change staff and agents, and only
--   make agents for their own department.
--   Nobody changes their own role (a manager can't lock themselves out).
--
-- Safe to run twice: "create or replace".

-- ---------------------------------------------------------------
-- 1. list_people(): everyone, with their email, for the Manage users list
-- ---------------------------------------------------------------
-- Emails live in auth.users, which the app can't read; this function returns
-- them to managers only.
create or replace function public.list_people()
returns table (
  id uuid,
  full_name text,
  email text,
  role public.user_role,
  department public.department,
  created_at timestamptz
)
language plpgsql
stable
security definer set search_path = ''
as $$
begin
  if public.current_user_role() is distinct from 'manager' then
    raise exception 'Only managers can see the list of people';
  end if;
  return query
    select p.id, p.full_name, u.email::text, p.role, p.department, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.full_name;
end;
$$;

-- ---------------------------------------------------------------
-- 2. set_user_role(): change someone's role and department
-- ---------------------------------------------------------------
-- p_new = true only when the invite function has just added the person; the
-- audit entry is then user_create instead of role_change.
create or replace function public.set_user_role(
  p_user_id uuid,
  p_role public.user_role,
  p_department public.department default null,
  p_new boolean default false
)
returns void
language plpgsql
security definer set search_path = ''
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
  -- A manager without a department is a general manager.
  if p_role = 'agent' and v_department is null then
    raise exception 'Choose a department for this agent';
  end if;
  if p_role in ('staff', 'compliance') then
    v_department := null;
  end if;

  -- A department manager looks after their own department only.
  if v_my_department is not null then
    if p_role not in ('staff', 'agent') then
      raise exception 'Only a general manager can make someone a manager or compliance officer';
    end if;
    if p_role = 'agent' and v_department <> v_my_department then
      raise exception 'You can only add agents to %', v_my_department;
    end if;
    if not (v_person.role = 'staff' or (v_person.role = 'agent' and v_person.department = v_my_department)) then
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

-- Only signed-in users may call these (not the public "anon" key).
revoke execute on function public.list_people() from public, anon;
revoke execute on function public.set_user_role(uuid, public.user_role, public.department, boolean) from public, anon;
grant execute on function public.list_people() to authenticated;
grant execute on function public.set_user_role(uuid, public.user_role, public.department, boolean) to authenticated;
