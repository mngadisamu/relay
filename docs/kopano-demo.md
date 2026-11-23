# Kopano Freight demo

**Status (23 Nov): running on the demo project (`relay-demo`).** The reset is migration 0031, and the demo sign-in buttons have been tested by the team. Checked on 23 Nov: the Gemini daily cap (0036) is **not** on the demo project, so the cap doesn't apply there yet. The company-creation function (0033) and the platform company functions (0035) are missing there too. Samukelo should check these before the showcase (see [rollout-checklist.md](rollout-checklist.md)).

## What it is

Kopano Freight is a fictional company, created for demonstrations. The demo gives a visitor one button per role. Pressing a button signs them in as that role, with no two-step sign-in, so every role can be tried straight away.

- Public page: `/demo` (linked from the home page as **Demo**).
- Roles: Staff; Agent (IT, HR, Finance, Operations); Department manager (Finance); General manager (company admin); Compliance.
- The live Kopano data is the demo data. The 15,579 historical tickets stay in the demo.
- A nightly reset runs at **02:17 South African time**. Vercel cron runs in UTC, so `vercel.json` uses `17 0 * * *` (00:17 UTC, which is 02:17 SAST, UTC+2 with no daylight saving).

## How sign-in stays safe

1. The browser sends only the role name (for example `agent-it`). It never receives an email or password.
2. `src/app/demo/actions.ts` (a server action) reads the email and password from server environment variables, signs in with Supabase, and redirects to the role's home page.
3. Demo sign-in is off unless `DEMO_ENABLED=true`.
4. Demo accounts skip the second step only when their email is listed in `DEMO_ACCOUNT_EMAILS`. This list is read on the server, in `src/lib/supabase/middleware.ts` through `isDemoAccount()` in `src/lib/demo.ts`.
5. Passwords are never written in code, docs or chat. They live only in Vercel and in each person's `.env.local`.

## What a demo visitor can and cannot do

| Allowed | Not allowed |
| --- | --- |
| Submit, read, reply to and close demo requests | Change their own profile or password (not yet blocked in the app; see the open items) |
| Use the Gemini drafting route (on Kopano data only) | Create new accounts |
| See the Kopano dashboard, reports and audit log | Send email outside the demo (see the open items) |

## Nightly reset

- `src/app/api/cron/reset-demo/route.ts` runs at 02:17 SAST. It checks `Authorization: Bearer $CRON_SECRET` and then calls `reset_demo_company(p_secret, p_staff_email)`.
- The function (migration 0031, `reset_demo_company`) deletes only live tickets (`is_historical = false`) and their child rows, children first. It then recreates the scripted set: a Finance purchase and a leave request waiting for approval, and an HR ticket with an AI draft waiting for an agent. It mirrors `scripts/reset-demo.mjs`.
- It uses the anon key plus `CRON_SECRET` (the same pattern as migration 0019). No service-role key is used in app code.
- With `DEMO_ENABLED` unset, the route does nothing.

## Environment variables

All are listed, blank, in `.env.example`:

- `DEMO_ENABLED`, `DEMO_ACCOUNT_EMAILS` (comma-separated demo emails)
- For each role: `DEMO_<ROLE>_EMAIL` and `DEMO_<ROLE>_PASSWORD` (roles: STAFF, AGENT_IT, AGENT_HR, AGENT_FINANCE, AGENT_OPERATIONS, DEPARTMENT_MANAGER, GENERAL_MANAGER, COMPLIANCE)

A role whose variables are missing shows as "(not set up yet)" and cannot be pressed.

## Steps to turn it on (after approval)

1. Samukelo checks the demo project has every migration it needs: 0030 to 0036 (see AGENTS.md section 5 for which are missing on the demo project).
2. Create the eight demo accounts in Supabase (Manage users or the dashboard). Record the emails and passwords only in Vercel's environment variables.
3. Set the variables in Vercel for Production and Preview, with `DEMO_ENABLED=true`.
4. Run `reset-demo.mjs` locally once to check the scripted set, or call the reset route once with `CRON_SECRET`.
5. Test each role button on the preview link, and check that a wrong password shows the "could not sign in" message.

## Guardrails

- **Password resets:** blocked for demo accounts in `src/lib/password-reset.ts`. The reply is the same as for any address.
- **Profile edits:** there is no page where a person edits their own profile. Managers can still change a demo person's email through Manage users; blocking that needs the demo list in the invite function (see below).
- **Email functions:** migration 0037 (`tighten_email_functions`) removes the public execute permission from the two email functions. It is present on live and demo.
- **Gemini cap:** demo accounts share a daily limit, `DEMO_GEMINI_DAILY_LIMIT` (default 50). Migration 0036 (`demo_gemini_cap`) is on live only. Over the limit, the template is used.

## Open items (not built)

- **Outbound email from the demo:** decided (option c): the demo gets its own deployment and database, with no email key. See `docs/demo-deployment.md`.
- _(Earlier options, kept for reference:)_ The demo and the real company share one database, one email sender and one deployment, so a recipient check can't tell them apart. Options: (a) send only to a fixed list of addresses, (b) switch email off for the demo's people, or (c) run the demo as its own deployment and database. Recommendation: (c), because it is the only full separation.
- Block demo accounts' email changes in the invite function (it needs the demo list, which lives in the app's environment).
