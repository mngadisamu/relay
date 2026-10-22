# AGENTS.md: context for AI assistants working on Relay

> **For the AI reading this:** you are helping one member of a four-person student team build Relay during the CAPACITI AI Bootcamp. Read this whole file before suggesting anything. It tells you what the project is, what already exists, what each person owns, the rules the team follows, and the mistakes already made. Then read the user's story in [`docs/sprints/SPRINT1_STORIES.md`](docs/sprints/SPRINT1_STORIES.md).
>
> **For a teammate using a chat AI** (ChatGPT, Gemini, Claude.ai and so on) that can't see the repo: paste this file into the chat, or attach it, together with `docs/sprints/SPRINT1_STORIES.md`, and then say which story you're working on. A starter prompt is at the end of this file.

Last updated: Thu 22 Oct 2026 (Sprint 1, day 4).

---

## 1. The project in one minute

**Relay** is an AI-powered internal help desk for **Kopano Freight**, a fictional Johannesburg logistics company (about 350 staff: head office, two depots, drivers). Staff send requests to HR, IT, Finance or Operations. Relay:

1. **Classifies** each request to a department (ML classifier). Sprint 1.
2. **Drafts a reply** with AI in a chosen tone, which an agent edits and sends. Sprint 1.
3. Later sprints: analytics dashboard and reports (Sprint 2), workload forecasting and AI risk/compliance (Sprint 3), workflow automation, approvals and deployment showcase (Sprint 4).

The bootcamp runs **8 weeks as 4 two-week sprints**. Work is graded on technical delivery *and* professional skills (documentation, teamwork, presentation, responsible AI).

| Sprint | Dates | Modules |
| --- | --- | --- |
| 1 | 19–30 Oct 2026 | Ticket classification · AI response generator |
| 2 | 2–13 Nov 2026 | Analytics dashboard · Automated reporting |
| 3 | 16–27 Nov 2026 | Workload forecasting · AI risk and compliance |
| 4 | 30 Nov–11 Dec 2026 | Workflow automation · Deployment and showcase |

- **Repo:** https://github.com/mngadisamu/relay
- **Live site:** https://relay-gilt-nine.vercel.app (auto-deploys on every merge to `main`)
- **Tracking:** Jira project *Roadmap Planning* (key `SCRUM`), plus the Completion column in `docs/sprints/Sprint1_Plan.docx`

---

## 2. Team and ownership

**Respect ownership.** Help the user with *their* stories. Don't rewrite files another member owns. If their story needs a change in someone else's area, tell the user to agree it with that person at stand-up first.

| Member | Sprint 1 feature | Owns (mainly) | Stories |
| --- | --- | --- | --- |
| **Samukelo** (team lead, BA) | F1 · Platform foundation | `supabase/migrations/`, `src/lib/supabase/`, `src/lib/auth.ts`, `src/middleware.ts`, login and role home pages, `docs/` | S1-01 ✅, S1-05 ✅, S1-09 ✅, S1-15 ✅, S1-20, S1-24 |
| **Elzel** | F2 · Ticket data and ML classifier | `data/`, `ml/`, `supabase/seed/`, `src/app/api/classify/`, classifier code | S1-02, S1-06, S1-10, S1-16, S1-17, S1-21, S1-25 |
| **Mihlali** | F3 · Staff request portal (UI/UX) | Design system and shared UI components, submit form, My requests pages, role menu | S1-03, S1-07, S1-11, S1-12, S1-18, S1-22, S1-26 |
| **Baphakamise** | F4 · AI response generator and agent inbox | Agent inbox, ticket view, template library, AI drafting route | S1-04, S1-08, S1-13, S1-14, S1-19, S1-23, S1-27, S1-28 |

**Shared files.** Announce changes at stand-up before editing: `src/app/layout.tsx`, `src/app/globals.css`, `package.json` (adding packages), `src/components/RoleHome.tsx`, `src/lib/auth.ts`, `src/middleware.ts`.

**Database changes always go through Samukelo** as a new numbered migration (see section 6).

**Review rotation** (one approval needed per PR): Samukelo → Elzel → Mihlali → Baphakamise → Samukelo. The arrow means "is reviewed by".

---

