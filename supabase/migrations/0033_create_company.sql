-- DRAFT, NOT RUN. Samukelo owns migrations: review, renumber if needed, then run in the SQL Editor.
-- Phase 3, story P3 (docs/platform-plan.md): a platform admin creates a company.
-- Needs 0028 (is_platform_admin) and 0030 (companies, company_id).

create or replace function public.create_company(p_slug text, p_name text, p_two_step boolean default true)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  -- Only platform admins create companies (0028).
  if not public.is_platform_admin() then
    raise exception 'Not allowed';
  end if;

  -- Short, safe slug (it may become a subdomain later) and a readable name.
  if p_slug is null or p_slug !~ '^[a-z0-9-]{2,40}$' then
    raise exception 'Use 2 to 40 letters, numbers or hyphens for the company code';
  end if;
  if p_name is null or length(trim(p_name)) < 2 or length(p_name) > 120 then
    raise exception 'The company name must be 2 to 120 characters';
  end if;

  insert into public.companies (slug, name, require_two_step)
  values (p_slug, trim(p_name), coalesce(p_two_step, true))
  returning id into v_id;

  -- The audit entry: ids and short values only (docs/audit-actions.md).
  -- The admin's own profile must have a company_id (0030), so this row is saved.
  insert into public.audit_log (actor, action, ticket_id, details, company_id)
  values (auth.uid(), 'company_create', null,
          jsonb_build_object('company_id', v_id, 'slug', p_slug, 'require_two_step', coalesce(p_two_step, true)),
          v_id);

  return v_id;
end;
$$;

revoke execute on function public.create_company(text, text, boolean) from public, anon;
grant execute on function public.create_company(text, text, boolean) to authenticated;
