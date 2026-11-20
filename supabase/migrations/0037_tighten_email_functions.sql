-- DRAFT, NOT RUN. Samukelo owns migrations: review, renumber if needed, then run in the SQL Editor.
-- Tightens the two email functions from migration 0027. Postgres grants EXECUTE to PUBLIC by default,
-- so everyone was allowed to call them. The cron route still needs anon and authenticated, so those
-- stay; PUBLIC is removed. Both functions also check the CRON_SECRET (0019), which remains the real gate.

revoke execute on function public.take_pending_emails(text) from public;
revoke execute on function public.mark_emails_sent(text, bigint[]) from public;

grant execute on function public.take_pending_emails(text) to anon, authenticated;
grant execute on function public.mark_emails_sent(text, bigint[]) to anon, authenticated;
