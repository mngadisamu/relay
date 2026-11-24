# AGENTS.md: context for AI assistants working on Relay

> **For the AI reading this:** you are helping one member of a four-person student team build Relay during the CAPACITI AI Bootcamp. Read this whole file before suggesting anything. It tells you what the project is, what already exists, what each person owns, the rules the team follows, and the mistakes already made. Then read the user's story in [`docs/sprints/SPRINT2_3_STORIES.md`](docs/sprints/SPRINT2_3_STORIES.md).
>
> **For a teammate using a chat AI** (ChatGPT, Gemini, Claude.ai and so on) that can't see the repo: paste this file into the chat, or attach it, together with `docs/sprints/SPRINT2_3_STORIES.md` and the contract your story uses (section 5), and then say which story you're working on. A starter prompt is at the end of this file.

Last updated: Mon 23 Nov 2026 (after Sprint 4). Checked against the live Supabase project and the `main` code on this date.

---

## 1. The project in one minute

**Relay** is an AI-powered internal help desk for **Kopano Freight**, a fictional Johannesburg logistics company (about 350 staff: head office, two depots, drivers). Staff send requests to HR, IT, Finance or Operations. Relay:

1. **Classifies** each request to a department (ML classifier), and marks **sensitive** requests with fixed rules. Sprint 1, plus a rule added in Sprint 2+3.
2. **Drafts a reply** with AI in a chosen tone, which an agent edits and sends. Sprint 1.
3. **Tracks the whole journey:** take, assign, confirm, close, reopen. Sprint 2+3 carry-over.
4. **Analytics dashboard, weekly reports, workload forecast, and AI risk and compliance** (audit log, flags, risk report). Sprint 2+3.
5. Workflow automation, approvals and the deployment showcase. Sprint 4.

The bootcamp runs **8 weeks**. Work is graded on technical delivery *and* professional skills (documentation, teamwork, presentation, responsible AI).

| Sprint | Dates | Modules | Status |
| --- | --- | --- | --- |
| 1 | 19–30 Oct 2026 | Ticket classification · AI response generator | Done |
| 2 + 3 | 2–13 Nov 2026 | Analytics dashboard · Automated reporting · Workload forecasting · AI risk and compliance | Done, with the open items in section 9 |
| 4 | 16–19 Nov 2026 (dates to confirm) | Routing and assignment · Approvals and sign-in security · Notifications and quality · Showcase and documentation | Built and merged. Migrations 0028 and 0029 (auto-assign and escalation) are **on the live database** (checked 25 Nov). Showcase and documentation in progress |

**Platform (added after Sprint 4):** several companies on one Relay (migrations 0030 to 0038). Platform admins create companies and add each company's first system admin from `/system`. Each person belongs to one company, and every page and function only shows that company's data. The live database holds eight companies: Kopano Freight, Capaciti, ALX, BUCO, ONOMO, Mbali INK, MIHLALI CO and CALTEX. Invite emails name the company, and the invite and password-reset emails are in `docs/email-templates/`.

Sprints 2 and 3 were combined into one two-week sprint by the programme.

- **Repo:** https://github.com/mngadisamu/relay
- **Live site:** https://relay-gilt-nine.vercel.app (auto-deploys on every merge to `main`)
- **Sprint plan:** `docs/sprints/Relay Sprint 2+3 Plan (1).docx` (every story by day, how to build it, and the Completion column). The same stories for AI tools: [`docs/sprints/SPRINT2_3_STORIES.md`](docs/sprints/SPRINT2_3_STORIES.md).

---

## 2. Team and ownership

**Respect ownership.** Help the user with *their* stories. Don't rewrite files another member owns. If their story needs a change in someone else's area, tell the user to agree it with that person first (a message is enough), and say so in the PR.

| Member | Sprint 2+3 feature | Owns (mainly) |
| --- | --- | --- |
| **Samukelo** (team lead, BA) | Platform, Sprint 1 carry-over, AI risk and compliance | `supabase/migrations/`, `src/lib/supabase/`, `src/lib/auth.ts`, `src/lib/sensitive.ts`, `src/middleware.ts`, login, home and role home pages, `src/app/compliance/`, `docs/` |
| **Elzel** | Workload forecasting | `data/`, `ml/`, `supabase/seed/`, `src/app/api/classify/`, `src/lib/classifier.ts`, `src/lib/forecast.ts`, the forecast screen |
| **Mihlali** | Analytics dashboard | Design system and shared UI (`src/components/ui/`, `StatusPill.tsx`), the staff pages (`src/app/staff/`), the dashboard, `src/lib/insights.ts` |
| **Baphakamise** | Automated reporting | Agent inbox, ticket view and template library (`src/app/agent/`), the AI drafting route, the reports pages and PDF |

**Shared files.** Announce changes before editing: `src/app/layout.tsx`, `src/app/globals.css`, `package.json` (adding packages), `src/components/RoleHome.tsx`, `src/lib/auth.ts`, `src/middleware.ts`. In **`src/lib/menus.ts`**, each owner only changes their own menu item (`ready: true` in the PR that adds the page).

**Database changes always go through Samukelo** as a new numbered migration (section 6).

**Review rotation** (one approval needed per PR): Samukelo → Elzel → Mihlali → Baphakamise → Samukelo. The arrow means "is reviewed by". Samukelo also reviews every migration.

---

