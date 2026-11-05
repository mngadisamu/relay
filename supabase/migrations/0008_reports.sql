-- 0008: saved weekly reports (S2-10). Owner: Baphakamise.
--
-- One row per department per week. The report keeps the numbers and forecast
-- it was made from, so downloading it later shows exactly what the manager saw,
-- even after more tickets come in (S2-29).

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  department public.department not null,       -- the same list as tickets: HR, IT, Finance, Operations
  week_start date not null,                     -- the Monday the week starts on
  metrics jsonb not null,                       -- what dashboard_metrics() returned (0007)
  ai_summary text,                              -- added later by insights.ts (S2-28, S2-34)
  forecast jsonb not null default '{}'::jsonb,  -- the 4-week forecast (S2-24)
  created_at timestamptz not null default now(), -- stored in UTC like every table; screens show SAST
  constraint reports_department_week_key unique (department, week_start)
);

alter table public.reports enable row level security;

-- Only managers read and save reports. Same helper as the other migrations (0003).
create policy "Managers read and save reports"
  on public.reports for all
  to authenticated
  using ((select public.current_user_role()) = 'manager')
  with check ((select public.current_user_role()) = 'manager');
