-- DRAFT, NOT RUN. Samukelo owns migrations: review, renumber if needed, then run in the SQL Editor.
-- Phase 3, stories P1 and P2 (docs/platform-plan.md): companies, company_id on every company table,
-- and company checks in row-level security.
--
-- How the security works: every table gets a RESTRICTIVE policy that requires
-- company_id = current_user_company(). A restrictive policy is ANDed with the existing permissive
-- policies, so the rules from migrations 0003 to 0027 stay exactly as they are. Nothing is dropped.
-- Kopano Freight is the first company; all existing rows are backfilled to it.

-- 1. The companies table. Platform admins manage it; company members can read their own company.
create table if not exists public.companies (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  require_two_step boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.companies enable row level security;

insert into public.companies (slug, name, require_two_step)
values ('kopano', 'Kopano Freight', true)
on conflict (slug) do nothing;

-- 2. Which company is the signed-in user in? Null for anyone without a profile (they see nothing).
--    plpgsql, not sql: a sql function is checked when it is created, and profiles.company_id
--    is only added in step 3. plpgsql checks the column when the function runs.
create or replace function public.current_user_company()
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_company bigint;
begin
  select p.company_id into v_company from public.profiles p where p.id = auth.uid();
  return v_company;
end;
$$;

revoke execute on function public.current_user_company() from public, anon;
grant execute on function public.current_user_company() to authenticated;

-- The Kopano company id, used as the fallback above. A function, because a column default
-- cannot contain a subquery.
create or replace function public.kopano_company_id()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select c.id from public.companies c where c.slug = 'kopano';
$$;

revoke execute on function public.kopano_company_id() from public, anon;

-- Members read their own company. Only platform admins (0028) may create or change companies.
drop policy if exists "Members read their company" on public.companies;
create policy "Members read their company" on public.companies
  for select to authenticated
  using (id = public.current_user_company() or public.is_platform_admin());

-- 3. company_id on every table that holds company data, backfilled to Kopano.
--    The default is the signed-in user's company, or Kopano when no one is signed in
--    (sign-up trigger, cron jobs, scheduled functions). Replace the fallback when company-aware
--    invites (P4) and scheduled jobs set their company explicitly.
do $$
declare
  kopano bigint := (select id from public.companies where slug = 'kopano');
  t text;
begin
  foreach t in array array[
    'profiles', 'tickets', 'classifications', 'responses', 'templates', 'audit_log',
    'ticket_messages', 'flags', 'approvals', 'insights', 'reports', 'notices', 'email_outbox'
  ]
  loop
    execute format('alter table public.%I add column if not exists company_id bigint references public.companies (id)', t);
    execute format('update public.%I set company_id = %s where company_id is null', t, kopano);
    execute format('alter table public.%I alter column company_id set default coalesce(public.current_user_company(), public.kopano_company_id())', t);
    execute format('alter table public.%I alter column company_id set not null', t);
    execute format('create index if not exists %I on public.%I (company_id)', t || '_company_idx', t);
  end loop;
end $$;

-- 4. Child rows take their company from their ticket, so they can never disagree with it.
create or replace function public.set_company_from_ticket()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.company_id := (select t.company_id from public.tickets t where t.id = new.ticket_id);
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['classifications', 'responses', 'ticket_messages', 'flags', 'approvals']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_company', t);
    execute format('create trigger %I before insert on public.%I for each row execute function public.set_company_from_ticket()', t || '_company', t);
  end loop;
end $$;

-- 5. The company rule, added to every company table. Restrictive: it can only remove access.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'tickets', 'classifications', 'responses', 'templates', 'audit_log',
    'ticket_messages', 'flags', 'approvals', 'insights', 'reports', 'notices', 'email_outbox'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', 'Same company only', t);
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated '
      'using (company_id = public.current_user_company()) '
      'with check (company_id = public.current_user_company())',
      'Same company only', t);
  end loop;
end $$;

-- Note: email_outbox and the notices table are read by functions that run without a user
-- (take_pending_emails, mark_emails_sent, the cron routes). Those functions are security definer
-- and run as the table owner, so the policy above does not stop them. Check this on the
-- preview before running, and make sure the cron routes still send.