## 3. Tech stack (use these exact versions)

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | **Next.js 15.5** (App Router), **React 19**, **TypeScript** | `src/` directory, import alias `@/*` → `src/*`. Install with `npm ci` so everyone gets exactly these versions. |
| Styling | **Tailwind CSS v4** with **shadcn/ui** | Relay's colours are in `globals.css` (`text-ink`, `text-ink-2`, `text-muted`, `bg-page`, `border-line`, `bg-brand`, `bg-navy`…); shadcn components are in `src/components/ui/`. Don't use Tailwind's default `slate-*` or `blue-*` colours. |
| Database and auth | **Supabase** (Postgres + Auth) via `@supabase/ssr` 0.12 and `@supabase/supabase-js` 2.x | Email and password sign-in. Row-level security (RLS) is on for every table. |
| Hosting | **Vercel** (team "Team AI", project `relay`) | Env vars set in Vercel for Production **and** Preview. Every PR gets a preview link. |
| Checks | **GitHub check** (`.github/workflows/check.yml`) and the **Vercel build** | Both run on every PR and are **required**: lint, type-check and build must pass before a PR can be merged. |
| ML classifier | TF-IDF + logistic regression, trained in **Google Colab** (Python/scikit-learn), exported to **JSON**, run in TypeScript on the server | No Python server in production |
| Generative AI | **Google Gemini API** via `@google/genai`, model `gemini-3.6-flash` | Key is server-side only (`GEMINI_API_KEY`). Sensitive requests are never sent to it (section 5). `gemini-2.5-flash` is closed to new keys (404): don't use it. |

