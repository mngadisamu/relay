-- 0029: escalate urgent tickets with no reply after 4 hours (S4-06).
-- Runs every 15 minutes inside Postgres (pg_cron), the same way as the Monday job in 0018.
-- No one signs in for it, so it takes no secret: only the scheduler can run it.

alter table public.tickets
  add column if not exists escalated boolean not null default false,
  add column if not exists escalated_at timestamptz;

create or replace function public.escalate_urgent_tickets()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
  m record;
  v_count integer := 0;
begin
  for t in
    select id, reference, department
    from public.tickets
    where priority = 'urgent'
      and status = 'assigned'
      and answered_at is null
      and assigned_at <= now() - interval '4 hours'
      and not escalated
      and not is_historical
    for update
  loop
    update public.tickets
       set escalated = true, escalated_at = now()
     where id = t.id;

    insert into public.audit_log (actor, action, ticket_id, details)
    values (null, 'escalate', t.id,
            jsonb_build_object('department', t.department, 'after_hours', 4));

    -- The same managers who can decide this department's approvals (0027).
    for m in
      select p.id from public.profiles p
      where p.role = 'manager' and p.active
        and (p.department is null or p.department = t.department)
    loop
      perform public.queue_notice(
        m.id, t.reference, 'Urgent request escalated',
        'An urgent ' || t.department || ' request has had no reply for 4 hours.',
        '/agent/' || t.id
      );
    end loop;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke execute on function public.escalate_urgent_tickets() from public, anon, authenticated;

-- Schedule it every 15 minutes. Unschedules any old copy first, so re-running is safe.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute 'select cron.unschedule(jobid) from cron.job where jobname = ''escalate-urgent''';
    execute $job$select cron.schedule('escalate-urgent', '*/15 * * * *', 'select public.escalate_urgent_tickets()')$job$;
  end if;
end $$;