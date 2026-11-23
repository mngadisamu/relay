# Setup guide

This guide is for running Relay, not for using it. For the step-by-step install on a Windows laptop (Node, Git, VS Code and Command Prompt), read [`GETTING_STARTED.md`](GETTING_STARTED.md) first. This page lists what the setup depends on.

## 1. Accounts and services

| Service | Used for | Set up by |
| --- | --- | --- |
| GitHub (`mngadisamu/relay`) | Code, pull requests, the required checks | Each team member |
| Supabase | Database, sign-in, the invite email function | Samukelo owns the project |
| Vercel (team "Team AI", project `relay`) | Hosting; a preview link for every pull request | Samukelo |
| Google AI Studio | The Gemini key for reply drafts | Baphakamise |

## 2. Environment variables

Copy `.env.example` to `.env.local` on your own computer. Never commit `.env.local`. Add the same values in Vercel for both **Production** and **Preview**.

| Name | Where it is used | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | App and scripts | The project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | App | The publishable key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Local scripts only (seed, demo reset) | Skips the database's access rules. Never in app code. |
| `GEMINI_API_KEY` | Server only | Never prefix with `NEXT_PUBLIC_`. |
| `CRON_SECRET` | Server only (Monday summary job) | Vercel sends it as the Bearer token. Must match the value set in migration 0019. |
| `RESEND_API_KEY` | Server only | Email notifications. Not switched on yet, so it can stay empty. |
| `RESEND_FROM` | Server only | Sender address on a domain verified in Resend. Needed with `RESEND_API_KEY`. |
| `APP_URL` | Server only | The live address, used for links in emails. |
| `NEXT_PUBLIC_DEMO_URL` | Public (not secret) | Live site only: shows the Demo button on the home page. |
| `NEXT_PUBLIC_HOME_URL` | Public (not secret) | Demo site only: sign-in pages link back to the live home page. |
| `RELAY_BASE_DOMAIN` | Server only | Company addresses such as `kopano.<domain>`. Leave blank unless the wildcard domain is set up. |
| `DEMO_ENABLED` | Server only | `true` turns the Kopano Freight demo on. Off by default. |
| `DEMO_*` (email and password pairs), `DEMO_ACCOUNT_EMAILS`, `DEMO_GEMINI_DAILY_LIMIT` | Server only | Demo sign-in details (one pair per role) and the daily AI draft limit (default 50). Values go only in Vercel. See `.env.example`. |

## 3. Supabase project settings

These are set in the Supabase dashboard, not in the code.

- **Authentication → Sign In / Providers:** "Allow new users to sign up" is off.
- **Authentication → Multi-factor:** authenticator-app sign-in is on. Managers and compliance officers need it (S4-17).
- **Authentication → URL Configuration:** the redirect URLs list `localhost:3000`, the live site and `https://relay-*.vercel.app/**`.
- **Edge Functions:** `invite-user` is deployed from `supabase/functions/invite-user/`.

The migrations in `supabase/migrations/` are run in the SQL Editor in order, from `0001` to the latest. The list is in `AGENTS.md`, section 5.

## 4. Test data

- **Historical tickets:** load once with `supabase/seed/seed_historical.mjs` (S1-17). It is safe to run twice.
- **Reply templates:** `supabase/seed/templates.sql`.
- **Demo set:** `scripts/reset-demo.mjs` puts the live demo tickets, approvals and replies back to one scripted set. It deletes the current live test requests, so ask the team before you run it on the live database.

Test accounts exist for each role (staff, agent, manager, compliance). Their passwords are shared privately by Samukelo and are never written in the code or the docs.

## 5. Running and checking

```
npm ci
npm run dev
```

Before a pull request is ready, these must pass (they are also required checks on GitHub):

```
npx tsc --noEmit
npm run lint
npm run build
```

`npm ci` installs the exact versions in `package-lock.json`. Use it rather than `npm install` after a pull.
