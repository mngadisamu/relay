-- 0017_summary_periods.sql (S2-28, S2-33)
-- Run once in the Supabase SQL Editor, BEFORE the new code is deployed.
--
-- Why: AI summaries were saved per week (the Monday of the To date), so the dashboard
-- could show a week that did not match the numbers above it. Each summary now records
-- the exact period it describes, and the dashboard and reports look up that period.
-- ---------------------------------------------------------------

-- 1. The period each summary describes (inclusive dates, like the dashboard filter).
alter table public.insights add column if not exists period_from date;
alter table public.insights add column if not exists period_to date;

-- 2. Existing rows described one Monday-to-Sunday week, so they map directly.
update public.insights
set period_from = week_start,
    period_to = week_start + 6
where period_from is null;

-- 3. Every row now needs a period.
alter table public.insights alter column period_from set not null;
alter table public.insights alter column period_to set not null;

-- 4. Replace the old per-week key with one per exact period and department.
--    null department means "all departments", as before.
drop index if exists public.insights_week_department_key;
create unique index if not exists insights_period_department_key
  on public.insights (period_from, period_to, coalesce(department, 'all'));
