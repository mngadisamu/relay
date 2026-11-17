-- PostgreSQL (Supabase) migration. Use a PostgreSQL-aware SQL parser/editor.
-- S4-03: managers see only their own department's approvals.
-- DRAFT for Samukelo to review and run in the Supabase SQL Editor. Safe to run twice.
-- Why: migration 0020 let every manager read every approval. The story says a department
-- manager sees their department's approvals, and a general manager (no department) sees all.
-- Compliance still reads all, as it does for tickets.
-- Number: 0021 is reserved for the escalation schedule and 0022 is the sign-in security draft,
-- so this uses 0023. Confirm before committing.

drop policy if exists "Managers and compliance read approvals" on public.approvals;
create policy "Managers and compliance read approvals"
  on public.approvals for select to authenticated
  using (
    -- Compliance reads every approval.
    (select public.current_user_role()) = 'compliance'
    or (
      -- A manager reads approvals for their own department's tickets.
      (select public.current_user_role()) = 'manager'
      and (
        -- A general manager (no department) reads all of them.
        (select public.current_user_department()) is null
        or exists (
          select 1 from public.tickets t
          where t.id = approvals.ticket_id
            and t.department = (select public.current_user_department())
        )
      )
    )
  );

-- Verify after running (expect one row per policy, and the USING clause shows the department check):
--   select policyname, qual from pg_policies where tablename = 'approvals' and cmd = 'SELECT';

-- Rollback:
--   drop policy if exists "Managers and compliance read approvals" on public.approvals;
--   create policy "Managers and compliance read approvals" on public.approvals for select to authenticated
--     using ((select public.current_user_role()) in ('manager', 'compliance'));
