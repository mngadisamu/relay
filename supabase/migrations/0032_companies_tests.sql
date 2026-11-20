-- DRAFT, NOT RUN. Cross-company tests for 0030. Run AFTER 0030 on a Supabase BRANCH, never on live.
-- Everything runs in one transaction and is rolled back, so no test data is left behind.
-- Expected result: every check returns true, and the last line prints PASS.

begin;

-- Two companies, one member and one ticket in each. Uses the test accounts.
insert into public.companies (slug, name) values ('test-b', 'Test Company B') on conflict (slug) do nothing;

do $$
declare
  kopano bigint := (select id from public.companies where slug = 'kopano');
  other bigint := (select id from public.companies where slug = 'test-b');
  kopano_user uuid := (select id from auth.users where email = 'staff@relay.test');
  other_user uuid := (select id from auth.users where email = 'staff2@relay.test');
  kopano_ticket bigint;
  other_ticket bigint;
  seen int;
begin
  -- Give the test accounts their companies for this test only.
  update public.profiles set company_id = kopano where id = kopano_user;
  update public.profiles set company_id = other where id = other_user;

  -- Tickets: insert as each user (the RLS rules need auth.uid()).
  perform set_config('request.jwt.claims', json_build_object('sub', kopano_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.tickets (submitted_by, subject, description, depot, department, priority, status)
  values (kopano_user, 'T1 Kopano', 'x', 'Head office', 'IT', 'low', 'received') returning id into kopano_ticket;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', other_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.tickets (submitted_by, subject, description, depot, department, priority, status)
  values (other_user, 'T2 Other', 'x', 'Head office', 'IT', 'low', 'received') returning id into other_ticket;

  -- Check 1: the other company's user sees only their own company's tickets.
  select count(*) into seen from public.tickets where id = kopano_ticket;
  assert seen = 0, 'FAIL 1: other company can read Kopano ticket';

  -- Check 2: and can see their own.
  select count(*) into seen from public.tickets where id = other_ticket;
  assert seen = 1, 'FAIL 2: other company cannot read its own ticket';

  -- Check 3: a child row (classification) takes its company from its ticket.
  insert into public.classifications (ticket_id, predicted_department, confidence, model_version)
  values (other_ticket, 'IT', 0.9, 'test');
  reset role;
  assert (select company_id from public.classifications where ticket_id = other_ticket) = other,
    'FAIL 3: child row has the wrong company';

  -- Check 4: a Kopano user cannot update the other company's ticket.
  perform set_config('request.jwt.claims', json_build_object('sub', kopano_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.tickets set subject = 'hacked' where id = other_ticket;
  reset role;
  assert (select subject from public.tickets where id = other_ticket) = 'T2 Other',
    'FAIL 4: cross-company update succeeded';

  raise notice 'PASS: all 4 cross-company checks held';
end $$;

rollback;
