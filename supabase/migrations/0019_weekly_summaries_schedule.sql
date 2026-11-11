-- 0019: Monday AI summaries for the scheduled reports (S2-34). Owner: Baphakamise. Reviewer: Samukelo.
--
-- The Monday job in src/app/api/cron/weekly-summaries runs from Vercel with no signed-in
-- user. It cannot write to insights (managers only), and it cannot read the metrics as a
-- manager. These functions let it do both, and only with the right secret: each one checks
-- the secret before doing anything. The secret is stored once here and once in Vercel as
-- CRON_SECRET (the same value). The app never holds a service-role key.

-- 1. The secret. One row only. No policies, so the API can never read or change it.
create table if not exists public.cron_secret (
  id boolean primary key default true check (id),  -- only one row can exist
  value text not null
);
alter table public.cron_secret enable row level security;

-- Samukelo sets the secret ONCE in the SQL Editor (paste the value; never commit it):
--   insert into public.cron_secret (id, value) values (true, 'PASTE-CRON_SECRET-HERE')
--   on conflict (id) do update set value = excluded.value;

-- 2. The check every function below uses. Not callable by the API.
create or replace function public.check_cron_secret(p_secret text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_secret is null or not exists (select 1 from public.cron_secret where value = p_secret) then
    raise exception 'Not allowed';
  end if;
end;
$$;
revoke execute on function public.check_cron_secret(text) from public, anon, authenticated;

-- 3. The numbers for one period and department, the same ones the dashboard shows.
--    dashboard_metrics() is run by this function's owner, so it can read every ticket.
create or replace function public.scheduled_period_metrics(
  p_secret text,
  p_from date,
  p_to date,
  p_department text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.check_cron_secret(p_secret);
  return public.dashboard_metrics(p_from, p_to, p_department);
end;
$$;

-- 4. Save the summary for one exact period and department (the rule from 0017), and log it.
--    The same row the dashboard button writes, so the reports and the dashboard read one place.
create or replace function public.save_scheduled_summary(
  p_secret text,
  p_period_from date,
  p_period_to date,
  p_department text,
  p_summary text,
  p_metrics jsonb,
  p_status text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  perform public.check_cron_secret(p_secret);

  update public.insights
  set summary = p_summary,
      metrics = p_metrics,
      status = p_status,
      week_start = p_period_from
  where period_from = p_period_from
    and period_to = p_period_to
    and coalesce(department, 'all') = coalesce(p_department, 'all')
  returning id into v_id;

  if v_id is null then
    insert into public.insights (week_start, period_from, period_to, department, summary, metrics, status)
    values (p_period_from, p_period_from, p_period_to, p_department, p_summary, p_metrics, p_status)
    returning id into v_id;
  end if;

  -- Every generated summary is logged (docs/audit-actions.md). No signed-in user, so actor is empty.
  insert into public.audit_log (actor, action, details)
  values (null, 'insight_generate', jsonb_build_object(
    'insight_id', v_id,
    'department', p_department,
    'period_from', p_period_from,
    'period_to', p_period_to,
    'ai_generated', p_status = 'ok',
    'scheduled', true
  ));

  return v_id;
end;
$$;

-- The cron route calls these with the public (anon) key plus the secret.
grant execute on function public.scheduled_period_metrics(text, date, date, text) to anon;
grant execute on function public.save_scheduled_summary(text, date, date, text, text, jsonb, text) to anon;
