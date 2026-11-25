# Separate demo deployment (plan)

**Status (25 Nov 2026): set up.** The `relay-demo` Supabase project exists and runs, and it has its own Vercel project. Its migrations are not all in place yet: 0033, 0035 and 0036 are missing; 0028, 0029 and 0039 are present, and the escalation job runs (see [rollout-checklist.md](rollout-checklist.md), section 2). The steps below are the plan it was set up from. Use them as a reference, and check the status in the rollout checklist before changing anything.

## Why

The demo and the real company share one database, one email sender and one deployment. Nothing in the app can tell demo traffic from real traffic, so email and demo accounts can't be fully separated. A separate demo deployment separates them completely.

## Shape

| Part | Real Relay (production) | Demo |
| --- | --- | --- |
| Supabase project | The live project | A second project, used only for the demo |
| Vercel project | `relay` (as now) | A second Vercel project from the same GitHub repo, `relay-demo` |
| Branch | `main` | `main` (the same code; only the environment differs) |
| Address | `relay-gilt-nine.vercel.app`, later the company addresses | `demo.<domain>` (optional) or the demo project's vercel.app address |
| Demo sign-in | Off (`DEMO_ENABLED` unset) | On (`DEMO_ENABLED=true`) |
| Email | On, through Resend | Off: no `RESEND_API_KEY` in the demo project |
| Gemini key | The live key | A separate key, with the daily cap (`DEMO_GEMINI_DAILY_LIMIT`) |
| Nightly reset | Not used | 02:17 SAST, `/api/cron/reset-demo` |

## Changes to the code

- Hide the **Demo** link on production, so the public home page doesn't offer a button that does nothing. Show it only when `DEMO_ENABLED=true`.
- Once the demo is its own project, the `DEMO_ACCOUNT_EMAILS` two-step exemption and the demo email checks can stay as they are. They do no harm, and removing them can wait.

## Steps for Samukelo

1. Create a second Supabase project, `relay-demo`, in the same organisation.
2. Run every migration on it, in order, from 0001 to the latest (see AGENTS.md, section 5). Its migration history is currently empty, so record each one as it is run.
3. Seed the demo: the templates (`supabase/seed/templates.sql`), the historical tickets (`supabase/seed/seed_historical.mjs`), and the scripted set through the reset function.
4. Create the eight demo accounts in that project and record their details only in the demo's Vercel settings.
5. Create a second Vercel project from the same repository. Give it only the demo's environment variables: `NEXT_PUBLIC_SUPABASE_URL` and key for the demo project, `CRON_SECRET`, `DEMO_ENABLED=true`, the `DEMO_*` pairs, `DEMO_ACCOUNT_EMAILS`, and `GEMINI_API_KEY` (a separate key). Leave out `RESEND_API_KEY`.
6. Check each role button on the demo address, the nightly reset in its logs, and that no email leaves the demo.
7. Make sure production has no `DEMO_ENABLED` and no demo variables.

## Decisions still needed

- The demo's address: `demo.<domain>` (needs the domain from the company-address step), or the vercel.app address for now.
- Whether the demo keeps the 15,579 historical tickets. This plan assumes yes.
- Who pays for the second Supabase project (it is a separate paid resource if the plan requires it).
