-- DRAFT, NOT RUN. Samukelo owns migrations: review, renumber if needed, then run in the SQL Editor.
-- Demo guardrail: a daily cap on Gemini calls made by demo accounts (docs/kopano-demo.md).
-- The draft route calls this only for demo accounts. Over the limit, the reply template is used.

-- 1. One row per day (South African date) with the number of calls made.
create table if not exists public.demo_gemini_usage (
  usage_day date primary key,
  calls integer not null default 0 check (calls >= 0)
);

-- Nobody reads or writes this table directly. Only the function below.
alter table public.demo_gemini_usage enable row level security;

-- 2. Take one call from today's allowance. Returns true if the call may go ahead.
--    The count goes up only while under the limit, in one statement, so two requests cannot both
--    take the last call.
create or replace function public.use_demo_gemini_call(p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'Africa/Johannesburg')::date;
  v_taken boolean;
begin
  if p_limit is null or p_limit < 0 then
    raise exception 'The limit must be zero or more';
  end if;

  insert into public.demo_gemini_usage (usage_day, calls)
  values (v_day, 0)
  on conflict (usage_day) do nothing;

  update public.demo_gemini_usage
  set calls = calls + 1
  where usage_day = v_day and calls < p_limit;
  v_taken := found;
  return v_taken;
end;
$$;

revoke execute on function public.use_demo_gemini_call(integer) from public, anon;
grant execute on function public.use_demo_gemini_call(integer) to authenticated;
