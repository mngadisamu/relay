-- DRAFT, NOT RUN. Samukelo owns migrations: review, renumber if needed, then run in the SQL Editor.
-- Platform admins manage the PEOPLE of each company (story P5, revised 19 Nov). They never read tickets.
-- Needs 0028 (is_platform_admin), 0030 (companies, company_id) and 0032 (company_depots).

-- 1. Companies, with how many people are active in each.
create or replace function public.platform_list_companies()
returns table (company_id bigint, company_slug text, company_name text, active_people bigint)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Not allowed';
  end if;
  return query
    select c.id, c.slug, c.name, count(p.id) filter (where p.active)::bigint
    from public.companies c
    left join public.profiles p on p.company_id = c.id
    group by c.id, c.slug, c.name
    order by c.name;
end;
$$;

-- 2. The people of one company. Names and emails only, never tickets.
create or replace function public.platform_list_company_people(p_company_id bigint)
returns table (person_id uuid, person_name text, person_email text, person_role text, person_department text, person_depot text, person_active boolean)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Not allowed';
  end if;
  return query
    select p.id, p.full_name, coalesce(u.email::text, ''), p.role::text, p.department::text, p.depot, p.active
    from public.profiles p
    left join auth.users u on u.id = p.id
    where p.company_id = p_company_id
    order by p.full_name;
end;
$$;

-- 3. The depots of one company (the platform admin cannot read company_depots directly, 0032).
create or replace function public.platform_company_depots(p_company_id bigint)
returns table (depot_name text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Not allowed';
  end if;
  return query
    select d.name from public.company_depots d
    where d.company_id = p_company_id and d.active
    order by d.name;
end;
$$;

-- 4. Edit a person's name, department and depot. Their company, role and email stay as they are
--    here: role changes and email changes are separate (the email goes through the invite-user function).
create or replace function public.platform_update_person(p_user_id uuid, p_full_name text, p_department text, p_depot text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company bigint;
  v_role public.user_role;
begin
  if not public.is_platform_admin() then
    raise exception 'Not allowed';
  end if;

  select p.company_id, p.role into v_company, v_role from public.profiles p where p.id = p_user_id;
  if v_company is null then
    raise exception 'Person not found';
  end if;

  if p_full_name is null or length(trim(p_full_name)) < 2 or length(p_full_name) > 120 then
    raise exception 'The name must be 2 to 120 characters';
  end if;
  if p_department is not null and p_department not in ('HR', 'IT', 'Finance', 'Operations') then
    raise exception 'Choose a department';
  end if;
  if v_role = 'agent' and p_department is null then
    raise exception 'An agent needs a department';
  end if;
  -- The depot must be one of this person's own company's depots.
  if p_depot is not null and p_depot <> '' and not exists (
    select 1 from public.company_depots d where d.company_id = v_company and d.name = p_depot
  ) then
    raise exception 'That depot is not in this company';
  end if;

  update public.profiles
  set full_name = trim(p_full_name),
      department = case when p_department is null or p_department = '' then null else p_department::public.department end,
      depot = nullif(p_depot, '')
  where id = p_user_id;

  -- Audit entry: which fields were set, never their values. The company is set explicitly,
  -- because the admin's own company is not the company of this person.
  insert into public.audit_log (actor, action, ticket_id, details, company_id)
  values (auth.uid(), 'platform_user_edit', null,
          jsonb_build_object('user_id', p_user_id, 'fields', jsonb_build_array('full_name', 'department', 'depot')),
          v_company);
end;
$$;

revoke execute on function public.platform_list_companies() from public, anon;
revoke execute on function public.platform_list_company_people(bigint) from public, anon;
revoke execute on function public.platform_company_depots(bigint) from public, anon;
revoke execute on function public.platform_update_person(uuid, text, text, text) from public, anon;
grant execute on function public.platform_list_companies() to authenticated;
grant execute on function public.platform_list_company_people(bigint) to authenticated;
grant execute on function public.platform_company_depots(bigint) to authenticated;
grant execute on function public.platform_update_person(uuid, text, text, text) to authenticated;
