# Relay

**AI-powered internal help desk for Kopano Freight** · CAPACITI AI Bootcamp (8 weeks)

Kopano Freight is a fictional Johannesburg logistics company with about 350 staff across a head office, two depots and a driver workforce. Its internal requests to HR, IT, Finance and Operations used to arrive through a shared inbox and WhatsApp with no triage. Requests got misrouted, replies were slow and inconsistent, and management had no data on volumes, response times or upcoming surges.

Relay gives staff one place to ask for help. It routes each request to the right team, drafts a reply for a person to check, tracks performance, forecasts workload and keeps a record of every AI decision.

**Live site:** [relay-gilt-nine.vercel.app](https://relay-gilt-nine.vercel.app) (updates automatically on every merge to `main`)

## Roadmap

| Sprint | Dates | Modules | Status |
| --- | --- | --- | --- |
| 1 | 19 Oct – 30 Oct 2026 | Ticket classification · AI response generator | Done |
| 2 + 3 | 2 Nov – 13 Nov 2026 | Analytics dashboard · Automated reporting · Workload forecasting · AI risk and compliance | **In progress** |
| 4 | To be confirmed | Workflow automation · Deployment and showcase | |

Sprints 2 and 3 were combined into one two-week sprint by the programme. It starts with the Sprint 1 carry-over: assigning and closing tickets, priority on submit, manager and compliance homes, and Manage users.

## What Relay does today

| Who | What they can do |
| --- | --- |
| **Staff** | Send a request with how urgent it is · Relay routes it to HR, IT, Finance or Operations · follow it in **My requests**, with a reference number, status history and the reply |
| **Agents** | **Inbox** of their department's tickets, most urgent first, with a **Mine** filter · **Take ticket** · confirm or move the AI's department choice · reply from an **AI draft** in a formal, friendly or urgent tone, edited and checked by them · **Template library** |
| **Managers** | **Tickets** for their department (all departments for a general manager) · **Assign** tickets to agents · dashboard, reports and forecast coming this sprint |
| **Compliance** | **Audit log** of every AI decision and human change, with filters, a ticket's whole history and CSV export · flagged replies and risk report coming this sprint |

Every piece of AI work is labelled (for example "Routed by AI · 92% sure · an agent can change it"), and a person can check or change it before it counts.

## Project documents

| Document | What it's for |
| --- | --- |
| [Getting started](docs/GETTING_STARTED.md) | Set up your laptop, run Relay, and the daily Git workflow |
| [AGENTS.md](AGENTS.md) | Context for AI assistants: give it to your AI before asking for help with a story |
| [Contributing](CONTRIBUTING.md) | Branch, commit and pull request rules |
| [Architecture](docs/architecture.md) | How Relay is built: components, data model, request flow, roles and security |
| [Audit actions](docs/audit-actions.md) | Every action written to the audit log and what it records (contract 3) |
| [Dashboard metrics](docs/metrics.md) | The numbers the dashboard, reports and forecast share, and how each is worked out (contract 2) |
| [Report template](docs/report-template.md) | What the weekly department report contains and where each number comes from |
| [Design](docs/design/README.md) | Personas, journey map, wireframes, mockups and the style guide |
| [Sprint 1 stories](docs/sprints/SPRINT1_STORIES.md) · [plan](docs/sprints/Sprint1_Plan.docx) · [dependencies](docs/sprints/Sprint1_Dependencies.pdf) | Sprint 1 stories with their Given / When / Then criteria |
| [Sprint 2+3 stories](docs/sprints/SPRINT2_3_STORIES.md) · [plan](docs/sprints/Relay%20Sprint%202%2B3%20Plan%20(1).docx) | Every Sprint 2+3 story by member and day, with its acceptance criteria and later decisions |
| [Forecast](docs/forecast.md) | How the workload forecast works, and the shape the reports and forecast screen build against (contract 4) |

## Tech stack

- **Next.js 15.5** (App Router, TypeScript) on **Vercel**
- **Supabase**: Postgres database, sign-in with roles, row-level security on every table
- **Tailwind CSS v4** with **shadcn/ui** components in Relay's colours
- **ML classifier**: TF-IDF + logistic regression, trained in Google Colab, exported to JSON and run in TypeScript on the server (no Python server)
- **Gemini API** (`gemini-2.5-flash`) for reply drafts and summaries, server-side only
- **GitHub check** on every pull request: lint, type-check and build must pass before it can be merged

## Project structure

```
src/app/              Pages, server actions and API routes, one folder per role (staff, agent, manager, compliance)
src/components/       Shared components (menus, AI note, status tags) and shadcn/ui in components/ui
src/lib/              Shared code: sign-in and roles, Supabase clients, classifier, menus, templates
supabase/migrations   Database changes, applied in order (0001 onwards); never edit one that has been run
supabase/seed         Reply templates and the year of past tickets used by the dashboard and forecast
ml/notebooks          Colab notebooks: classifier training, daily ticket history
ml/model              The exported classifier (JSON) and its results
data/raw              Source dataset (Kaggle)
data/processed        Mapped, synthetic and combined datasets, with a data dictionary
docs/                 Architecture, contracts, design and sprint documents
```

## Getting started

First time? Follow the full step-by-step guide: **[docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)**. Short version, in **Command Prompt** (not PowerShell), one line at a time:

```
git clone https://github.com/mngadisamu/relay.git
```
```
cd relay
```
```
npm ci
```

Copy `.env.example` to `.env.local` and fill in the Supabase and Gemini keys. Samukelo shares them privately; never commit them. Then:

```
npm run dev
```

Open http://localhost:3000.

Use `npm ci` rather than `npm install` or `npm audit fix --force`: it installs exactly the versions in `package-lock.json`, so everyone runs the same Next.js version.

### Test accounts

Passwords are shared privately by Samukelo. Never put them in code, docs or chat.

| Account | Role |
| --- | --- |
| `staff@relay.test`, `staff2@relay.test` | Staff |
| `agent@relay.test` | Agent, IT department |
| `manager@relay.test` | Manager (general manager, all departments) |
| `compliance@relay.test` | Compliance |

There's no sign-up page: accounts are added by a manager (Manage users, this sprint).

## Working together

Read [CONTRIBUTING.md](CONTRIBUTING.md) before your first commit. In short:

1. Start every story from the latest `main` (`git checkout main`, then `git pull`), on a branch named after it, e.g. `feature/S2-14-dashboard-cards`.
2. Commit with the story ID first, push your branch every day, and open a pull request.
3. The GitHub check and the Vercel preview must both pass, and one teammate approves (review rotation in [AGENTS.md](AGENTS.md)).
4. Database changes go through Samukelo as a new numbered migration.

## Team

| Member | Sprint 2+3 feature | Sprint 1 feature |
| --- | --- | --- |
| Samukelo (team lead, BA) | Platform, Sprint 1 carry-over, AI risk and compliance | F1 · Platform foundation: database, sign-in and roles, architecture |
| Elzel | Workload forecasting | F2 · Ticket data and ML classifier |
| Mihlali | Analytics dashboard | F3 · Staff request portal (UI/UX) |
| Baphakamise | Automated reporting | F4 · AI response generator and agent inbox |