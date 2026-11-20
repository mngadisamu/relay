-- DRAFT, NOT RUN. Samukelo owns migrations: review, renumber if needed, then run in the SQL Editor.
-- Phase 3, story P4 (docs/platform-plan.md): each company has its own depots and allowed email domains.
-- Needs 0030 (companies, company_id, current_user_company, kopano_company_id).
-- Departments stay fixed (HR, IT, Finance, Operations), so they are not in this migration.

-- 1. Allowed email domains per company. Null means any domain (the Kopano default today).
alter table public.companies add column if not exists allowed_domains text[];

-- 2. Depots per company. Deactivated rather than deleted, so old tickets still show their depot.
create table if not exists public.company_depots (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) default public.current_user_company(),
  name text not null check (length(trim(name)) between 2 and 60),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, name)
);

alter table public.company_depots enable row level security;

-- Members of a company read its depots. Nobody writes here directly: see save_company_settings below.
drop policy if exists "Members read their depots" on public.company_depots;
create policy "Members read their depots" on public.company_depots
  for select to authenticated
  using (company_id = public.current_user_company());

drop policy if exists "Same company only" on public.company_depots;
create policy "Same company only" on public.company_depots
  as restrictive for all to authenticated
  using (company_id = public.current_user_company())
  with check (company_id = public.current_user_company());

-- 3. Kopano's depots, as they are in the app today.
insert into public.company_depots (company_id, name)
select public.kopano_company_id(), d
from unnest(array['Head Office', 'City Deep depot', 'Pomona depot']) as d
on conflict (company_id, name) do nothing;

-- 4. Save the depots and domains. General managers of the company only (no department).
create or replace function public.save_company_settings(p_depots text[], p_domains text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company bigint;
  v_depot text;
  v_domain text;
begin
  -- Only a general manager (manager, no department, active) may change company settings.
  select p.company_id into v_company
  from public.profiles p
  where p.id = auth.uid() and p.role = 'manager' and p.department is null and p.active;
  if v_company is null then
    raise exception 'Only a general manager can change company settings';
  end if;

  -- Depots: 1 to 10, each 2 to 60 characters, no duplicates after trimming.
  if p_depots is null or cardinality(p_depots) = 0 or cardinality(p_depots) > 10 then
    raise exception 'Enter between 1 and 10 depots';
  end if;
  if (select count(distinct lower(trim(d))) from unnest(p_depots) as d) <> cardinality(p_depots) then
    raise exception 'Two depots have the same name';
  end if;

  -- Domains: optional (empty means any domain), at most 20, each like example.co.za.
  if p_domains is not null and cardinality(p_domains) > 20 then
    raise exception 'Enter at most 20 domains';
  end if;
  if p_domains is not null then
    foreach v_domain in array p_domains loop
      if v_domain !~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$' then
        raise exception 'Domain "%" is not valid. Use a form like kopano.example', v_domain;
      end if;
    end loop;
  end if;

  -- Depots: add or switch on the ones listed, switch off the rest (never delete).
  foreach v_depot in array p_depots loop
    insert into public.company_depots (company_id, name, active)
    values (v_company, trim(v_depot), true)
    on conflict (company_id, name) do update set active = true;
  end loop;
  update public.company_depots set active = false
  where company_id = v_company and name <> all (select trim(d) from unnest(p_depots) as d);

  update public.companies
  set allowed_domains = case when p_domains is null or cardinality(p_domains) = 0 then null else p_domains end
  where id = v_company;

  -- Audit entry: counts only, no names (docs/audit-actions.md).
  insert into public.audit_log (actor, action, ticket_id, details)
  values (auth.uid(), 'company_settings_save', null,
          jsonb_build_object('depots', cardinality(p_depots),
                             'domains', coalesce(cardinality(p_domains), 0)));
end;
$$;

revoke execute on function public.save_company_settings(text[], text[]) from public, anon;
grant execute on function public.save_company_settings(text[], text[]) to authenticated;
