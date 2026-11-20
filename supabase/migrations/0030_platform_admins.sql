-- DRAFT, NOT RUN. Kept out of supabase/migrations on purpose until approved.
-- Platform admin role (see docs/platform-plan.md, system admin section).
-- Needs email_outbox (migration 0027) for the notifications count.

-- 1. Who the platform admins are. Row-level security is on with NO policies:
--    only the functions below read this table.
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_by uuid,
  added_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

-- 2. Is the signed-in user a platform admin?
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.platform_admins p where p.user_id = auth.uid());
$$;

-- 3. Counts only. Never returns ticket text, replies, names or email addresses.
create or replace function public.system_summary()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Not allowed';
  end if;

  insert into public.audit_log (actor, action, ticket_id, details)
  values (auth.uid(), 'system_view', null, '{}'::jsonb);

  return jsonb_build_object(
    'people_active', (select count(*) from public.profiles where active),
    'people_removed', (select count(*) from public.profiles where not active),
    'live_tickets', (select count(*) from public.tickets where not is_historical),
    'historical_tickets', (select count(*) from public.tickets where is_historical),
    'replies_sent', (select count(*) from public.responses where sent_at is not null),
    'emails_waiting', (select count(*) from public.email_outbox where sent_at is null),
    'emails_sent', (select count(*) from public.email_outbox where sent_at is not null)
  );
end;
$$;

revoke execute on function public.is_platform_admin() from public, anon;
revoke execute on function public.system_summary() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.system_summary() to authenticated;
