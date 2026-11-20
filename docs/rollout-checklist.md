# Rollout checklist: companies, demo and admin (for Samukelo)

Everything below is drafted and **not yet run**. Work in this order. Each step is done on a Supabase
**branch** first; only then on the live project. Samukelo owns migrations and approves each one.

## 1. Branch test

1. Create a Supabase branch of the live project.
2. Run `supabase/drafts/0028_platform_admins.sql`. Check: `select * from platform_admins;` returns no rows.
3. Run `supabase/drafts/0030_companies_foundation.sql`. Check: `select slug from companies;` shows `kopano`, and every row in `profiles` has a `company_id`.
4. Run `supabase/drafts/0030_companies_tests.sql`. Expected: the notice `PASS: all 4 cross-company checks held`. If any check fails, stop and tell the team; do not go on.
5. Run the rest in this order: 0029 (demo reset), 0031 (create company), 0032 (company settings), 0033 (platform company people).
6. On the branch, sign in as `staff@relay.test`, `agent@relay.test` and `manager@relay.test`. Each should see only Kopano.
7. Run the Supabase advisors (security and performance). Fix anything new before going live.

## 2. Live project (after the branch passes)

Same order as the branch: **0028, 0030, 0029, 0031, 0032, 0033, 0034, 0035.** (0034 and 0035 are independent of the others.) Rename each draft to
`supabase/migrations/00NN_<name>.sql` and paste its contents into the SQL Editor. Check each with a `select`.

- Renumber if another migration has landed first. The next free number is in AGENTS.md.
- 0030 gives every existing person Kopano as their company. That is intended.

## 3. Platform admin account

1. Add the account in Manage users, or create it in the dashboard. Give it two-step sign-in.
2. Its profile must have a `company_id` (Kopano), because the audit log needs one (0030, 0031).
3. `insert into public.platform_admins (user_id) values ('<the account id>');`
4. Sign in and open `/system`. Expected: the company list, counts, and a People link for each company.

## 4. Edge function and Vercel

1. Redeploy the `invite-user` Edge Function. It has the domain check (0032) and the platform email change (0033). Nothing changes until this is done.
2. Vercel, Production and Preview: check `CRON_SECRET` is set (the weekly summary and the demo reset use it).
3. Demo only: set `DEMO_ENABLED=true`, `DEMO_ACCOUNT_EMAILS` and the `DEMO_*` email and password pairs. Passwords go only in Vercel.
4. Company addresses: see step 5. Leave `RELAY_BASE_DOMAIN` blank until then.

## 5. Company addresses (P7)

1. Buy a domain you control (the default vercel.app address cannot have company subdomains).
2. In Vercel, add the domain and a wildcard `*.<domain>`. Point DNS at Vercel as Vercel shows.
3. Set `RELAY_BASE_DOMAIN=<domain>` for Production and Preview. Redeploy.
4. Check `kopano.<domain>` loads the sign-in page, and that a Kopano person can sign in there. Check that signing in from another company's address redirects to login.

## 6. Checks before saying it is done

- `npx tsc --noEmit` and `npm run lint` pass on `main`.
- A manager and a compliance account still get the two-step prompt (the company setting is on).
- The demo nightly reset runs at 02:17 SAST: check the first run in Vercel logs.
- The weekly summary still runs on its Monday schedule.
- Add the new migrations to the table in AGENTS.md, and the new audit actions to `docs/audit-actions.md`.

## Open items (not built)

- Demo: block profile and password changes; block outbound email; a daily cap on Gemini calls.
- Two-step for staff and agents: a team decision (every staff member would need an authenticator app).
- Email from the demo: a decision is needed (see docs/kopano-demo.md). Options: a fixed recipient list, email off for the demo, or a separate demo deployment.
