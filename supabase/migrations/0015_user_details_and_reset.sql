-- 0015: managers update people's details and send password resets (S2-36).
-- Owner: Samukelo.
--
--   update_user_details()  a person's name and depot;
--   can_manage_user()      may I manage this person? (the invite-user Edge
--                          Function asks it before changing someone's email);
--   reset_email_for()      the email to send a "choose a new password" link to,
--                          only for someone the manager may manage.
-- The rules are the same as 0012 and 0013 (can_manage_person()): a general
-- manager manages anyone; a department manager, staff and their own
-- department's agents. A manager may always update their own name and depot.
-- Each change goes in the audit log, without the old or new values (names and
-- emails are personal: the log only says which fields changed).
-- Safe to run twice: "create or replace".

-- ---------------------------------------------------------------
-- 1. update_user_details(): name and depot
-- ---------------------------------------------------------------
create or replace function public.update_user_details(
  p_user_id uuid,
  p_full_name text,
  p_depot text default null
)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_person public.profiles%rowtype;
  v_name text := trim(coalesce(p_full_name, ''));
  v_depot text := nullif(trim(coalesce(p_depot, '')), '');
  v_changed text[] := '{}';
begin
  if public.current_user_role() is distinct from 'manager' then
    raise exception 'Only managers can update people''s details';
  end if;

  select * into v_person from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Person not found';
  end if;
  if not v_person.active then
    raise exception 'This person has left Relay. Bring them back first.';
  end if;
  if p_user_id <> auth.uid() and not public.can_manage_person(v_person) then
    raise exception 'Only a general manager can update this person';
  end if;

  if length(v_name) < 2 then
    raise exception 'Enter their full name';
  end if;
  if v_depot is not null and v_depot not in ('Head Office', 'City Deep depot', 'Pomona depot') then
    raise exception 'Choose a depot from the list';
  end if;

  if v_person.full_name is distinct from v_name then v_changed := array_append(v_changed, 'full_name'); end if;
  if v_person.depot is distinct from v_depot then v_changed := array_append(v_changed, 'depot'); end if;
  if cardinality(v_changed) = 0 then
    return; -- nothing changed: no update, no audit entry
  end if;

  update public.profiles set full_name = v_name, depot = v_depot where id = p_user_id;

  insert into public.audit_log (actor, action, details)
  values (auth.uid(), 'user_update', jsonb_build_object('user_id', p_user_id, 'changed', to_jsonb(v_changed)));
end;
$$;

-- ---------------------------------------------------------------
-- 2. can_manage_user(): asked by the Edge Function before an email change
-- ---------------------------------------------------------------
create or replace function public.can_manage_user(p_user_id uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select public.current_user_role() = 'manager'
    and exists (
      select 1 from public.profiles p
      where p.id = p_user_id and p.active
        and (p.id = (select auth.uid()) or public.can_manage_person(p))
    )
$$;

-- ---------------------------------------------------------------
-- 3. reset_email_for(): "Send password reset" on Manage users
-- ---------------------------------------------------------------
-- Returns the email (from auth.users, which the app can't read) and writes the
-- audit entry; the app then asks Supabase to send the link.
create or replace function public.reset_email_for(p_user_id uuid)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  v_email text;
begin
  if not public.can_manage_user(p_user_id) then
    raise exception 'You can''t send a password reset to this person';
  end if;
  select email into v_email from auth.users where id = p_user_id;

  insert into public.audit_log (actor, action, details)
  values (auth.uid(), 'password_reset_sent', jsonb_build_object('user_id', p_user_id));
  return v_email;
end;
$$;

revoke execute on function public.update_user_details(uuid, text, text) from public, anon;
revoke execute on function public.can_manage_user(uuid) from public, anon;
revoke execute on function public.reset_email_for(uuid) from public, anon;
grant execute on function public.update_user_details(uuid, text, text) to authenticated;
grant execute on function public.can_manage_user(uuid) to authenticated;
grant execute on function public.reset_email_for(uuid) to authenticated;

-- list_people() (0013) is unchanged; Manage users reads depots separately.
