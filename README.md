# Relay

**AI-powered internal operations platform for Kopano Freight** · CAPACITI AI Bootcamp (8 weeks)

Kopano Freight is a fictional Johannesburg logistics company with about 350 staff across a head office, two depots and a driver workforce. Its internal requests to HR, IT, Finance and Operations arrive through a shared inbox and WhatsApp with no triage. Requests get misrouted, replies are slow and inconsistent, and management has no data on volumes, response times or upcoming surges.

Relay gives staff one place to ask for help. It classifies each request, drafts a reply, tracks performance, forecasts workload, governs its own AI decisions and automates approvals.

**Live site:** [relay-gilt-nine.vercel.app](https://relay-gilt-nine.vercel.app) (updates automatically on every merge to `main`)

## Roadmap

| Sprint | Dates | Modules |
| --- | --- | --- |
| 1 | 19 Oct – 30 Oct 2026 | Ticket classification · AI response generator |
| 2 | 2 Nov – 13 Nov 2026 | Analytics dashboard · Automated reporting |
| 3 | 16 Nov – 27 Nov 2026 | Workload forecasting · AI risk and compliance |
| 4 | 30 Nov – 11 Dec 2026 | Workflow automation · Deployment and showcase |

Backlog and sprints are tracked in Jira (project **SCRUM**). Sprint 1 is in progress.

## Project documents

| Document | What it's for |
| --- | --- |
| [Getting started](docs/GETTING_STARTED.md) | Set up your laptop, run Relay, and the daily Git workflow |
| [AGENTS.md](AGENTS.md) | Context for AI assistants: give it to your AI before asking for help with a story |
| [Sprint 1 stories (text)](docs/sprints/SPRINT1_STORIES.md) | Every Sprint 1 story with its Given / When / Then criteria, readable by AI tools |
| [Sprint 1 plan](docs/sprints/Sprint1_Plan.docx) | Goal, owners, and every user story with its Given / When / Then acceptance criteria, day by day |
| [Sprint 1 dependency map](docs/sprints/Sprint1_Dependencies.pdf) | Which story you can't start without, who you're waiting on, and who's waiting on you |
| [Architecture](docs/architecture.md) | How Relay is built (written in Sprint 1, stories S1-20 and S1-24) |
| [Contributing](CONTRIBUTING.md) | Branch, commit and pull request rules |

## Tech stack

- **Next.js 15** (App Router, TypeScript) on **Vercel**
- **Supabase**: Postgres database, auth with roles, file storage
- **Tailwind CSS** (shadcn/ui components added in Sprint 1)
- **ML classifier**: TF-IDF + logistic regression, trained in Google Colab, exported to JSON and run inside a Next.js API route
- **Gemini API** for response drafting and summaries

## Project structure

```
src/app/            Pages and API routes
src/lib/            Shared code (Supabase clients, classifier)
supabase/migrations Database schema, applied in order
supabase/seed       Seed scripts for historical tickets
ml/notebooks        Colab notebooks for training the classifier
ml/model            Exported model weights (JSON)
data/raw            Source datasets (Kaggle, synthetic)
data/processed      Cleaned, merged dataset
docs/               Architecture document, sprint notes, retros
```

## Getting started

First time? Follow the full step-by-step guide: **[docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)**. Short version:

1. Clone the repo and install dependencies:
   ```bash
   git clone https://github.com/mngadisamu/relay.git
   cd relay
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in the Supabase and Gemini keys. Samukelo shares them privately; never commit them.
3. Run the app:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

Windows users: run commands in **Command Prompt**, not PowerShell. The guide explains why.

## Working together

Read [CONTRIBUTING.md](CONTRIBUTING.md) before your first commit. In short: never push to `main`, work on a branch named after your user story (e.g. `feature/S1-09-sign-in`), and open a pull request that another team member reviews.

## Team

| Member | Sprint 1 feature | Stories |
| --- | --- | --- |
| Samukelo | F1 · Platform foundation: database, sign-in and roles, architecture | S1-01, S1-05, S1-09, S1-15, S1-20, S1-24 |
| Elzel | F2 · Ticket data and ML classifier | S1-02, S1-06, S1-10, S1-16, S1-17, S1-21, S1-25 |
| Mihlali | F3 · Staff request portal (UI/UX) | S1-03, S1-07, S1-11, S1-12, S1-18, S1-22, S1-26 |
| Baphakamise | F4 · AI response generator and agent inbox | S1-04, S1-08, S1-13, S1-14, S1-19, S1-23, S1-27, S1-28 |
