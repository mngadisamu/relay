-- 0018: Monday schedule for the weekly reports (S2-34). Owner: Baphakamise. Reviewer: Samukelo.
--
-- Replaces generate_weekly_reports() from 0010_weekly_reports_schedule.sql. That version
-- inserted columns the reports table does not have (week_end, payload, created_by), so it
-- would fail. This version writes only the columns from 0008: department, week_start,
-- metrics, ai_summary, forecast. It is self-contained, so it works whether or not 0010 ran.
--
-- Safe to run twice: the function is replaced, and the schedule is removed before it is added.

-- The last full week (Monday to Sunday), in South African time.
-- "Last week" is the week before the one this run happens in.
create or replace function public.generate_weekly_reports()
returns void
language plpgsql
security definer          -- writes reports for all departments, whoever the scheduler runs as
set search_path = public
as $$
declare
  v_dept text;
  v_today date := (now() at time zone 'Africa/Johannesburg')::date;
  v_week_start date := date_trunc('week', v_today - 7)::date;  -- the Monday of last week
  v_week_end date := v_week_start + 6;                          -- the Sunday of last week
  v_metrics jsonb;
begin
  foreach v_dept in array array['HR', 'IT', 'Finance', 'Operations'] loop
    -- The same numbers the preview shows (0007).
    select public.dashboard_metrics(v_week_start, v_week_end, v_dept) into v_metrics;

    -- ai_summary and forecast stay empty here: the summary is written by insights.ts
    -- when a manager opens the report, and the forecast needs the TypeScript method.
    insert into public.reports (department, week_start, metrics, ai_summary, forecast)
    values (v_dept::public.department, v_week_start, v_metrics, null, '{}'::jsonb)
    on conflict (department, week_start) do nothing;  -- never overwrite a report already saved
  end loop;
end;
$$;

-- Only the scheduler may run it. Signed-in users and the public key may not.
revoke execute on function public.generate_weekly_reports() from public, anon, authenticated;

-- Schedule it with pg_cron (Supabase Database > Extensions). pg_cron runs in UTC:
-- 06:00 UTC on Monday is 08:00 in South Africa.
-- If pg_cron is not turned on, this only prints a notice: turn it on, then run this file again.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Remove an old job with the same name first, so running this twice does not add two.
    execute 'select cron.unschedule(jobid) from cron.job where jobname = ''weekly-reports'''
      ;
    execute $job$select cron.schedule('weekly-reports', '0 6 * * 1', 'select public.generate_weekly_reports()')$job$;
  else
    raise notice 'pg_cron is not enabled. Turn it on in Supabase (Database > Extensions) and run this migration again.';
  end if;
end $$;
