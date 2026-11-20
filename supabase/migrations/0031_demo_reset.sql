-- DRAFT, NOT RUN. Kept out of supabase/migrations on purpose until approved.
-- Nightly reset of the Kopano Freight demo (called by /api/cron/reset-demo at 02:17 SAST).
-- It mirrors scripts/reset-demo.mjs: removes the live demo tickets and their rows, then
-- re-creates the scripted set. Historical tickets are never touched.
-- Needs: cron_secret and check_cron_secret() (migration 0019), approvals (0020), email_outbox (0027),
-- and companies (0030). Run AFTER 0030: the cron job has no signed-in user, so every row gets company_id explicitly.
-- The demo staff account is passed in by the cron route (DEMO_STAFF_EMAIL). Demo accounts never
-- use the test accounts (staff@relay.test), so the demo cannot touch Samukelo's test data.
-- RUN ON THE DEMO PROJECT ONLY. Never on the live "relay" project: it deletes every live ticket.

create or replace function public.reset_demo_company(p_secret text, p_staff_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff uuid;
  v_live bigint[];
  v_id bigint;
begin
  perform public.check_cron_secret(p_secret);

  select u.id into v_staff from auth.users u where lower(u.email) = lower(p_staff_email);
  if v_staff is null then
    raise exception 'Demo staff account not found';
  end if;

  -- 1. Remove the live demo tickets and everything that points at them, children first.
  --    Only demo rows are removed. Audit rows for other tickets are never touched.
  select coalesce(array_agg(t.id), '{}') into v_live from public.tickets t where t.is_historical = false;

  delete from public.flags where ticket_id = any(v_live);
  delete from public.responses where ticket_id = any(v_live);
  delete from public.classifications where ticket_id = any(v_live);
  delete from public.ticket_messages where ticket_id = any(v_live);
  delete from public.approvals where ticket_id = any(v_live);
  delete from public.audit_log where ticket_id = any(v_live);
  delete from public.tickets where id = any(v_live);

  -- 2. The scripted set. Each ticket gets a classification, like a real submission.

  -- Finance purchase waiting for approval.
  insert into public.tickets (submitted_by, subject, description, depot, department, priority, status, request_type, amount, company_id)
  values (v_staff, 'Replacement tyres for truck KF-14',
    'Two front tyres worn below the legal limit. Quote attached to the purchase request.',
    'Depot 2', 'Finance', 'high', 'awaiting_approval', 'purchase', 6400, public.kopano_company_id())
  returning id into v_id;
  insert into public.classifications (ticket_id, predicted_department, confidence, model_version)
  values (v_id, 'Finance', 0.9, 'tfidf-logreg-v2');
  insert into public.approvals (ticket_id, requested_by, decision) values (v_id, v_staff, 'pending');
  insert into public.audit_log (actor, action, ticket_id, details, company_id)
  values (v_staff, 'approval_request', v_id,
    jsonb_build_object('request_type', 'purchase', 'amount', 6400, 'department', 'Finance'), public.kopano_company_id());

  -- Leave request waiting for approval.
  insert into public.tickets (submitted_by, subject, description, depot, department, priority, status, request_type, company_id)
  values (v_staff, 'Annual leave, 3 to 5 December',
    'Three days of annual leave. Cover is arranged with the depot team.',
    'Head office', 'HR', 'low', 'awaiting_approval', 'leave', public.kopano_company_id())
  returning id into v_id;
  insert into public.classifications (ticket_id, predicted_department, confidence, model_version)
  values (v_id, 'HR', 0.9, 'tfidf-logreg-v2');
  insert into public.approvals (ticket_id, requested_by, decision) values (v_id, v_staff, 'pending');
  insert into public.audit_log (actor, action, ticket_id, details, company_id)
  values (v_staff, 'approval_request', v_id,
    jsonb_build_object('request_type', 'leave', 'amount', null, 'department', 'HR'), public.kopano_company_id());

  -- HR ticket with an AI draft waiting for an agent.
  insert into public.tickets (submitted_by, subject, description, depot, department, priority, status, company_id)
  values (v_staff, 'Payslip shows the wrong tax',
    'The tax on my October payslip looks higher than last month. Can someone check it?',
    'Head office', 'HR', 'medium', 'assigned', public.kopano_company_id())
  returning id into v_id;
  insert into public.classifications (ticket_id, predicted_department, confidence, model_version)
  values (v_id, 'HR', 0.9, 'tfidf-logreg-v2');
  insert into public.responses (ticket_id, tone, ai_draft, ai_generated)
  values (v_id, 'formal',
    'Dear colleague, thank you for your message about your October payslip. We are checking the tax calculation now and will come back to you within two working days.',
    true);

  return jsonb_build_object('removed_live_tickets', coalesce(array_length(v_live, 1), 0), 'created_tickets', 3);
end;
$$;

revoke execute on function public.reset_demo_company(text, text) from public;
grant execute on function public.reset_demo_company(text, text) to anon, authenticated;