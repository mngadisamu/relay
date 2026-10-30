-- 0005: let agents see who sent a ticket (name, email, depot).
--
-- Why: profiles' row-level security only lets people read their OWN profile
-- (migration 0002), so the agent's ticket view started straight at the subject
-- with no idea who to reply to.
--
-- Why a function and not a wider profiles policy: a policy would let agents
-- read every column of those profiles. This function returns only the three
-- things an agent needs, for one ticket, and only if the caller can already
-- see that ticket under the rules in migration 0003.
--
-- Call from the app with:
--   supabase.rpc("ticket_submitter", { p_ticket_id: 42 }).maybeSingle()

create or replace function public.ticket_submitter(p_ticket_id bigint)
returns table (full_name text, email text, depot text)
language sql
stable
security definer set search_path = ''
as $$
  select p.full_name, u.email::text, p.depot
  from public.tickets t
  join public.profiles p on p.id = t.submitted_by
  join auth.users u on u.id = t.submitted_by
  where t.id = p_ticket_id
    and (
      -- the same people who can read the ticket (migration 0003)
      t.submitted_by = (select auth.uid())
      or (
        public.current_user_role() = 'agent'
        and t.department = public.current_user_department()
      )
      or public.current_user_role() in ('manager', 'compliance')
    )
$$;

-- Only signed-in users may call it (not the public "anon" key).
revoke execute on function public.ticket_submitter(bigint) from public, anon;
grant execute on function public.ticket_submitter(bigint) to authenticated;
