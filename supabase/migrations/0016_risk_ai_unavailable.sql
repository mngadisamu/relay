-- 0016: the Risk report also counts drafts where the AI was unavailable (S2-30
-- follow-up). Owner: Samukelo.
--
-- When Gemini doesn't answer (it's down, over its daily limit, or the model
-- name is no longer offered), the draft route gives the agent the plain
-- template instead and saves it with ai_generated = false. Those drafts aren't
-- "AI-drafted", so 0014 didn't count them, and a broken AI looked like "0 AI
-- drafts". That is a risk compliance should see, so they're counted here:
--   drafts.ai_unavailable   template given because Gemini didn't answer;
--   drafts.sensitive_kept   template given on purpose: a sensitive request
--                           (its text never goes to Gemini, 0009).
-- Everything else is exactly as in 0014. Safe to run twice: "create or replace".

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

  -- Drafts made in the range (AI or template), and AI drafts sent in the range.
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
  join public.tickets t on t.id = r.ticket_id and not t.is_historical;

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
