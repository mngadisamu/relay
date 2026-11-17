-- 0026_risk_department_scope.sql
-- Why: a department manager should see the risk report for their own department only.
-- A general manager (no department) and compliance still see everything.
-- Changes only risk_metrics(): it reads the caller's department and filters every count
-- by tickets.department. Everything else (the same numbers, the same rules) is unchanged.
-- Safe to run twice: create or replace.

create or replace function public.risk_metrics(p_from date, p_to date)
returns jsonb
language plpgsql
stable
set search_path = ''
as $function$
declare
  v_dept public.department;
  v_drafts jsonb;
  v_routing jsonb;
  v_sensitive int;
  v_flags jsonb;
begin
  if public.current_user_role() is null or public.current_user_role() not in ('compliance', 'manager') then
    raise exception 'Only compliance and managers can see the risk report';
  end if;
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'Choose a start date on or before the end date';
  end if;

  -- Department managers: only their own department. NULL means all departments.
  v_dept := case when public.current_user_role() = 'manager' then public.current_user_department() else null end;

  select jsonb_build_object(
    'drafted', count(*) filter (where r.ai_generated and (r.created_at at time zone 'Africa/Johannesburg')::date between p_from and p_to),
    'ai_unavailable', count(*) filter (where not r.ai_generated and r.ai_draft is not null and not t.is_sensitive
      and (r.created_at at time zone 'Africa/Johannesburg')::date between p_from and p_to),
    'sensitive_kept', count(*) filter (where not r.ai_generated and r.ai_draft is not null and t.is_sensitive
      and (r.created_at at time zone 'Africa/Johannesburg')::date between p_from and p_to),
    'sent', count(*) filter (where r.ai_generated and r.sent_at is not null
      and (r.sent_at at time zone 'Africa/Johannesburg')::date between p_from and p_to),
    'sent_unchanged', count(*) filter (where r.ai_generated and r.sent_at is not null
      and (r.sent_at at time zone 'Africa/Johannesburg')::date between p_from and p_to
      and trim(coalesce(r.ai_draft, '')) = trim(coalesce(r.final_text, '')))
  )
  into v_drafts
  from public.responses r
  join public.tickets t on t.id = r.ticket_id and not t.is_historical
  where v_dept is null or t.department = v_dept;

  select jsonb_build_object(
    'routed', count(*),
    'changed', count(*) filter (where c.overridden_by is not null),
    'confirmed', count(*) filter (where c.confirmed_by is not null),
    'needs_review', count(*) filter (where c.confidence < 0.6)
  )
  into v_routing
  from public.classifications c
  join public.tickets t on t.id = c.ticket_id and not t.is_historical
  where (c.created_at at time zone 'Africa/Johannesburg')::date between p_from and p_to
    and (v_dept is null or t.department = v_dept);

  select count(*) into v_sensitive
  from public.tickets t
  where not t.is_historical and t.is_sensitive
    and (t.created_at at time zone 'Africa/Johannesburg')::date between p_from and p_to
    and (v_dept is null or t.department = v_dept);

  select jsonb_build_object(
    'raised', count(*),
    'open', count(*) filter (where f.resolved_at is null),
    'resolved', count(*) filter (where f.resolved_at is not null),
    'needs_change', count(*) filter (where f.outcome = 'needs_change'),
    'sent_without_edits', count(*) filter (where f.kind = 'sent_without_edits'),
    'invented_detail', count(*) filter (where f.kind = 'invented_detail'),
    'person', count(*) filter (where f.kind = 'person')
  )
  into v_flags
  from public.flags f
  join public.tickets t on t.id = f.ticket_id
  where (f.created_at at time zone 'Africa/Johannesburg')::date between p_from and p_to
    and (v_dept is null or t.department = v_dept);

  return jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'department', v_dept,
    'drafts', v_drafts || jsonb_build_object('pct_unchanged',
      case when (v_drafts->>'sent')::int > 0
        then round(100.0 * (v_drafts->>'sent_unchanged')::int / (v_drafts->>'sent')::int, 1) end),
    'routing', v_routing || jsonb_build_object(
      'pct_changed', case when (v_routing->>'routed')::int > 0
        then round(100.0 * (v_routing->>'changed')::int / (v_routing->>'routed')::int, 1) end,
      'pct_needs_review', case when (v_routing->>'routed')::int > 0
        then round(100.0 * (v_routing->>'needs_review')::int / (v_routing->>'routed')::int, 1) end),
    'sensitive', v_sensitive,
    'flags', v_flags
  );
end;
$function$;
