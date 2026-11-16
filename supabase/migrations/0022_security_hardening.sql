-- 0022_security_hardening.sql
-- DRAFT for review by Samukelo. Not run on the database.
-- Number: the Sprint 4 plan reserves 0021 for the escalation schedule, so this uses 0022.
-- Confirm the number before committing.
--
-- Why: the Supabase security advisor (run 16 Nov 2026) found functions that anyone
-- on the internet can call through /rest/v1/rpc/... without signing in, and one
-- function with an unfixed search path. This migration closes those gaps.
--
-- Safe to run twice: every statement can be repeated without changing the result.

-- 1. Functions that signed-out visitors should never be able to call.
--    Postgres gives EXECUTE to PUBLIC by default, so we revoke from PUBLIC and anon.
--    Signed-in users keep their current access (only checked here, not changed).

-- Trigger function: runs when a new account is created. It never needs to be called by a person.
revoke execute on function public.handle_new_user() from public, anon;

-- Helper checks used by other functions and triggers. Signed-out visitors have no reason to call them.
revoke execute on function public.check_assignee_active() from public, anon;
revoke execute on function public.check_role_change_active() from public, anon;

-- Scheduled-report functions. They take a secret, but there is no reason for a signed-out
-- visitor to be able to reach them at all. The Monday job calls generate_weekly_reports()
-- directly, so it does not depend on these being public.
-- BEFORE running: search the Edge Functions and app code for save_scheduled_summary and
-- scheduled_period_metrics. If an Edge Function calls them with the anon key, tell Samukelo
-- first, because revoking anon would break that call.
revoke execute on function public.save_scheduled_summary(text, date, date, text, text, jsonb, text) from public, anon;
revoke execute on function public.scheduled_period_metrics(text, date, date, text) from public, anon;

-- 2. Keep these callable by signed-out requests on purpose.
--    current_user_role() and current_user_department() are used inside row-level security
--    policies. If anon loses EXECUTE, queries from signed-out requests start failing with
--    "permission denied" instead of returning no rows. They only return the caller's own
--    role, which is null for a signed-out caller, so nothing leaks. The advisor warning for
--    these two is accepted, not fixed.

-- 3. Fixed search path for metrics_pct_change, so it always resolves the same way.
--    The function is plain arithmetic and reads no tables, so setting the path is safe.
alter function public.metrics_pct_change(numeric, numeric) set search_path = public;

-- 4. Leaked-password protection is NOT set here. It is a switch in the Supabase dashboard:
--    Authentication > Sign In / Providers > Password security > "Prevent use of leaked passwords".

-- 5. Review (not changed here): 25 functions can be called by signed-in users. Most check the
--    caller's role inside the function body. Each one needs a look before any are revoked.
--    List them with the advisor "authenticated_security_definer_function_executable".

-- Verification (run after applying):
--   select proname, proacl from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public' and proname in ('handle_new_user','check_assignee_active',
--   'check_role_change_active','save_scheduled_summary','scheduled_period_metrics');
--   -- anon should not appear in proacl for these five.
--   Then re-run get_advisors (security): the anon_security_definer_function_executable
--   warnings for these five should be gone. current_user_role and current_user_department
--   should still appear, as accepted.
--   Sign in as staff@relay.test and open /staff/requests: it must still load your own requests.
--   Open /agent: it must still load the inbox.

-- Rollback (only if something breaks):
--   grant execute on function public.handle_new_user() to public, anon;
--   grant execute on function public.check_assignee_active() to public, anon;
--   grant execute on function public.check_role_change_active() to public, anon;
--   grant execute on function public.save_scheduled_summary(text, date, date, text, text, jsonb, text) to public, anon;
--   grant execute on function public.scheduled_period_metrics(text, date, date, text) to public, anon;
--   alter function public.metrics_pct_change(numeric, numeric) reset search_path;