**Environment variables** (`.env.example` lists them; values live in each person's `.env.local` and in Vercel, and are **never committed**):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Supabase "publishable" key
SUPABASE_SERVICE_ROLE_KEY=          # Supabase "secret" key: bypasses RLS, local seed script ONLY, never app code
GEMINI_API_KEY=                     # server only, never prefix with NEXT_PUBLIC_
CRON_SECRET=                        # Monday summary job: Vercel sends it as the Bearer token. Server only
RESEND_API_KEY=                     # email notifications (not switched on yet). Server only
RESEND_FROM=                        # sender address on a domain verified in Resend. Server only
APP_URL=                            # live address, used for links in emails
NEXT_PUBLIC_DEMO_URL=               # live site only: shows the Demo button on the home page
NEXT_PUBLIC_HOME_URL=               # demo site only: where sign-in pages send people back to
RELAY_BASE_DOMAIN=                  # company addresses (kopano.relay.example); blank = off. Server only
DEMO_ENABLED=                       # true turns the demo on. Demo sign-in details are DEMO_* variables, server only
```
The `DEMO_*` email and password pairs and `DEMO_GEMINI_DAILY_LIMIT` (default 50) are listed in `.env.example`. Never commit their values.

---

## 4. What exists on `main` right now

```
src/
├── middleware.ts                 Runs before every page: refreshes the session, sends signed-out users to /login
├── lib/
│   ├── auth.ts                   Role type, HOME_FOR_ROLE map, getCurrentProfile(), requireRole()
│   ├── classifier.ts             The trained classifier, run in TypeScript (S1-21)
│   ├── accuracy.ts                   Forecast backtest against "same as last week" (S2-17)
│   ├── bias-test-doc.ts              Bias test text, generated from docs/responsible-ai/bias-test.md (S2-31)
│   ├── flag-actions.ts               Flag and resolve actions for replies (S2-26)
│   ├── flags.ts                      Which sent replies compliance should look at (S2-26)
│   ├── forecast.ts                   Workload forecast: forecast() and forecastRange() (S2-08, S2-13)
│   ├── insights.ts                   Weekly AI summary: numbers only go to Gemini (S2-28)
│   ├── mfa.ts                        secondStepMissing(): the second-step check for /api routes (S4-17)
│   ├── notify.ts                     sendNotification(): email through Resend, notices table as fallback (S4-10). Not wired in yet
│   ├── password-reset.ts             "Choose a new password" emails (S2-36)
│   ├── risk.ts                       Risk report numbers, shared by the page and its PDF (S2-30)
│   ├── staffing.ts                   Date helpers: Monday of the week, short dates
│   ├── templates.ts                  Built-in fallback reply templates (S1-04)
│   ├── utils.ts                      cn() class-name helper for shadcn/ui (S1-12)
│   ├── sensitive.ts              Sensitive request rules: five kinds, their department and priority (migration 0009)
│   ├── menus.ts                  Manager and compliance menus; each item is ready: true once its page is merged
│   ├── daily-history.ts          loadDailyHistory(): past tickets per day, for the forecast (migration 0010)
│   ├── reply-templates.ts        Loads reply templates from the database (S1-27); templates.ts is the fallback text
│   └── supabase/                 createClient() for the browser (client.ts), the server (server.ts) and middleware
├── components/
│   ├── AgentHeader.tsx           Agent top bar: Inbox, Templates
│   ├── AuthShell.tsx                 Look of the pages seen before sign-in (S2-36)
│   ├── FlagReply.tsx                 Tag for a flagged reply, in text and icon (S2-26)
│   ├── PageSkeleton.tsx              Grey placeholder shown while a page loads (loading.tsx)
│   ├── RoleHeader.tsx            Manager and compliance top bar (S2-02); pass current="/path" on each page
│   ├── RoleHome.tsx              Manager and compliance home: a card per menu item (S2-02)
│   ├── AiNote.tsx                The AI transparency note: routing, draft, summary, forecast (S2-07)
│   ├── StatusPill.tsx            Status, priority, Needs review and Sensitive tags
│   ├── BrandMark.tsx, NavigationProgress.tsx, RoutingIllustration.tsx (public home page)
│   └── ui/                       shadcn/ui: button, card, input, label, textarea
└── app/
    ├── page.tsx                  Public home page (S2-02)
    ├── login/                    Sign-in form and the signIn() / signOut() server actions
    ├── mfa/                      Two-step sign-in: set up the app and enter a code (S4-17)
    ├── welcome/, reset-password/, forgot-password/, auth/   Invite, password and expired-link pages (S2-25, S2-36)
    ├── home/page.tsx             Redirects a signed-in user to their role's home
    ├── staff/                    Submit a request (priority, sensitive rule) · My requests · request detail with status history
    ├── agent/                    Inbox (Mine filter, Assigned to; managers see it as Tickets) · ticket view (take, assign,
    │                             confirm, move, AI draft, send) · template library
    ├── manager/                  Manager home · dashboard · forecast (S2-27) · approvals (S4-08) · reports · Manage users (S2-25)
    ├── compliance/               Compliance home · audit log (S2-12) · Flagged replies (S2-26) · Risk report and PDF (S2-30)
    ├── system/                   Platform admin: Companies list and create (name, slug, first system admin) · company page with people tabs and "Invite a system admin" · person edit (`SystemShell`, Relay layout)
    ├── demo/                     Demo sign-in page (S4-14). Off unless `DEMO_ENABLED=true`; passwords are read on the server only
    ├── auth/confirm, auth/link-expired   Invite and password link landing pages (S2-25, S2-36)
    ├── lib/platform.ts           Platform admin menu (`SYSTEM_MENU`) and platform helpers
    ├── lib/company-host.ts       Which company a visit is for, from its address (`kopano.<RELAY_BASE_DOMAIN>`); off while `RELAY_BASE_DOMAIN` is blank
    ├── lib/demo.ts               The demo company's roles and sign-in details (server only)
    └── api/                      classify (S1-21) · generate-draft (AI drafts; skips Gemini for sensitive tickets) · reports (list, generate, PDF) · cron/weekly-summaries (Monday job, CRON_SECRET). Routes that managers use check the second step
supabase/migrations/              Applied in order in the Supabase SQL Editor (section 5)
supabase/functions/invite-user/   Edge Function that sends Manage users invites (deployed in the Supabase dashboard; Deno, not Next.js)
supabase/seed/                    templates.sql (reply templates) · seed_historical.mjs (the year of past tickets)
ml/notebooks/                     relay_classifier.ipynb (training) · S2-03_daily_history.ipynb (daily counts for the forecast)
ml/model/                         classifier-model.json and its results
data/processed/                   combined_tickets.csv (the past tickets) · daily_counts.csv (per day per department)
docs/                             architecture.md · audit-actions.md · metrics.md · forecast.md · report-template.md · security.md · responsible-ai/ (risk register, POPIA note, prompt notes, bias tests) · design/ · sprints/
```

**Public paths** (no sign-in needed): `/`, `/login`, `/forgot-password`, `/auth/confirm` and `/auth/link-expired` (the invite and password links, S2-25 and S2-36), and everything under `/api`. Every other path requires sign-in (`src/lib/supabase/middleware.ts`, `PUBLIC_PATHS`). **A route under `/api` must check who is calling itself** (section 6).

**Test accounts** in Supabase (passwords are shared privately by Samukelo; **never put them in code, docs or chat logs**):

| Account | Role |
| --- | --- |
| `staff@relay.test`, `staff2@relay.test` | Staff |
| `agent@relay.test` | Agent, IT |
| `manager@relay.test` | Manager with no department (a general manager: sees and acts on every department) |
| `compliance@relay.test` | Compliance |

Need an agent for HR, Finance or Operations, or a department manager? Ask Samukelo.

**Accounts and roles:** there is **no sign-up page**, and public sign-up is switched off in Supabase. A manager adds people on **Manage users** (`/manager/users`, S2-25): the person gets an invite email, its link opens `/auth/confirm`, and they choose a password on `/welcome`. The invite is sent by the Supabase Edge Function `supabase/functions/invite-user` (it holds the secret key inside Supabase, so the key never enters Relay's code). People who leave are **removed, not deleted** (S2-35, "Remove from Relay"): they can't sign in, but their name stays on their tickets, replies and audit entries. A department manager removes staff and their own department's agents; a general manager removes anyone; nobody removes themselves, and there is always at least one general manager. When listing people to pick from (e.g. Assign), add `.eq("active", true)`. **Forgot your password** (`/forgot-password`) emails a link that opens `/reset-password`; managers can send the same link, and edit a person's name, email and depot, on Manage users (S2-36). Every page before sign-in uses `AuthShell` (`src/components/AuthShell.tsx`). Relay's email designs are in `docs/email-templates/`. Don't build a sign-up page. A department manager adds and changes only agents of their own department (migration 0025); the `invite-user` function checks this before an invite is sent.

**Data in Supabase:**
- **15,579 past tickets** (`is_historical = true`), 19 Oct 2025 to 18 Oct 2026, about 3,900 per department, loaded by `supabase/seed/seed_historical.mjs` (S1-17). They feed the dashboard, reports and forecast. Their dates, depots and priorities were **assigned** with a realistic pattern, not recorded (see `data/README.md`).
- **Live tickets** (`is_historical = false`): the team's test requests. Inboxes and My requests show **only live tickets** (`.eq("is_historical", false)`).

---

## 5. Database (Supabase Postgres)

**Enums:** `user_role` = staff, agent, manager, compliance · `department` = HR, IT, Finance, Operations · `ticket_status` = received, assigned, answered, closed · `ticket_priority` = low, medium, high, urgent · `reply_tone` = formal, friendly, urgent

### Migrations

| File | What it does | Owner |
| --- | --- | --- |
| `0001_initial_schema.sql` | All tables and enums; RLS switched on | Samukelo |
| `0002_profiles_on_signup.sql` | New account → profile row (role staff); read your own profile | Samukelo |
| `0003_tickets_privacy.sql` | Who reads and creates tickets; `current_user_role()` and `current_user_department()` helpers | Samukelo |
| `0004_team_policies.sql` | Rules for ticket updates, classifications, templates, responses, audit log; `reroute_ticket()` | Samukelo |
| `0005_ticket_submitter.sql` | `ticket_submitter()`: agents see a sender's name, email and depot | Samukelo |
| `0006_ticket_lifecycle.sql` | `assigned_to`, `ticket_messages`, assign / confirm / close / reopen functions, profile rules, SAST references | Samukelo |
| `0007_metrics.sql` | `dashboard_metrics()` and the `insights` table | Mihlali |
| `0008_reports.sql` | The `reports` table (S2-10) | Baphakamise |
| `0009_sensitive_requests.sql` | `is_sensitive`, `sensitive_kind`, and "Sensitive" templates for HR, IT and Operations | Samukelo |
| `0010_daily_ticket_counts.sql` | `daily_ticket_counts()`: tickets per day per department, counted in SQL, for the forecast | Samukelo |
| `0010_weekly_reports_schedule.sql` | **Replaced by 0018. Do not run.** Its Monday function wrote columns the `reports` table doesn't have. | Baphakamise |
| `0011_flags.sql` | The `flags` table; `flag_reply()` and `resolve_flag()` (S2-26) | Samukelo |
| `0012_manage_users.sql` | `list_people()` and `set_user_role()` for Manage users (S2-25) | Samukelo |
| `0013_deactivate_users.sql` | `profiles.active`; `deactivate_user()` and `reactivate_user()`; removed people get no role in the rules and can't be assigned (S2-35) | Samukelo |
| `0014_risk_metrics.sql` | `risk_metrics()`: the Risk report's numbers, counted in SQL (S2-30) | Samukelo |
| `0015_user_details_and_reset.sql` | `update_user_details()`, `can_manage_user()`, `reset_email_for()` (S2-36) | Samukelo |
| `0016_risk_ai_unavailable.sql` | `risk_metrics()` counts drafts where Gemini didn't answer (`ai_unavailable`) and sensitive requests kept from Gemini (`sensitive_kept`) (S2-30) | Samukelo |
| `0017_summary_periods.sql` | Weekly AI summaries saved per period and department (S2-28, S2-33) | Baphakamise |
| `0018_weekly_reports_schedule_fix.sql` | Replaces `generate_weekly_reports()` with the columns `reports` has, and schedules it for Mondays 08:00 SAST via pg_cron (S2-34) | Baphakamise, reviewed by Samukelo |
| `0019_weekly_summaries_schedule.sql` | `cron_secret` and the secret-checked functions the Monday summary route uses (S2-34) | Baphakamise, reviewed by Samukelo |
| `0020_request_types_and_approvals.sql` | Request types, amounts, the awaiting-approval status and the approval rules (S4-01, S4-03) | Samukelo |
| `0021_notices.sql` | In-app notices, the fallback for email notifications (S4-10). Run on the live database (checked 18 Nov) | Samukelo |
| `0022_security_hardening.sql` | Closes functions signed-out visitors could call, and fixes a search path (security advisor, 16 Nov) | Samukelo |
| `0023_approvals_department_scope.sql` | Managers read only their own department's approvals (S4-03) | Samukelo |
| `0024_department_scope_everywhere.sql` | A department manager sees only their own department's tickets, and its agents and managers (16 Nov) | Samukelo |
| `0025_department_scope_people_reports.sql` | Department scope for people lists, role changes, reports, insights, the audit log and self-assignment (17 Nov) | Samukelo |
| `0026_risk_department_scope.sql` | The risk report counts only a department manager's own department (17 Nov) | Samukelo |
| `0027_notifications.sql` | Notices only through `notify_ticket_event()`; the email outbox and its secret-checked send functions (S4-10). Run on the live and demo databases (checked 23 Nov) | Samukelo |
| `0028_auto_assign.sql` | `auto_assign_ticket()`: a new ticket goes to the least-busy active agent in its department (S4-05). Sensitive tickets stay unassigned. On the live database (checked 25 Nov). Demo: present | Samukelo |
| `0029_escalation.sql` | `escalate_urgent_tickets()` and its pg_cron job every 15 minutes (S4-06). On the live database, with its pg_cron job `escalate-urgent` running every 15 minutes (checked 25 Nov). Demo: function present (check its job is scheduled) | Samukelo |
| `0030_platform_admins.sql` | `platform_admins` table, `is_platform_admin()` and `system_summary()` (platform admin area). Live and demo | Samukelo |
| `0031_demo_reset.sql` | `reset_demo_company()`: resets the demo company. Live and demo | Samukelo |
| `0032_companies_foundation.sql` | `companies` table, `company_id` on the tables, the "Same company only" row rules, `current_user_company()`, `kopano_company_id()`. Live and demo | Samukelo |
| `0032_companies_tests.sql` | Checks for 0032. Test script, not a schema change | Samukelo |
| `0033_create_company.sql` | `create_company()`: a platform admin creates a company (the invite of its first system admin goes through `invite-user`). Live only; **not on the demo database** | Samukelo |
| `0034_company_settings.sql` | `company_depots` table and `save_company_settings()` (depots and allowed email domains, general managers only). Live and demo | Samukelo |
| `0035_platform_company_users.sql` | Platform admin reads and edits people and depots in any company: `platform_list_companies()`, `platform_list_company_people()`, `platform_company_depots()`, `platform_update_person()`. Live only; **not on the demo database** | Samukelo |
| `0036_demo_gemini_cap.sql` | `demo_gemini_usage` table and `use_demo_gemini_call()`: a daily cap on AI drafts in the demo. Live only; **not on the demo database** | Samukelo |
| `0037_tighten_email_functions.sql` | Tightens the email outbox functions (`take_pending_emails()`, `mark_emails_sent()`). Functions present on live and demo | Samukelo |
| `0038_people_company_scope.sql` | `list_people()` only lists the caller's own company (and, for a department manager, their department). Applied on live (20 Nov) | Samukelo |
| `0039_company_scoped_jobs_and_grants.sql` | Company-scoped `dashboard_metrics`, scheduled summaries and reports (unique per company); company checks in auto-assign, escalation and notifications; grant hardening. Tested on the demo project in a rolled-back transaction. **Not yet applied to demo or live: awaiting review.** | Samukelo |

The next free number is **0040**. Ask Samukelo before writing one.

**Database check, 25 Nov:** the live project (`krxzxwulkdxhirgarkwa`) has every function the code calls, including `auto_assign_ticket`, and the escalation job is scheduled. The demo project (`bkdqnndsevayxpjckubw`) is missing `create_company`, `use_demo_gemini_call` and the platform company functions from 0035, so the platform admin area won't work there yet. Its migration history is empty, so it was set up by hand. Samukelo should check both projects before the showcase.

### Tables

| Table | Key columns | Notes |
| --- | --- | --- |
| `profiles` | `id` (= auth user id), `full_name`, `role`, `department`, `depot`, `created_at`, `active`, `deactivated_at`, `deactivated_by` | Created automatically when an account is added (role `staff`). Agents and managers have a `department`; a manager without one is a general manager. `active = false` means they left (S2-35): never delete a profile, their history needs it. |
| `tickets` | `id`, `reference` (auto, SAST date, e.g. `KF-261105-0042`), `submitted_by`, `subject`, `description`, `depot`, `department`, `priority`, `status`, `needs_review`, `is_sensitive`, `sensitive_kind`, `is_historical`, `assigned_to`, `created_at`, `assigned_at`, `answered_at`, `closed_at` | Always set the matching timestamp when status changes (the lifecycle functions do it for you). |
| `classifications` | `ticket_id`, `predicted_department`, `confidence` (0–1), `model_version`, `overridden_by`, `overridden_department`, `confirmed_by`, `confirmed_at`, `created_at` | Keep every decision; never overwrite. `predicted_department` is the model's own choice, even when the sensitive rule sent the ticket elsewhere. |
| `templates` | `department`, `name`, `body`, `updated_by`, timestamps | Formal, Friendly, Urgent per department (the AI picks the one matching the tone), plus "Sensitive" for HR, IT and Operations |
| `responses` | `ticket_id`, `template_id`, `tone`, `ai_draft`, `final_text`, `ai_generated`, `sent_by`, `sent_at` | Store the AI draft *and* what the agent actually sent |
| `audit_log` | `actor`, `action`, `ticket_id`, `details` (jsonb) | Every action is listed in [`docs/audit-actions.md`](docs/audit-actions.md) |
| `ticket_messages` | `ticket_id`, `author`, `body`, `created_at` | A staff member's "I still need help" message (S2-20). Added only through `reopen_ticket()`. |
| `insights` | weekly AI summaries | Written by S2-28, reused by reports (0007) |
| `reports` | `department`, `week_start`, `metrics`, `ai_summary`, `forecast` | Saved weekly reports (0008) |
| `flags` | `response_id`, `ticket_id`, `kind` (`sent_without_edits`, `invented_detail`, `person`), `source` (`auto`, `person`), `note`, `flagged_by`, `resolved_by`, `resolved_at`, `outcome` (`ok`, `needs_change`), `resolution_note` | AI replies marked for a second look (0011). Added only through `flag_reply()`, resolved only through `resolve_flag()` |
| `approvals` | `ticket_id`, `requested_by`, `approver`, `decision`, `decision_note`, `decided_at` | Sprint 4: one pending decision per ticket (S4-02, S4-03) |
| `notices` | in-app notices for ticket events | Sprint 4 (0021, 0027). Written only by `notify_ticket_event()` |
| `email_outbox` | emails waiting to be sent, read and marked sent by secret-checked functions | Sprint 4 (0027, S4-10). Emails are not switched on until `RESEND_API_KEY` is set |
| `companies` | one row per company: `name`, `slug`, `allowed_domains`, `require_two_step` | Platform (0032). Every company table carries `company_id` |
| `company_depots` | a company's depots | Platform (0034) |
| `platform_admins` | who may act across companies | Platform (0030). Read only by the platform functions |
| `demo_gemini_usage` | the daily count of AI drafts in the demo | Platform (0036). Live only |

### Who can do what (row-level security)

RLS is **on** for every table. These rules are the whole permission model. If a query returns **no rows or a "row-level security" error**, check this table first.

| Table | Read | Create | Update |
| --- | --- | --- | --- |
| `profiles` | own row · compliance and general manager: all · department manager: their department's agents and managers (0025) · agents: people in their own department (0006). Agents get a ticket sender's name, email and depot through `supabase.rpc("ticket_submitter", { p_ticket_id })` (0005) | automatic when an account is added (trigger) | only through `supabase.rpc("set_user_role", { p_user_id, p_role, p_department })` (0012): managers, never their own role; a department manager only staff and their own department's agents |
| `tickets` | staff: own · agents: own department · compliance and general manager: all · department manager: their department (0024) | anyone signed in, only with `submitted_by = auth.uid()` | agents: own department, and the ticket must stay in it · managers: all (a department manager: their department only, 0024). Prefer the lifecycle functions below. |
| `classifications` | anyone who can see the ticket | anyone who can see the ticket (the submitter saves it on submit) | agents, managers: record an override (`overridden_by` = themselves) |
| `templates` | agents, managers, compliance (**not** staff) | agents: own department · managers: any | agents: own department · managers: any |
| `responses` | agents, managers, compliance on visible tickets · **staff only once `sent_at` is set** (never unsent drafts) | agents, managers, on visible tickets | agents, managers |
| `audit_log` | compliance and general manager: all · department manager: their own actions and their department's tickets (0025) | anyone signed in, only with `actor = auth.uid()` | nobody (append-only) |
| `ticket_messages` | anyone who can see the ticket | only through `reopen_ticket()` | nobody |
| `insights` | managers: their department (general manager: all, 0025) | same | same |
| `reports` | managers: their department (general manager: all, 0008, 0025) | same | same |
| `flags` | agents, managers, compliance, on tickets they can see (never staff) | only through `supabase.rpc("flag_reply", { p_response_id, p_kind, p_note })` (0011) | only through `supabase.rpc("resolve_flag", { p_flag_id, p_outcome, p_note })`, compliance only |
| `approvals` | managers and compliance (department scope, 0023); the requester reads their own | only through `request_approval()`, called by the person who submitted the request | only through `decide_approval()`: a manager of the department (or a general manager), never the requester |
| `companies` | people in their own company, and platform admins (live policy "Members read their company") | nobody directly: only through `create_company()` (platform admin, 0033) | nobody directly: only through `save_company_settings()` (0034) |
| `company_depots` | people in their own company | people in their own company (live policy "Same company only") | people in their own company (same policy). Prefer `save_company_settings()` |
| `platform_admins` | nobody directly (no policy; read only by the platform functions, 0030) | nobody directly: added by hand in the SQL Editor (the first platform admin) | nobody directly |
| `notices` | the person it is for (their own notices), and the company's rows only (the "Same company only" policy is restrictive, checked 25 Nov) | people in their own company (same policy). Intended: only `notify_ticket_event()` | people in their own company (same policy). Intended: only the person it is for, to mark it read |
| `email_outbox` | people in their own company (same policy). Only the secret-checked functions in 0027 and 0037 write it (checked 25 Nov: no direct writes) | people in their own company (same policy). Intended: only `notify_ticket_event()` | people in their own company (same policy). Intended: only `mark_emails_sent()` |
| `demo_gemini_usage` | nobody directly (no policy); only `use_demo_gemini_call()` (0036) | nobody directly | nobody directly |

### The four contracts (agreed shapes other stories build against; change them only after agreeing it with the team)

1. **Lifecycle** (migration 0006, Samukelo). Use these functions, never a plain update: each one checks who is calling and writes its audit entry.
   ```ts
   await supabase.rpc("assign_ticket", { p_ticket_id: id });                     // agent: Take ticket (own department, for themselves)
   await supabase.rpc("assign_ticket", { p_ticket_id: id, p_agent: agentId });   // manager: Assign to an agent of that department
   await supabase.rpc("confirm_department", { p_ticket_id: id });                // agent or manager: "Department is correct"
   await supabase.rpc("close_ticket", { p_ticket_id: id });                      // sender ("This solved it"), agent or manager; Answered tickets only
   await supabase.rpc("reopen_ticket", { p_ticket_id: id, p_message: text });    // sender only ("I still need help"); Answered tickets only
   await supabase.rpc("reroute_ticket", { p_ticket_id: id, p_department: "HR" }); // agent or manager: move to another department (0004)
   ```
   **Who does what:** agents take tickets in their own department; a department manager assigns, confirms and closes in their department only; a general manager can do so everywhere; managers still read every ticket. **Only the assigned agent (or a manager, once it's assigned) can send a reply**, checked in the reply box and in `sendReply`.
2. **Metrics** ([`docs/metrics.md`](docs/metrics.md), migration 0007, Mihlali): `supabase.rpc("dashboard_metrics", { p_from, p_to, p_department })` returns the dashboard's JSON (cards, weekly, daily…). It runs as the caller, so the ticket rules decide what each person sees.
3. **Audit actions and AiNote** ([`docs/audit-actions.md`](docs/audit-actions.md), Samukelo): every audit action and what goes in `details`; add new actions there in the same PR. Every piece of AI output shows `<AiNote kind="routing" confidence={c} />`, `"draft"`, `"summary"` or `"forecast"`.
4. **Forecast** ([`docs/forecast.md`](docs/forecast.md), Elzel): `forecast(department, history, asOf?)` and `forecastRange()` in `src/lib/forecast.ts`. They learn from the **past tickets only**, take the history and `asOf` as inputs (no clock), and use the last **14 days** of history plus a month-end factor from the 25th. The manager's forecast page loads the history with `loadForecastHistory(supabase, department, today)` from `src/lib/daily-history.ts`, which calls `dashboard_metrics()`. The contract is in [`docs/api-reference.md`](docs/api-reference.md).

### Sensitive requests (migration 0009, `src/lib/sensitive.ts`)

Every new request is checked with plain word rules (not the AI model), which set `tickets.is_sensitive` and `sensitive_kind`:

| Kind | For example | Goes to | Lowest priority |
| --- | --- | --- | --- |
| `conduct` | harassment, bullying, discrimination, threats | HR | High |
| `wellbeing` | self-harm, suicidal thoughts, domestic violence | HR | Urgent |
| `incident` | injury, accident, hijacking, robbery, collision, spill, drunk driving | the AI's choice (usually Operations) | Urgent |
| `security` | hacked account, lost or stolen device, phishing | IT | High |
| `personal` | health, pregnancy, bereavement, disciplinary, dismissal | HR | the person's choice |

A sensitive ticket's text is **never sent to Gemini** (the draft route uses the department's "Sensitive" template instead), and **its reply can't be sent unchanged** (checked in the reply box and in `sendReply`). Keep these rules when you touch the submit action, the draft route or the reply box. To add words, add them to the rule, then send a sample request of that kind and an everyday request with a similar word, and check only the first is marked.

### Other rules for code that touches the database

- **Payroll belongs to HR** (decided Thu 5 Nov): tax deductions and salary banking details are HR requests, so the classifier sending them to HR is correct.
- **AI drafts are created by the agent** (when they open a ticket or click "Write a new AI draft"). Staff can't insert into `responses`.
- **Saving a classification** (S1-21): insert it right after inserting the ticket, in the same server action, as the submitting user.
- **Audit entries:** always set `actor` to the signed-in user's id.
- **Supabase returns at most 1,000 rows per request**, and the Table Editor's export stops short too. Don't fetch thousands of tickets to count them in the app: count in SQL (a database function) and fetch the result.
- Need a permission that isn't here? Ask Samukelo for a new migration. Don't turn RLS off, and **never use the secret (service-role) key in app code**.

---

## 6. How to write code here (conventions)

- **Supabase client:** `createClient` from `@/lib/supabase/server` in server components, server actions and route handlers; from `@/lib/supabase/client` only in `"use client"` components. Create it **inside** the function, never at the top of a file. **Never** use `SUPABASE_SERVICE_ROLE_KEY` in app code; the only exception is the local seed script.
- **Who is signed in:** `getCurrentProfile()` from `@/lib/auth` returns `{ id, email, fullName, role, department }` or `null`. Protect a page with `await requireRole([...])` at the top; it returns the profile. A page that needs `requireRole` must be a **server** page; put interactive parts in a separate `"use client"` component.
- **Routes under `/api` are public** (the middleware lets signed-out people through), so every route handler starts with `getCurrentProfile()` and checks the role before doing anything. A server action next to the page is usually simpler than an `/api` route.
- **Forms:** server actions (`"use server"` in an `actions.ts` next to the page), with `useActionState` in the client form. See `src/app/login/` as the reference pattern.
- **Pages for managers and compliance** live under `/manager/...` or `/compliance/...`, use `<RoleHeader … current="/manager/your-page" />`, and set their item to `ready: true` in `src/lib/menus.ts`.
- **Redirects:** redirect **straight to the final page**. A server action that redirects to a page that redirects again made sign-in take ~40 s (S1-09).
- **Times:** stored in UTC; always shown in **South African time** (`timeZone: "Africa/Johannesburg"`, see `formatWhen()` in `src/app/staff/status.ts`). Never use `timezone('Africa/Johannesburg', now())` as a column default: it saves times 2 hours wrong. Use `default now()`.
- **Secrets:** API keys only in server code. Nothing secret gets a `NEXT_PUBLIC_` prefix.
- **AI output must be labelled** (`AiNote`) and editable by a person before it counts. Store both the draft and the final text.
- **Accessibility (WCAG 2.1 AA):** every input has a `<label htmlFor>` matching its `id`; status is shown in **text and colour**, not colour alone; errors use `role="alert"`; screens work at **360 px** width.
- **Database changes:** never edit a migration that has been run. Add the next numbered file in `supabase/migrations/`, with comments explaining each part, safe to run twice where possible (`if not exists`), and run it in the Supabase SQL Editor. Samukelo owns migrations.
- **Comments:** short and plain, explaining *why*. The team is learning, and the code will be presented to a panel.
- **Before saying "done":** `npx tsc --noEmit` and `npm run lint` pass, and each Given / When / Then scenario has been tested by hand.

### Classify API contract (agreed; don't change the shape)

```
POST /api/classify
Request:  { "subject": string, "description": string }
Response: { "department": "HR" | "IT" | "Finance" | "Operations",
            "confidence": number,      // 0 to 1
            "needsReview": boolean,    // true when confidence < 0.6
            "modelVersion": string }   // e.g. "tfidf-logreg-v2"
```
The submit form calls `classify()` from `src/lib/classifier.ts` directly (faster than calling the route), then applies the sensitive rule.

---

## 7. Team workflow (Git and GitHub)

1. `git checkout main`, then `git pull`. **Always start from the latest `main`**: a branch made from an old `main` brings back old code and conflicts.
2. `git checkout -b feature/S2-xx-short-name` (or `fix/`, `docs/`)
3. Build and test locally (`npm run dev`, http://localhost:3000)
4. `git status`: check only your story's files changed (restore `tsconfig.json` or `package.json` if they changed by themselves)
5. `git add` the files, then `git commit -m "S2-xx What changed"` (story ID first)
6. `git push -u origin feature/S2-xx-short-name`, then open a pull request and fill in the template
7. Both checks (GitHub and Vercel) must be green; the reviewer tests the **Vercel preview link** against the acceptance criteria and approves
8. **Squash and merge**, delete the branch, mark the story Done in the sprint plan

`main` is protected: no direct pushes, one approval, and both checks required. **Push your branch every day**, even unfinished.

---

## 8. How to help this user (read carefully)

- **They're learning.** Explain *what* and *why* in plain language, one step at a time, and wait for them to confirm before the next step. Prefer complete, copy-paste-ready files over partial snippets, and say exactly which folder and file name to use.
- **Windows and Command Prompt.** The team uses Windows laptops. Give commands for **Command Prompt (cmd)**, **one per code block**, so they can be run one line at a time. Don't use PowerShell syntax or `&&` chains.
- **Stay in scope.** Build only what the user's story and its acceptance criteria ask for. Name later stories rather than building them early.
- **Check before you claim.** If you can't run the code, say what to test and what the expected result looks like.
- **Never** ask the user to paste secret values into the chat, and never put keys or passwords in files that get committed.

### Problems the team has already hit (save them the time)

| Symptom | Cause and fix |
| --- | --- |
| `npm.ps1 cannot be loaded because running scripts is disabled` | VS Code terminal is PowerShell. Switch the default profile to **Command Prompt** (terminal **⌄** → *Select Default Profile*). |
| Prompt shows `C:\WINDOWS\system32>` | Admin Command Prompt. Use a normal one. |
| `'node' is not recognized` right after installing | Open a **new** terminal window; restart the laptop if needed. |
| `npm run dev` says **Next.js 16**, or warns "middleware is deprecated" | Something upgraded Next.js (often `npm audit fix --force`). Run `git checkout -- package.json package-lock.json`, then `npm ci`. Never run `npm audit fix --force`. |
| `git status` shows `tsconfig.json` or `package.json` changed, and you didn't change them | A tool rewrote them. `git restore tsconfig.json` (or the file named) before committing. |
| The push worked but GitHub offers no pull request | Nothing was committed: `git status` said the files weren't added, or the new files never reached the `relay` folder. Check `git status` and `git log --oneline -1` before pushing. |
| Build fails with `supabaseKey is required` | A file creates a Supabase client with the secret key at the top of the file. Use `createClient` from `@/lib/supabase/server` inside the function instead (section 6). |
| A branch shows conflicts in files you never touched | It was made from an old `main`. Make a new branch from the latest `main` and copy only your own files across. |
| A CSV export or a query returns exactly 500 or 1,000 rows | Supabase limits rows per request. Count in SQL, or use the files in `data/processed/`. |
| `Module not found: Can't resolve '@/lib/…'` | File is in the wrong folder. `@/` means `src/`. VS Code shows `lib \ supabase` on one line when `lib` only contains `supabase`, so new files can land in `supabase` by mistake. |
| Hydration error mentioning `data-gr-ext-installed` | Grammarly extension. Already handled in `layout.tsx`. |
| Supabase SQL Editor says "Success. No rows returned" after an `update` | It always says that. Verify with a `select`. |
| Supabase warns "UPDATE without a WHERE clause" on a migration | Usually a false alarm from updates inside functions. Check each `update` has a `where`, then run it. |
| A migration says a column "already exists" | It was run before. Check what's there with a `select` before running anything again; ask Samukelo. |
| Server action button does nothing after files were moved or added | Restart `npm run dev` and hard-refresh (Ctrl+Shift+R). |
| `curl: (7) Failed to connect to localhost port 3000` | The app isn't running. Start `npm run dev` first. |
| Pasting a file path into the SQL Editor | Paste the file's **contents**, not its path. |

---

## 9. Each member's stories (Sprint 2+3)

Full stories and acceptance criteria: [`docs/sprints/SPRINT2_3_STORIES.md`](docs/sprints/SPRINT2_3_STORIES.md). Status below was last checked on Mon 23 Nov for Samukelo's platform and email work. The other members' lines are as of 5 Nov and each owner should confirm them.

**Since 5 Nov (all checked 23 Nov):**
- Platform: companies, company settings, platform admin area at `/system`, invite of a company's first system admin, system admin invite into an existing company (migrations 0030 to 0038; see section 5). Company name in the top bar.
- Fixes: Manage users lists only the caller's own company (0038, live). New invitees set their password before the two-step setup (`SETUP_PATHS` in `src/lib/supabase/middleware.ts`).
- Emails: the invite and reset password templates in `docs/email-templates/` name the company, and their header picture has no company name. Merged to `main` in PR #145.

### Samukelo: platform, carry-over, risk and compliance
- ✅ **S1-20** and **S1-24** architecture document (`docs/architecture.md`, sections 1 to 9)
- ✅ **S2-01** PR checks and Preview env vars · **S2-02** role homes and public home page · **S2-06** ticket lifecycle (0006) · **S2-07** audit actions and AiNote · **S2-11** priority and "Department is correct" · **S2-12** audit log screen · **S2-16** take and assign
- ✅ Extra: only the assigned agent replies; sensitive request rule (0009); S2-03 history fix and the forecast contract
- ✅ Extra: migration 0010 and `loadDailyHistory()` (daily counts for the forecast)
- ✅ **S2-20** close a ticket · **S2-26** flagged replies (0011, `src/lib/flags.ts`, `/compliance/flags`) · **S2-21** bias test (see the 9 Nov line below)
- ✅ **S2-25** Manage users (0012, the invite-user Edge Function, `/manager/users`, `/welcome`) · **S2-35** remove people who leave (0013)
- ✅ **S2-30** risk report (0014, `src/lib/risk.ts`, `/compliance/risk`) · **S2-36** edit details, forgot password, designed sign-in pages and emails (0015)
- ✅ **S2-21** bias test complete: classifier and 50 Gemini drafts (9 Nov), results in `docs/responsible-ai/`
- In review: **S2-31** responsible AI documents (`docs/responsible-ai/`, with `docs/architecture.md` section 8)
- Open: Gemini transfer and retention decisions for Kopano Freight (`docs/responsible-ai/popia-note.md`); backup codes for the second step (S4-17 follow-up)
- Open (25 Nov): migration **0039** (company-scoped jobs, reports and summaries; company checks in auto-assign, escalation and notifications; grant hardening) is written and tested on demo in a rolled-back transaction. Review it, then apply it to demo and live. The live Monday summary and reports code (`weekly-summaries`, `reports/generate`) calls the 0039 signatures, so 0039 must be on live before that code is merged.
- Open (25 Nov): `reset_demo_company()` exists on the live project. Its nightly route is off there (`DEMO_ENABLED` is unset), but the function still runs for anyone holding `CRON_SECRET` and deletes every live ticket across all companies. Remove it from live, or revoke it from `anon`, after the team agrees.
- Open (23 Nov): the Supabase invite and reset emails need the templates pasted into Authentication → Emails (confirm when done). The invite flow still needs an end-to-end test on live: password page before two-step setup, and only that company's people on Manage users.
- Open (23 Nov): the Company tab on Manage users showed a grey placeholder during a live test. It couldn't be reproduced; it needs the time it happened so the Vercel logs can be checked (Hobby plan keeps logs for one hour).
- Resolved (25 Nov): `notices` and `email_outbox` are not open to direct writes. Their only permissive policy is the person's own notices (`notices`), and `email_outbox` has none. The "Same company only" policy is restrictive, so it limits rows to the company but grants no write.
- Open (23 Nov): remove the test account `towe.triage@gmail.com` in Supabase Authentication → Users.

### Elzel: workload forecasting
- ✅ **S2-03** daily history (full year; `data/processed/daily_counts.csv`)
- Next: **S2-08** forecast method in `src/lib/forecast.ts`, built against [`docs/forecast.md`](docs/forecast.md) (its HR example is the first test) · S2-13 range · S2-17 backtest · S2-22 method note · S2-27 forecast view · S2-32 callout and staffing hint

### Mihlali: analytics dashboard
- ✅ **S2-04** metrics shape (`docs/metrics.md`) · **S2-09** `dashboard_metrics()` (0007)
- Next: **S2-14** number cards and filters at `/manager/dashboard` · S2-18 charts · S2-23 10-second test · S2-28 weekly insights (`src/lib/insights.ts`) · S2-33 insights on the dashboard

### Baphakamise: automated reporting
- ✅ **S2-05** report template spec (`docs/report-template.md`)
- In progress: **S2-10** reports table (0008) and **S2-15** report preview, on `feature/S2-10-reports-migration`: the route must not use the secret key, the page goes under `/manager/reports`, and 0008 needs `default now()` and `public.department`
- ✅ **S2-29** saved reports list, with cards on phones (PR #95)
- ✅ **S2-34** Monday report schedule (0018) and Monday AI summaries (0019, `src/app/api/cron/weekly-summaries`). Built and tested by hand on 12 Nov. The first scheduled run is Monday 16 Nov at 08:15 SAST; confirm it there.
- Next: S2-19 PDF download · S2-24 forecast and open-ticket sections (use `forecast(history, …)` from `docs/forecast.md`; waiting on Elzel's start-date fix)

---

## 10. Starter prompt for a teammate's AI chat

Copy this, fill in the brackets, and attach `AGENTS.md`, `docs/sprints/SPRINT2_3_STORIES.md` and your story's contract (for example `docs/forecast.md`):

```
I'm [name] on the Relay team. Read AGENTS.md and SPRINT2_3_STORIES.md first.
I'm working on story [S2-xx]: [paste the story and its Given/When/Then].
I'm a beginner on Windows using VS Code and Command Prompt.
Guide me step by step: tell me which files to create or change and where,
give complete code I can paste, explain why each part is needed,
and tell me how to test each scenario. Wait for me after each step.
```
