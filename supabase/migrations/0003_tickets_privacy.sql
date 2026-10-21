-- S1-15: who can see and create tickets.
-- Row-level security is already on for tickets (migration 0001).
-- With no policies, nobody could read anything; these policies open
-- exactly the access each role needs, and nothing more.

-- 1. Helpers that look up the signed-in user's role and department.
--    "security definer" lets them read profiles without running into
--    profiles' own row-level security.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create or replace function public.current_user_department()
returns public.department
language sql
stable
security definer set search_path = ''
as $$
  select department from public.profiles where id = (select auth.uid())
$$;

-- 2. Everyone can read the tickets they submitted themselves.
create policy "Users read their own tickets"
  on public.tickets for select
  to authenticated
  using (submitted_by = (select auth.uid()));

-- 3. Agents can read tickets for their own department.
create policy "Agents read their department's tickets"
  on public.tickets for select
  to authenticated
  using (
    (select public.current_user_role()) = 'agent'
    and department = (select public.current_user_department())
  );

-- 4. Managers and compliance can read every ticket.
create policy "Managers and compliance read all tickets"
  on public.tickets for select
  to authenticated
  using ((select public.current_user_role()) in ('manager', 'compliance'));

-- 5. Signed-in users can create tickets, but only in their own name.
create policy "Users create their own tickets"
  on public.tickets for insert
  to authenticated
  with check (submitted_by = (select auth.uid()));