# Relay

**AI-powered internal operations platform for Kopano Freight** · CAPACITI AI Bootcamp (8 weeks)

Kopano Freight is a fictional Johannesburg logistics company with about 350 staff across a head office, two depots and a driver workforce. Its internal requests to HR, IT, Finance and Operations arrive through a shared inbox and WhatsApp with no triage. Requests get misrouted, replies are slow and inconsistent, and management has no data on volumes, response times or upcoming surges.

Relay gives staff one place to ask for help. It classifies each request, drafts a reply, tracks performance, forecasts workload, governs its own AI decisions and automates approvals.

## Roadmap

| Sprint | Dates | Modules |
| --- | --- | --- |
| 1 | 20 Oct – 30 Oct 2026 | Ticket classification · AI response generator |
| 2 | 2 Nov – 13 Nov 2026 | Analytics dashboard · Automated reporting |
| 3 | 16 Nov – 27 Nov 2026 | Workload forecasting · AI risk and compliance |
| 4 | 30 Nov – 11 Dec 2026 | Workflow automation · Deployment and showcase |

Each sprint's plan, with user stories and progress, is in [docs/sprints](docs/sprints).

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
2. Copy `.env.example` to `.env.local` and fill in the Supabase and Gemini keys (ask the team; never commit them).
3. Run the app:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

## Working together

Read [CONTRIBUTING.md](CONTRIBUTING.md) before your first commit. In short: never push to `main`, work on a branch named after the user story, and open a pull request that another team member reviews.

## Team

Names and feature owners to be added.
