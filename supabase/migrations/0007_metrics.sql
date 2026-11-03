-- 0007_metrics.sql
-- S2-09 · dashboard_metrics(): the one source of the help desk numbers (Contract 2).
-- Also creates the insights table that S2-28 saves AI summaries into.
-- Shape and definitions: docs/metrics.md

-- ---------------------------------------------------------------
-- Helper: relative change in percent (null when it can't be worked out)
-- ---------------------------------------------------------------
create or replace function public.metrics_pct_change(p_value numeric, p_previous numeric)
returns numeric
language sql
immutable
as $$
  select case
    when p_value is null or p_previous is null or p_previous = 0 then null
    else round((p_value - p_previous) / p_previous * 100, 1)
  end
$$;

-- ---------------------------------------------------------------
-- dashboard_metrics(p_from, p_to, p_department)
-- Runs as the caller, so the existing ticket rules decide what they see:
-- managers and compliance see everything, agents see only their department.
-- ---------------------------------------------------------------
create or replace function public.dashboard_metrics(
  p_from date,
  p_to date,
  p_department text default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_days int;
  v_prev_from date;
  v_prev_to date;
  v_week date;
  m record;
  v_c_review numeric;
  v_p_review numeric;
  v_weekly jsonb;
  v_daily jsonb;
  v_depts jsonb;
begin
  -- Staff don't use the dashboard. (No signed-in user = the SQL Editor or a trusted
  -- server call, which is allowed so the function can be tested.)
  if auth.uid() is not null
     and coalesce(public.current_user_role()::text, '') not in ('agent', 'manager', 'compliance') then
    raise exception 'Not allowed: the dashboard is for agents, managers and compliance';
  end if;

  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'p_from and p_to are required, and p_to must not be before p_from';
  end if;

  v_days      := p_to - p_from + 1;
  v_prev_from := p_from - v_days;
  v_prev_to   := p_from - 1;
  v_week      := date_trunc('week', p_to::timestamp)::date;  -- Monday of the last week

  -- Current period (cur) and previous period (prv) in one pass over the tickets.
  select
    count(*) filter (where cur)                                              as c_n,
    count(*) filter (where cur and answered_at is not null)                  as c_reply_n,
    avg(extract(epoch from answered_at - created_at)::numeric / 3600.0)
      filter (where cur and answered_at is not null)                         as c_reply_h,
    count(*) filter (where cur and status <> 'closed')                       as c_open,
    count(*) filter (where cur and needs_review)                             as c_review,
    count(*) filter (where cur and closed_at is not null)                    as c_res_n,
    avg(extract(epoch from closed_at - created_at)::numeric / 3600.0)
      filter (where cur and closed_at is not null)                           as c_res_h,
    count(*) filter (where cur and priority = 'low')                         as c_low,
    count(*) filter (where cur and priority = 'medium')                      as c_med,
    count(*) filter (where cur and priority = 'high')                        as c_high,
    count(*) filter (where cur and priority = 'urgent')                      as c_urgent,
    count(*) filter (where prv)                                              as p_n,
    avg(extract(epoch from answered_at - created_at)::numeric / 3600.0)
      filter (where prv and answered_at is not null)                         as p_reply_h,
    count(*) filter (where prv and status <> 'closed')                       as p_open,
    count(*) filter (where prv and needs_review)                             as p_review,
    avg(extract(epoch from closed_at - created_at)::numeric / 3600.0)
      filter (where prv and closed_at is not null)                           as p_res_h
  into m
  from (
    select t.created_at, t.answered_at, t.closed_at, t.needs_review,
           lower(t.status::text)   as status,
           lower(t.priority::text) as priority,
           (t.created_at at time zone 'Africa/Johannesburg')::date
             between p_from and p_to           as cur,
           (t.created_at at time zone 'Africa/Johannesburg')::date
             between v_prev_from and v_prev_to as prv
    from public.tickets t
    where p_department is null or t.department::text = p_department
  ) z;

  v_c_review := case when m.c_n = 0 then null else round(m.c_review * 100.0 / m.c_n, 1) end;
  v_p_review := case when m.p_n = 0 then null else round(m.p_review * 100.0 / m.p_n, 1) end;

  -- 12 weeks ending with the week that contains p_to (weeks start on Monday)
  select coalesce(jsonb_agg(jsonb_build_object('week_start', w.week_start, 'tickets', w.n)
                            order by w.week_start), '[]'::jsonb)
  into v_weekly
  from (
    select s::date as week_start,
           (select count(*) from public.tickets t
             where (p_department is null or t.department::text = p_department)
               and (t.created_at at time zone 'Africa/Johannesburg')::date
                   between s::date and s::date + 6) as n
    from generate_series(v_week - 77, v_week, interval '7 days') s
  ) w;

  -- One entry for every day from p_from to p_to, with 0 on empty days
  select coalesce(jsonb_agg(jsonb_build_object('date', d.day, 'tickets', d.n)
                            order by d.day), '[]'::jsonb)
  into v_daily
  from (
    select s::date as day,
           (select count(*) from public.tickets t
             where (p_department is null or t.department::text = p_department)
               and (t.created_at at time zone 'Africa/Johannesburg')::date = s::date) as n
    from generate_series(p_from, p_to, interval '1 day') s
  ) d;

  select coalesce(jsonb_agg(jsonb_build_object('department', x.department, 'tickets', x.n)
                            order by x.n desc, x.department), '[]'::jsonb)
  into v_depts
  from (
    select t.department::text as department, count(*) as n
    from public.tickets t
    where (t.created_at at time zone 'Africa/Johannesburg')::date between p_from and p_to
      and (p_department is null or t.department::text = p_department)
    group by t.department
  ) x;

  return jsonb_build_object(
    'period',          jsonb_build_object('from', p_from, 'to', p_to, 'days', v_days),
    'previous_period', jsonb_build_object('from', v_prev_from, 'to', v_prev_to),
    'department',      p_department,
    'generated_at',    now(),
    'cards', jsonb_build_object(
      'tickets', jsonb_build_object(
        'value', m.c_n, 'previous', m.p_n,
        'change_pct', public.metrics_pct_change(m.c_n, m.p_n)),
      'first_reply_hours', jsonb_build_object(
        'value',      round(m.c_reply_h, 1),
        'previous',   round(m.p_reply_h, 1),
        'change_pct', public.metrics_pct_change(m.c_reply_h, m.p_reply_h),
        'based_on',   m.c_reply_n),
      'open_tickets', jsonb_build_object(
        'value', m.c_open, 'previous', m.p_open,
        'change_pct', public.metrics_pct_change(m.c_open, m.p_open)),
      'needs_review', jsonb_build_object(
        'value', v_c_review, 'previous', v_p_review,
        'change_points', case when v_c_review is not null and v_p_review is not null
                              then round(v_c_review - v_p_review, 1) end,
        'count', m.c_review)
    ),
    'resolution_hours', jsonb_build_object(
      'value',      round(m.c_res_h, 1),
      'previous',   round(m.p_res_h, 1),
      'change_pct', public.metrics_pct_change(m.c_res_h, m.p_res_h),
      'based_on',   m.c_res_n),
    'by_priority', jsonb_build_object(
      'Low', m.c_low, 'Medium', m.c_med, 'High', m.c_high, 'Urgent', m.c_urgent),
    'by_department', v_depts,
    'weekly',        v_weekly,
    'daily',         v_daily
  );
end;
$$;

-- Only signed-in users may call it (not anonymous visitors)
revoke all on function public.dashboard_metrics(date, date, text) from public, anon;
grant execute on function public.dashboard_metrics(date, date, text) to authenticated;

-- ---------------------------------------------------------------
-- insights: saved AI weekly summaries (written by S2-28, reused by reports)
-- department is null for "all departments". One summary per week and department.
-- ---------------------------------------------------------------
create table if not exists public.insights (
  id          bigint generated always as identity primary key,
  week_start  date        not null,
  department  text,
  summary     text,
  metrics     jsonb       not null,
  status      text        not null default 'ok' check (status in ('ok', 'unavailable')),
  created_at  timestamptz not null default now(),
  created_by  uuid        references public.profiles(id) default auth.uid()
);

create unique index if not exists insights_week_department_key
  on public.insights (week_start, coalesce(department, 'all'));

alter table public.insights enable row level security;

drop policy if exists "Managers read insights" on public.insights;
create policy "Managers read insights" on public.insights
  for select to authenticated
  using ((select public.current_user_role())::text = 'manager');

drop policy if exists "Managers save insights" on public.insights;
create policy "Managers save insights" on public.insights
  for insert to authenticated
  with check ((select public.current_user_role())::text = 'manager');

drop policy if exists "Managers update insights" on public.insights;
create policy "Managers update insights" on public.insights
  for update to authenticated
  using ((select public.current_user_role())::text = 'manager')
  with check ((select public.current_user_role())::text = 'manager');