## 3. Tech stack (use these exact versions)

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | **Next.js 15.5** (App Router), **React 19**, **TypeScript** | `src/` directory, import alias `@/*` → `src/*` |
| Styling | **Tailwind CSS v4** | Theme colours `bg-background`, `text-foreground` come from `globals.css`. shadcn/ui is **not installed yet** (Mihlali, S1-12). |
| Database and auth | **Supabase** (Postgres + Auth) via `@supabase/ssr` 0.12 and `@supabase/supabase-js` 2.x | Email and password sign-in. Row-level security (RLS) is on for every table. |
| Hosting | **Vercel** (team "Team AI", project `relay`) | Env vars set in Vercel. Every PR gets a preview URL. |
| ML classifier | TF-IDF + logistic regression, trained in **Google Colab** (Python/scikit-learn), exported to **JSON**, run in TypeScript inside a Next.js route | No Python server in production |
| Generative AI | **Google Gemini API** | Key is server-side only (`GEMINI_API_KEY`). No Gemini SDK installed yet (Baphakamise adds it, after announcing it at stand-up). |

**Environment variables** (`.env.example` lists them; values live in each person's `.env.local` and in Vercel, and are **never committed**):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Supabase "publishable" key
SUPABASE_SERVICE_ROLE_KEY=          # Supabase "secret" key: bypasses RLS, server/scripts only
GEMINI_API_KEY=                     # server only, never prefix with NEXT_PUBLIC_
```

---

## 4. What exists on `main` right now

```
src/
├── middleware.ts                 Runs before every page: refreshes the session, sends signed-out users to /login
├── lib/
│   ├── auth.ts                   Role type, HOME_FOR_ROLE map, getCurrentProfile(), requireRole()
│   └── supabase/
│       ├── client.ts             createClient() for browser ("use client") components
│       ├── server.ts             createClient() for server components, server actions, route handlers
│       └── middleware.ts         updateSession(): used by src/middleware.ts
├── components/
│   └── RoleHome.tsx              Shared layout for role home pages (title, signed-in info, Sign out)
└── app/
    ├── layout.tsx                Root layout (suppressHydrationWarning for browser extensions)
    ├── page.tsx                  Public placeholder home page
    ├── login/page.tsx            Sign-in form (client component, useActionState)
    ├── login/actions.ts          signIn() and signOut() server actions
    ├── home/page.tsx             Redirects a signed-in user to their role's home
    ├── staff/ agent/ manager/ compliance/page.tsx   Role home placeholders; each guarded by requireRole()
    └── api/classify/route.ts     POST classify API: a keyword STUB until Elzel's model (S1-21)
supabase/migrations/
├── 0001_initial_schema.sql       All tables, enums, RLS switched on
├── 0002_profiles_on_signup.sql   Trigger: new auth user → profiles row (role staff); policy: read own profile
├── 0003_tickets_privacy.sql      RLS on tickets (read own / department / all; insert as self) + role helper functions
└── 0004_team_policies.sql        RLS for ticket updates, classifications, templates, responses, audit_log + reroute_ticket()
docs/  GETTING_STARTED.md · architecture.md (outline only) · sprints/ (plan .docx, dependencies .pdf, stories .md)
```

**Public paths** (no sign-in needed): `/`, `/login` and everything under `/api`. Every other path requires sign-in (`src/lib/supabase/middleware.ts`, `PUBLIC_PATHS`).

**Test accounts** in Supabase: `staff@relay.test` (role staff) and `agent@relay.test` (role agent, department IT). Passwords are shared privately by Samukelo. **Never put them in code, docs or chat logs.**

**Ticket privacy (S1-15, merged):** migration `0003_tickets_privacy.sql` adds RLS policies on `tickets`:
- users read the tickets they submitted;
- agents read tickets in their own department;
- managers and compliance read all tickets;
- users insert tickets only with `submitted_by = auth.uid()`.

It also adds the SQL helpers `public.current_user_role()` and `public.current_user_department()` (use them in new policies). In the app, protect a page with `await requireRole(["agent"])` from `@/lib/auth`: signed-out users go to `/login`, other roles go back to their own home.

**Test data in Supabase:** three tickets (two from `staff@relay.test`, IT and HR; one from `staff2@relay.test`, IT), plus a third account `staff2@relay.test` (role staff). Use them to test inboxes and lists.

---

## 5. Database (Supabase Postgres)

**Enums:** `user_role` = staff, agent, manager, compliance · `department` = HR, IT, Finance, Operations · `ticket_status` = received, assigned, answered, closed · `ticket_priority` = low, medium, high, urgent · `reply_tone` = formal, friendly, urgent

| Table | Key columns | Notes |
| --- | --- | --- |
| `profiles` | `id` (= auth user id), `full_name`, `role`, `department`, `depot`, `created_at` | Created automatically on sign-up (role `staff`). Agents and managers have a `department`. |
| `tickets` | `id`, `reference` (auto, e.g. `KF-261021-0042`), `submitted_by`, `subject`, `description`, `depot`, `department`, `priority`, `status`, `needs_review`, `is_historical`, `created_at`, `assigned_at`, `answered_at`, `closed_at` | `is_historical = true` marks seeded past tickets (S1-17). Always set the matching timestamp when status changes. |
| `classifications` | `ticket_id`, `predicted_department`, `confidence` (0–1), `model_version`, `overridden_by`, `overridden_department`, `created_at` | Keep every decision; never overwrite (needed for the Sprint 3 audit). |
| `templates` | `department`, `name`, `body`, `updated_by`, timestamps | Reply templates (S1-04, S1-27) |
| `responses` | `ticket_id`, `template_id`, `tone`, `ai_draft`, `final_text`, `ai_generated`, `sent_by`, `sent_at` | Store the AI draft *and* what the agent actually sent. |
| `audit_log` | `actor`, `action`, `ticket_id`, `details` (jsonb) | e.g. classify, override, draft, send |
| `approvals` | `ticket_id`, `approver`, `decision`, `decided_at` | Sprint 4 |

### Who can do what (row-level security, migrations 0003 and 0004)

RLS is **on** for every table. These rules are the whole permission model. If a query returns **no rows or a "row-level security" error**, check this table first.

| Table | Read | Create | Update |
| --- | --- | --- | --- |
| `profiles` | own row | automatic on sign-up (trigger) | (none yet) |
| `tickets` | staff: own · agents: own department · managers, compliance: all | anyone signed in, only with `submitted_by = auth.uid()` | agents: own department, and the ticket must stay in it · managers: all |
| `classifications` | anyone who can see the ticket | anyone who can see the ticket (the submitter saves it on submit) | agents, managers: record an override (`overridden_by` = themselves) |
| `templates` | agents, managers, compliance (**not** staff) | agents: own department · managers: any | agents: own department · managers: any |
| `responses` | agents, managers, compliance on visible tickets · **staff only once `sent_at` is set** (never unsent drafts) | agents, managers, on visible tickets | agents, managers |
| `audit_log` | managers, compliance | anyone signed in, only with `actor = auth.uid()` | nobody (append-only) |
| `approvals` | (Sprint 4) | | |

**Rules for writing code against this:**
- **Re-routing a ticket to another department** (S1-25): use the database function, not a plain update. A plain update is refused, because the agent can no longer see the ticket afterwards:
  ```ts
  const { error } = await supabase.rpc("reroute_ticket", {
    p_ticket_id: ticketId,
    p_department: "HR",
  });
  ```
  In one step it checks the caller is an agent of the ticket's current department (or a manager), moves the ticket, clears `needs_review`, records the override on the latest classification and writes an `audit_log` entry.
- **AI drafts are created by the agent**, e.g. when the agent opens a ticket or clicks "Draft reply" (S1-08, S1-13). Staff accounts can't insert into `responses`, so don't generate drafts inside the staff submit form.
- **Sending a reply** (S1-23): update the response (`final_text`, `sent_by`, `sent_at`) and the ticket (`status = 'answered'`, `answered_at`), both as the agent.
- **Saving a classification** (S1-21): insert it right after inserting the ticket, in the same server action, as the submitting user.
- **Audit entries:** always set `actor` to the signed-in user's id.
- Need a permission that isn't here? Ask Samukelo for a new migration. Don't turn RLS off, and don't use the service-role key in app code.

---

## 6. How to write code here (conventions)

- **Supabase client:** use `createClient` from `@/lib/supabase/server` in server components, server actions and route handlers, and from `@/lib/supabase/client` only in `"use client"` components. **Never** use `SUPABASE_SERVICE_ROLE_KEY` in app code. The only exception is one-off scripts (e.g. the S1-17 seed script) run locally.
- **Who is signed in:** call `getCurrentProfile()` from `@/lib/auth`. It returns `{ email, fullName, role, department }` or `null`. To restrict a page to certain roles, call `await requireRole([...])` at the top of the page; it returns the profile. For role-based redirects use `HOME_FOR_ROLE`.
- **Forms:** use **server actions** (`"use server"` in an `actions.ts` file next to the page), with `useActionState` in the client form for errors and pending state. See `src/app/login/` as the reference pattern.
- **Redirects:** redirect **straight to the final page**. Don't redirect from a server action to a page that redirects again: that chain made sign-in take ~40 s in dev (fixed in S1-09).
- **Secrets:** API keys only in server code (server actions, route handlers). Nothing secret gets a `NEXT_PUBLIC_` prefix.
- **AI output must be labelled** ("AI-drafted") and editable by a person before sending. Store both the draft and the final text.
- **Accessibility (WCAG 2.1 AA):** every input has a `<label htmlFor>`; status is shown in **text and colour**, not colour alone; errors use `role="alert"`; screens work at **360 px** width.
- **Database changes:** never edit an applied migration. Add the next numbered file in `supabase/migrations/` (e.g. `0005_...sql`), with comments explaining each part, and run it in the Supabase SQL Editor. Samukelo owns migrations.
- **Comments:** short and plain, explaining *why*. The team is learning, and the code will be presented to a panel.
- **Before saying "done":** `npx tsc --noEmit` and `npm run lint` pass, and each Given / When / Then scenario has been tested by hand.

### Classify API contract (agreed; don't change the shape)

```
POST /api/classify
Request:  { "subject": string, "description": string }
Response: { "department": "HR" | "IT" | "Finance" | "Operations",
            "confidence": number,      // 0 to 1
            "needsReview": boolean,    // true when confidence < 0.6
            "modelVersion": string }   // "stub-0" until the real model ships
```
Mihlali's form and Baphakamise's inbox build against the stub now. Elzel's real model (S1-21) replaces the inside of the route **without changing this shape**.

---

## 7. Team workflow (Git and GitHub)

1. `git checkout main` → `git pull`
2. `git checkout -b feature/S1-xx-short-name` (use `docs/` or `fix/` instead of `feature/` where it fits)
3. Build and test locally (`npm run dev`, http://localhost:3000)
4. Commit with the story ID first: `git commit -m "S1-22 Add depot field to submit form"`
5. `git push -u origin feature/S1-xx-short-name` → open a pull request (fill in the template)
6. The reviewer tests the **Vercel preview link** against the acceptance criteria and approves
7. **Squash and merge**, delete the branch, mark the story Done in Jira and the sprint plan

`main` is protected: no direct pushes, and one approval is required.

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
| `Module not found: Can't resolve '@/lib/…'` | File is in the wrong folder. VS Code shows `lib \ supabase` on one line when `lib` only contains `supabase`, so new files land in `supabase` by mistake. `@/` means `src/`. |
| Hydration error mentioning `data-gr-ext-installed` | Grammarly extension. Already handled in `layout.tsx`. |
| Supabase SQL Editor says "Success. No rows returned" after an `update` | It always says that. Verify with a `select`. |
| Server action button does nothing after files were moved or added | Restart `npm run dev` and hard-refresh (Ctrl+Shift+R). |
| `curl: (7) Failed to connect to localhost port 3000` | The app isn't running. Start `npm run dev` first. |
| Pasting a file path into the SQL Editor | Paste the file's **contents**, not its path. |

---

## 9. Each member's next steps (Sprint 1)

Full acceptance criteria are in [`docs/sprints/SPRINT1_STORIES.md`](docs/sprints/SPRINT1_STORIES.md). Dependencies are in `docs/sprints/Sprint1_Dependencies.pdf`.

### Elzel: data and classifier
- **S1-02 / S1-06:** the Kaggle *IT Service Ticket Classification* dataset goes in `data/raw/`. Map its categories to HR / IT / Finance / Operations, and write synthetic HR, Finance and Operations tickets in Kopano Freight's context (depots, drivers, fuel cards, payslips, trucks). Columns: `subject, description, department, priority, depot, created_at` (dates spread over the last 12 months), `source` (real/synthetic). Add a data dictionary.
- **S1-10 / S1-16:** train in Colab. Report accuracy **separately** on held-out *real* tickets and on synthetic ones, with a confusion matrix (target ≥ 85% on real). Export JSON to `ml/model/` containing `version`, `classes`, `vocabulary` (term → index), `idf`, `coef` (classes × terms), `intercept`, and the preprocessing settings (lowercase, n-grams, stop words) so TypeScript can reproduce them exactly. Save the notebook in `ml/notebooks/`.
- **S1-17:** a local seed script in `supabase/seed/` inserts historical tickets with `is_historical = true` and their original `created_at`. It must be safe to run twice (no duplicates). This is the one place the service-role key may be used, from `.env.local`, never committed.
- **S1-21:** replace the stub inside `src/app/api/classify/route.ts` with TF-IDF + logistic regression inference from the JSON. Keep the contract. Respond in under 1 s. Save each result to `classifications` with `model_version` (allowed by migration 0004).
- **S1-25:** confidence < 0.6 sets `tickets.needs_review = true` when the ticket is inserted. An agent changes the department with `supabase.rpc("reroute_ticket", …)` (section 5), which also records the override and the audit entry.

### Mihlali: staff portal and design
- **S1-03 / S1-07 / S1-11:** personas (staff, agent, manager, compliance), a journey map, and low-fidelity wireframes for login, submit request, My requests, request detail, agent inbox, ticket view and template library. Then a classmate review.
- **S1-12:** shadcn/ui setup (`npx shadcn@latest init`), with colours, type and spacing. It changes `globals.css` and adds `src/components/ui/`, so announce it at stand-up first and keep `--background` / `--foreground` working.
- **S1-18:** a menu that shows only the pages for the user's role (use `getCurrentProfile()`). Staff: Submit request, My requests. Agent: Inbox, Templates. Contrast must meet WCAG AA.
- **S1-22:** submit form (subject, description, depot) as a server action. Insert into `tickets` with `submitted_by` = current user id (RLS requires it), get the department from the classify logic, and show the reference number and department. Must work at 360 px, with labelled fields and a clear error for an empty description. Build against the stub until S1-21.
- **S1-26:** My requests list (newest first; status in words and colour) and a detail page (department, status history, reply once sent). S1-15's RLS already limits staff to their own tickets, so a plain `select` from `tickets` returns only theirs.

### Baphakamise: AI replies and agent inbox
- **S1-04:** at least 3 reply templates per department. Get the Gemini API key from Google AI Studio and keep it **only** in `.env.local` and Vercel.
- **S1-08 / S1-13:** a server-side route or server action that calls Gemini with the ticket plus its department template. If Gemini fails or takes > 10 s, use the template text instead. Save the draft to `responses` as the signed-in agent (allowed by migration 0004). Adding an SDK changes `package.json`, so announce it first. Use a current Gemini Flash model (check AI Studio for the model name).
- **S1-14:** tone toggle (formal, friendly, urgent) regenerates the draft. The chosen tone is saved with the response.
- **S1-19:** agent inbox at `/agent` (or a sub-page, guarded with `requireRole(["agent"])`): only the agent's department (S1-15's RLS does the filtering automatically, so a plain `select` from `tickets` is enough), most urgent first then oldest, filter by status, "Needs review" clearly marked.
- **S1-23:** show the draft labelled "AI-drafted", let the agent edit it, then Send. Sending sets `status = 'answered'` and `answered_at`, and saves `final_text`, `sent_by` and `sent_at` (allowed by migration 0004).
- **S1-27 / S1-28:** template library screen (view and edit by department), and the sent reply shown on the staff member's request detail (built together with Mihlali).

### Samukelo: platform
- **S1-15 ✅** done. **Database rules for the rest of Sprint 1 ✅** (migration 0004, see section 5).
- **S1-20 / S1-24:** `docs/architecture.md`: diagram, components and why chosen, data model, request flow, roles and security, how the design supports Sprints 2–4.

---

## 10. Starter prompt for a teammate's AI chat

Copy this, fill in the brackets, and attach `AGENTS.md` and `docs/sprints/SPRINT1_STORIES.md`:

```
I'm [name] on the Relay team. Read AGENTS.md and SPRINT1_STORIES.md first.
I'm working on story [S1-xx]: [paste the story and its Given/When/Then].
I'm a beginner on Windows using VS Code and Command Prompt.
Guide me step by step: tell me which files to create or change and where,
give complete code I can paste, explain why each part is needed,
and tell me how to test each scenario. Wait for me after each step.
```
