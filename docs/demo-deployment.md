# Separate demo deployment (plan)

**Status: decided (19 Nov 2026, option c). Plan only. Nothing here is set up yet.**

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
2. Run every migration on it, in the same order as the rollout checklist (`docs/rollout-checklist.md`), including the drafts that were renamed into `supabase/migrations/`.
3. Seed the demo: the templates (`supabase/seed/templates.sql`), the historical tickets (`supabase/seed/seed_historical.mjs`), and the scripted set through the reset function.
4. Create the eight demo accounts in that project and record their details only in the demo's Vercel settings.
5. Create a second Vercel project from the same repository. Give it only the demo's environment variables: `NEXT_PUBLIC_SUPABASE_URL` and key for the demo project, `CRON_SECRET`, `DEMO_ENABLED=true`, the `DEMO_*` pairs, `DEMO_ACCOUNT_EMAILS`, and `GEMINI_API_KEY` (a separate key). Leave out `RESEND_API_KEY`.
6. Check each role button on the demo address, the nightly reset in its logs, and that no email leaves the demo.
7. Make sure production has no `DEMO_ENABLED` and no demo variables.

## Decisions still needed

- The demo's address: `demo.<domain>` (needs the domain from the company-address step), or the vercel.app address for now.
- Whether the demo keeps the 15,579 historical tickets. This plan assumes yes.
- Who pays for the second Supabase project (it is a separate paid resource if the plan requires it).
