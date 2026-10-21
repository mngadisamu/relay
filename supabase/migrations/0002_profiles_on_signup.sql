-- S1-09: give every new user a profile, and let users read their own.

-- 1. A function that inserts a profile row for a new user.
--    The role column defaults to 'staff'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

-- 2. A trigger that runs that function every time a user signs up.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. A policy: a signed-in user can read their own profile, and only theirs.
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);