-- 0014: the numbers for the Risk report (S2-30). Owner: Samukelo.
--
-- One call returns how the AI behaved over a date range, counted in SQL so
-- nothing hits Supabase's 1,000-row limit:
--   drafts     how many replies Gemini drafted, and how many went out unchanged;
--   routing    how many routings an agent changed, or marked Needs review;
--   sensitive  requests kept away from Gemini by the sensitive rule (0009);
--   flags      flags raised, open, resolved and why (0011).
-- Only live tickets count: the past tickets were loaded without AI decisions.
--
-- "security invoker": it runs as the caller, so the normal rules decide what
-- it can count. Compliance and managers can read every ticket, so they see all.
-- Safe to run twice: "create or replace".

create or replace function public.risk_metrics(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security invoker set search_path = ''
as $$
declare
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

  -- AI drafts: drafted in the range, and sent in the range.
  select jsonb_build_object(
    'drafted', count(*) filter (where r.ai_generated and (r.created_at at time zone 'Africa/Johannesburg')::date between p_from and p_to),
    'sent', count(*) filter (where r.ai_generated and r.sent_at is not null
      and (r.sent_at at time zone 'Africa/Johannesburg')::date between p_from and p_to),
    'sent_unchanged', count(*) filter (where r.ai_generated and r.sent_at is not null
      and (r.sent_at at time zone 'Africa/Johannesburg')::date between p_from and p_to
      and trim(coalesce(r.ai_draft, '')) = trim(coalesce(r.final_text, '')))
  )
  into v_drafts
  from public.responses r
  join public.tickets t on t.id = r.ticket_id and not t.is_historical;

  -- Routing: every classification made in the range.
  select jsonb_build_object(
    'routed', count(*),
    'changed', count(*) filter (where c.overridden_by is not null),
    'confirmed', count(*) filter (where c.confirmed_by is not null),
    'needs_review', count(*) filter (where c.confidence < 0.6)
  )
  into v_routing
  from public.classifications c
  join public.tickets t on t.id = c.ticket_id and not t.is_historical
  where (c.created_at at time zone 'Africa/Johannesburg')::date between p_from and p_to;

  select count(*) into v_sensitive
  from public.tickets t
  where not t.is_historical and t.is_sensitive
    and (t.created_at at time zone 'Africa/Johannesburg')::date between p_from and p_to;

  -- Flags raised in the range, and where they stand now.
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
  where (f.created_at at time zone 'Africa/Johannesburg')::date between p_from and p_to;

  -- Percentages with one decimal place; null when there is nothing to divide by.
  return jsonb_build_object(
    'from', p_from,
    'to', p_to,
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
$$;

revoke execute on function public.risk_metrics(date, date) from public, anon;
grant execute on function public.risk_metrics(date, date) to authenticated;
