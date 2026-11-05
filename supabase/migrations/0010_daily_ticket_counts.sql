-- 0010: tickets per day, counted in the database (contract 4). Owner: Samukelo.
--
-- The forecast (S2-08) learns from the number of tickets per day. A page can't
-- fetch 15,000 tickets to count them itself: Supabase returns at most 1,000 rows
-- per request. This function counts them in SQL and returns one small row per
-- day, the same shape as DailyCount in docs/forecast.md: { date, tickets }.
--
-- Used by the forecast view (S2-27) and the report's forecast section (S2-24):
--   supabase.rpc("daily_ticket_counts", { p_department: "HR" })
--
-- "security invoker": it runs as the caller, so the ticket rules (0003) still
-- decide what they can count. Managers count everything; an agent only their
-- own department.

create or replace function public.daily_ticket_counts(
  p_department public.department default null, -- null = all departments together
  p_historical boolean default true,           -- true = past tickets only (the forecast's decision),
                                               -- false = live only, null = both
  p_from date default null,                    -- first day; null = the first day with a matching ticket
  p_to date default null                       -- last day; null = the last day with a matching ticket
)
returns table (date date, tickets integer)
language sql
stable
security invoker
set search_path = public
as $$
  with matching as (
    -- The day each ticket arrived, in South African time.
    select (t.created_at at time zone 'Africa/Johannesburg')::date as day
    from public.tickets t
    where (p_department is null or t.department = p_department)
      and (p_historical is null or t.is_historical = p_historical)
  ),
  bounds as (
    select coalesce(p_from, min(day)) as first_day,
           coalesce(p_to, max(day)) as last_day
    from matching
  ),
  days as (
    -- Every day in the range, so days with no tickets come back as 0, not missing.
    select d::date as day
    from bounds, generate_series(bounds.first_day, bounds.last_day, interval '1 day') d
  )
  select days.day as date,
         count(matching.day)::integer as tickets
  from days
  left join matching on matching.day = days.day
  group by days.day
  order by days.day
$$;

-- Only signed-in users may call it (not the public "anon" key).
revoke execute on function public.daily_ticket_counts(public.department, boolean, date, date) from public, anon;
grant execute on function public.daily_ticket_counts(public.department, boolean, date, date) to authenticated;
