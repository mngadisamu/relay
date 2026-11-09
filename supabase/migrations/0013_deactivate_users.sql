-- 0013: switch off the accounts of people who leave (S2-35). Owner: Samukelo.
--
-- People who leave are switched off, never deleted: their name stays on the
-- tickets they sent, the replies they wrote and the audit log, which compliance
-- and POPIA record-keeping need. A switched-off person:
--   - can't sign in (Supabase Auth refuses them, and their sessions end);
--   - has no role in the database rules, so even an old sign-in sees nothing;
--   - can't be assigned tickets, and their open tickets go back to the inbox.
-- A manager can bring them back (a mistake, or someone rejoining).
--
-- Who may do what (same rules as set_user_role(), 0012):
--   a department manager: staff and their own department's agents;
--   a general manager (no department): anyone;
--   nobody switches themselves off, and the last general manager stays.
--
-- Safe to run twice: "if not exists", "drop … if exists" and "create or replace".

-- ---------------------------------------------------------------
-- 1. The switch on each profile
-- ---------------------------------------------------------------
alter table public.profiles
  add column if not exists active boolean not null default true,
  add column if not exists deactivated_at timestamptz,
  add column if not exists deactivated_by uuid references public.profiles (id);

-- ---------------------------------------------------------------
-- 2. A switched-off person has no role or department in the rules
-- ---------------------------------------------------------------
-- Every rule since 0003 asks current_user_role() and current_user_department(),
-- so this one change closes every role-based door at once.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid()) and active
$$;

create or replace function public.current_user_department()
returns public.department
language sql
stable
security definer set search_path = ''
as $$
  select department from public.profiles where id = (select auth.uid()) and active
$$;

-- ---------------------------------------------------------------
-- 3. Nobody can be assigned a ticket once they're switched off
-- ---------------------------------------------------------------
-- A check on the tickets table itself, so it holds for assign_ticket() (0006)
-- and anything added later, without rewriting those functions.
create or replace function public.check_assignee_active()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.assigned_to is not null
     and new.assigned_to is distinct from old.assigned_to
     and not exists (select 1 from public.profiles where id = new.assigned_to and active) then
    raise exception 'This person has left Relay and can''t be assigned tickets';
  end if;
  return new;
end;
$$;

drop trigger if exists tickets_assignee_active on public.tickets;
create trigger tickets_assignee_active
  before update of assigned_to on public.tickets
  for each row execute function public.check_assignee_active();

-- ---------------------------------------------------------------
-- 4. list_people() now says who is switched off
-- ---------------------------------------------------------------
-- Its columns change, so it is dropped and made again (same rules as 0012).
drop function if exists public.list_people();
create function public.list_people()
returns table (
  id uuid,
  full_name text,
  email text,
  role public.user_role,
  department public.department,
  created_at timestamptz,
  active boolean,
  deactivated_at timestamptz
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
    select p.id, p.full_name, u.email::text, p.role, p.department, p.created_at, p.active, p.deactivated_at
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.active desc, p.full_name;
end;
$$;

-- ---------------------------------------------------------------
-- 5. Who may switch a person off or on (shared by both functions)
-- ---------------------------------------------------------------
create or replace function public.can_manage_person(p_person public.profiles)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select case
    -- A general manager manages everyone.
    when public.current_user_department() is null then true
    -- A department manager: staff, and agents of their own department.
    else p_person.role = 'staff'
      or (p_person.role = 'agent' and p_person.department = public.current_user_department())
  end
$$;

-- ---------------------------------------------------------------
-- 6. deactivate_user(): "Remove from Relay"
-- ---------------------------------------------------------------
create or replace function public.deactivate_user(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_person public.profiles%rowtype;
  v_returned int;
begin
  if public.current_user_role() is distinct from 'manager' then
    raise exception 'Only managers can remove people';
  end if;

  select * into v_person from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Person not found';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You can''t remove yourself. Ask another manager.';
  end if;
  if not v_person.active then
    raise exception 'This person has already been removed';
  end if;
  if not public.can_manage_person(v_person) then
    raise exception 'Only a general manager can remove this person';
  end if;
  -- Someone must always be able to manage everyone else.
  if v_person.role = 'manager' and v_person.department is null
     and not exists (
       select 1 from public.profiles
       where role = 'manager' and department is null and active and id <> p_user_id
     ) then
    raise exception 'Relay needs at least one general manager. Make someone else a general manager first.';
  end if;

  -- 1. Switch off the profile (the rules above now give them no role).
  update public.profiles
  set active = false, deactivated_at = now(), deactivated_by = auth.uid()
  where id = p_user_id;

  -- 2. Supabase Auth refuses their sign-in, and their open sessions end.
  update auth.users set banned_until = 'infinity' where id = p_user_id;
  delete from auth.sessions where user_id = p_user_id;

  -- 3. Tickets they had taken but not answered go back to their department's
  --    inbox, so nobody waits on someone who has left.
  update public.tickets
  set assigned_to = null, assigned_at = null, status = 'received'
  where assigned_to = p_user_id and status = 'assigned';
  get diagnostics v_returned = row_count;

  insert into public.audit_log (actor, action, details)
  values (auth.uid(), 'user_deactivate',
    jsonb_build_object('user_id', p_user_id, 'role', v_person.role, 'department', v_person.department,
      'tickets_returned', v_returned));
end;
$$;

-- ---------------------------------------------------------------
-- 7. reactivate_user(): "Bring back"
-- ---------------------------------------------------------------
-- They come back with the role and department they had, and sign in with
-- their old password.
create or replace function public.reactivate_user(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_person public.profiles%rowtype;
begin
  if public.current_user_role() is distinct from 'manager' then
    raise exception 'Only managers can bring people back';
  end if;

  select * into v_person from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Person not found';
  end if;
  if v_person.active then
    raise exception 'This person is already active';
  end if;
  if not public.can_manage_person(v_person) then
    raise exception 'Only a general manager can bring this person back';
  end if;

  update public.profiles
  set active = true, deactivated_at = null, deactivated_by = null
  where id = p_user_id;
  update auth.users set banned_until = null where id = p_user_id;

  insert into public.audit_log (actor, action, details)
  values (auth.uid(), 'user_reactivate',
    jsonb_build_object('user_id', p_user_id, 'role', v_person.role, 'department', v_person.department));
end;
$$;

-- ---------------------------------------------------------------
-- 8. set_user_role() leaves switched-off people alone
-- ---------------------------------------------------------------
-- A small check added in front of 0012's function, so a removed person's role
-- can't be changed until they're brought back.
create or replace function public.check_role_change_active()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if not old.active and (new.role is distinct from old.role or new.department is distinct from old.department) then
    raise exception 'This person has left Relay. Bring them back first.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_change_active on public.profiles;
create trigger profiles_role_change_active
  before update of role, department on public.profiles
  for each row execute function public.check_role_change_active();

-- Only signed-in users may call these (not the public "anon" key).
revoke execute on function public.list_people() from public, anon;
revoke execute on function public.deactivate_user(uuid) from public, anon;
revoke execute on function public.reactivate_user(uuid) from public, anon;
revoke execute on function public.can_manage_person(public.profiles) from public, anon;
grant execute on function public.list_people() to authenticated;
grant execute on function public.deactivate_user(uuid) to authenticated;
grant execute on function public.reactivate_user(uuid) to authenticated;
