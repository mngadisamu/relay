# Relay architecture

**Owner:** Samukelo · **Stories:** S1-20 (sections 1–4), S1-24 (sections 5–7) · **Last updated:** 22 Oct 2026

This document explains how Relay is built: its parts, why each was chosen, and how the data is organised. It is written for assessors, new team members and the Week 8 panel. You shouldn't need to read the code to follow it.

---

## 1. Overview

**Relay** is an AI-powered internal help desk for **Kopano Freight**, a fictional Johannesburg logistics company with about 350 staff across a head office, two depots and a driver workforce.

Staff submit a request (for example, *"My payslip is missing overtime"*). Relay then:

1. **Classifies** it to the right department (HR, IT, Finance or Operations) with a machine-learning model.
2. **Drafts a reply** with generative AI, in the tone the agent chooses (formal, friendly or urgent).
3. Lets an **agent** in that department edit the draft and send it.
4. Shows the staff member their request's **status** and the reply, in one place.

Later sprints add analytics and reports (Sprint 2), workload forecasting and AI risk and compliance (Sprint 3), and workflow automation with approvals (Sprint 4). The design in this document already makes room for them (see section 6).

**Users and roles**

| Role | Who at Kopano Freight | What they do in Relay |
| --- | --- | --- |
| Staff | Office staff, depot workers, drivers | Submit requests, track them, read replies |
| Agent | HR, IT, Finance and Operations team members | Work their department's inbox, edit and send AI-drafted replies |
| Manager | Department heads | Add users and set their roles, dashboards, reports, approvals (later sprints) |
| Compliance | Compliance officer | Audit log and AI risk reports (Sprint 3) |

---

## 2. Architecture diagram

Relay is one **Next.js** application hosted on **Vercel**, with **Supabase** for the database and sign-in, and **Google Gemini** for drafting replies. The classifier is trained offline in **Google Colab** and shipped inside the app as a JSON file.

```mermaid
flowchart LR
    subgraph Users["People (web browser, phone or laptop)"]
        S["Staff and drivers"]
        A["Agents"]
        M["Managers and compliance"]
    end

    subgraph Vercel["Vercel: Relay (Next.js app)"]
        MW["Middleware<br/>session refresh, sign-in guard"]
        PAGES["Pages<br/>login, role homes, forms, inbox"]
        ACT["Server actions<br/>sign in, submit, send reply"]
        API["API routes<br/>/api/classify, AI draft"]
        MODEL["Classifier<br/>TF-IDF + logistic regression<br/>(model.json)"]
    end

    subgraph Supabase["Supabase"]
        AUTH["Auth<br/>email and password"]
        DB[("Postgres database<br/>tables + row-level security")]
    end

    GEM["Google Gemini API<br/>reply drafting"]
    COLAB["Google Colab<br/>model training (offline)"]
    GH["GitHub<br/>code, pull requests, reviews"]

    S --> MW
    A --> MW
    M --> MW
    MW --> PAGES
    PAGES --> ACT
    PAGES --> API
    API --> MODEL
    ACT --> AUTH
    ACT --> DB
    API --> DB
    API --> GEM
    COLAB -. "exports model.json" .-> MODEL
    GH -. "every merge to main deploys" .-> Vercel
```

**Reading the diagram:**
- Everyone uses the **same web app** in a browser. What they see depends on their role.
- The **middleware** runs before every page. It keeps the user signed in and sends anyone who isn't signed in to the login page.
- **Server actions and API routes** run on Vercel's servers, never in the browser. That's where secret keys live and where the app talks to Supabase and Gemini.
- **Supabase** checks every database request against **row-level security** rules, so each person only ever receives the rows they're allowed to see.
- The **classifier** is trained once in Colab, exported as `model.json`, and runs inside the app. There's no separate Python server.
- **GitHub** holds the code. Every merge into `main` redeploys the live site automatically, and every pull request gets its own preview link for review.

---

## 3. Components and technology choices

| Component | What it does in Relay | Why we chose it | Trade-off we accepted |
| --- | --- | --- | --- |
| **Next.js 15** (App Router, TypeScript, React 19) | The whole app: pages, forms, server actions and API routes | One codebase for the screens *and* the server code, so there's no separate backend to build and host. Server-side code keeps API keys out of the browser. TypeScript catches mistakes before they reach users. | Steeper learning curve than a simple tool like Streamlit. Worth it for a product that looks and behaves like a real internal system. |
| **Vercel** | Hosting, with automatic deploys | Made by the team behind Next.js, so it works with no configuration. Every merge to `main` goes live, and every pull request gets a **preview link** that reviewers use to test stories. Free for our size. | Free-tier limits on build time and function runtime; fine for a bootcamp-scale app. |
| **Supabase: Postgres** | Stores profiles, tickets, classifications, replies, templates, the audit log and approvals | A **relational** database suits our data: tickets *belong to* a department, replies *belong to* a ticket. Plain SQL also makes the Sprint 2 dashboards and Sprint 3 forecasts easy to query. | We manage schema changes ourselves, as numbered migration files. |
| **Supabase: Auth** | Email and password sign-in, sessions | Built in, secure, and connected to the database: the signed-in user's ID is available inside every database rule. | Email and password only for now. Single sign-on could be added later. |
| **Supabase: row-level security (RLS)** | Decides who can read or change each row | Permissions are enforced **inside the database**, so even a bug in a page can't leak another person's tickets. Staff see only their own requests, and agents only their department's. | Rules must be written and tested carefully. A missing rule silently returns no rows. |
| **Classifier: TF-IDF + logistic regression** (scikit-learn in Colab, exported to JSON, run in TypeScript) | Routes each request to HR, IT, Finance or Operations, with a confidence score | **Fast** (well under a second), **free** to run (no cost per ticket), **consistent** (the same text always gets the same answer) and **explainable** (we can show which words drove a decision, which matters for the Sprint 3 risk review). Trained on our own dataset: real IT tickets from Kaggle plus synthetic HR, Finance and Operations tickets. | Less flexible with unusual wording than a large language model. Low-confidence results (below 0.6) are flagged **"Needs review"** for a person to check. |
| **Google Gemini API** | Drafts replies from the ticket and its department's template, in the chosen tone | Strong writing quality, tone control through the prompt, and a free tier. Drafting is where generative AI adds most value: it saves agents time on every reply. | Depends on an outside service. If Gemini fails or takes over 10 seconds, the department template is used as the draft instead. Every draft is labelled "AI-drafted" and checked by an agent before sending. |
| **Tailwind CSS** (with shadcn/ui from S1-12) | Styling and a shared set of components | Consistent look across every screen, fast to build with, and accessible components out of the box. | Long class lists in the code, which take some getting used to. |
| **GitHub** | Code, pull requests, reviews | Every change is reviewed by a teammate before it reaches `main`, and the protection rule on `main` can't be bypassed, even by admins. | Every change needs a reviewer, so reviews must happen quickly. |
| **Google Colab** | Training and testing the classifier | Free, runs in the browser, and needs no installation on our laptops. | Training is a manual step: the exported model is committed to the repo. |

**Why not use Gemini for classification too?** We considered it. A trained classifier is cheaper (no cost per request), faster, gives the same answer every time, and can explain its decisions. Those qualities matter for routing, where consistency and auditability count more than eloquence. Gemini is used where language quality matters most: writing replies.

---

## 4. Data model

The database has **seven tables**. Every table has row-level security switched on.

```mermaid
erDiagram
    PROFILES ||--o{ TICKETS : "submits"
    TICKETS ||--o{ CLASSIFICATIONS : "is classified by"
    TICKETS ||--o{ AUDIT_LOG : "is recorded in"
    TICKETS ||--o{ APPROVALS : "may need"
    TICKETS ||--o{ RESPONSES : "is answered by"
    TEMPLATES |o--o{ RESPONSES : "is the starting point for"

    PROFILES {
        uuid id PK "same as the sign-in user"
        text full_name
        user_role role "staff, agent, manager, compliance"
        department department "for agents and managers"
        text depot
        timestamptz created_at
    }
    TICKETS {
        bigint id PK
        text reference "e.g. KF-261021-0042"
        uuid submitted_by FK
        text subject
        text description
        text depot
        department department "HR, IT, Finance, Operations"
        ticket_priority priority "low, medium, high, urgent"
        ticket_status status "received, assigned, answered, closed"
        boolean needs_review "low classifier confidence"
        boolean is_historical "seeded past data"
        timestamptz created_at
        timestamptz assigned_at
        timestamptz answered_at
        timestamptz closed_at
    }
    CLASSIFICATIONS {
        bigint id PK
        bigint ticket_id FK
        department predicted_department
        numeric confidence "0 to 1"
        text model_version
        uuid overridden_by FK
        department overridden_department
        timestamptz created_at
    }
    TEMPLATES {
        bigint id PK
        department department
        text name
        text body
        uuid updated_by FK
        timestamptz updated_at
    }
    RESPONSES {
        bigint id PK
        bigint ticket_id FK
        bigint template_id FK
        reply_tone tone "formal, friendly, urgent"
        text ai_draft "what the AI wrote"
        text final_text "what the agent sent"
        boolean ai_generated
        uuid sent_by FK
        timestamptz sent_at
    }
    AUDIT_LOG {
        bigint id PK
        uuid actor FK
        text action "e.g. classify, reroute, draft, send"
        bigint ticket_id FK
        jsonb details
        timestamptz created_at
    }
    APPROVALS {
        bigint id PK
        bigint ticket_id FK
        uuid approver FK
        text decision "pending, approved, rejected"
        timestamptz decided_at
    }
```

**Reading the diagram:** every ticket is at the centre. One staff profile submits many tickets, and each ticket can have many classifications, audit entries, approvals and replies. A reply may start from one template. Lines show links between tables, not data flowing back and forth.

**Links to people** (left off the diagram so the lines stay clear): several tables record *who* did something, by pointing to `profiles`:

| Column | Means |
| --- | --- |
| `tickets.submitted_by` | the staff member who asked |
| `classifications.overridden_by` | the agent or manager who changed the AI's department |
| `responses.sent_by` | the agent who sent the reply |
| `templates.updated_by` | who last edited the template |
| `audit_log.actor` | who did the action |
| `approvals.approver` | the manager who decided |

**What each table holds**

| Table | Holds | Used from |
| --- | --- | --- |
| `profiles` | One row per user: name, role, department, depot. Created automatically when an account is added, with the role *staff*. Relay has no public sign-up: accounts are added for people. | Sprint 1 |
| `tickets` | Every request, with its department, priority, status and four timestamps | Sprint 1 |
| `classifications` | Every routing decision the AI made: department, confidence, model version, and any human override | Sprint 1 |
| `templates` | Approved reply wording for each department, which the AI builds on | Sprint 1 |
| `responses` | The AI's draft **and** the final text the agent sent, the tone, and who sent it when | Sprint 1 |
| `audit_log` | An append-only record of important actions (for example classify, reroute, draft, send) | Sprint 1 (re-routing); Sprint 3 (full audit) |
| `approvals` | Manager sign-offs for requests that need them | Sprint 4 |

**Design decisions in the data model**

- **Four timestamps on every ticket** (`created_at`, `assigned_at`, `answered_at`, `closed_at`). They let the Sprint 2 dashboard measure response times, and give the Sprint 3 forecast the history it needs, without changing the table later.
- **Classifications are kept, never overwritten.** When an agent re-routes a ticket, the AI's original decision stays alongside the override. That shows how often the AI was right, which feeds the Sprint 3 risk report.
- **Replies store both the AI draft and the final text.** We can show exactly what the AI suggested and what a person changed. This is a core part of using AI responsibly.
- **Historical tickets are marked** with `is_historical`, so a year of seeded past requests can feed the dashboards and forecasts without mixing with live work.
- **Fixed lists are database types** (`user_role`, `department`, `ticket_status`, `ticket_priority`, `reply_tone`), so the database itself rejects a misspelt department or status.
- **Every change to the structure is a numbered migration** in `supabase/migrations/` (`0001` to `0004` so far), reviewed in a pull request like any other code. Anyone can rebuild the database by running them in order.

| Migration | What it adds |
| --- | --- |
| `0001_initial_schema.sql` | All seven tables and the fixed-list types; row-level security switched on everywhere |
| `0002_profiles_on_signup.sql` | A profile is created automatically for each new user; users can read their own profile |
| `0003_tickets_privacy.sql` | Who can read and create tickets, plus helper functions for a user's role and department |
| `0004_team_policies.sql` | Rules for ticket updates, classifications, templates, replies and the audit log, plus the `reroute_ticket` function |

---

## 5. Request flow (submit to reply)

*To be written in S1-24 (Wed 28 Oct).*

## 6. How the design supports Sprints 2–4

*To be written in S1-24 (Wed 28 Oct).* Planned changes to cover, from the roadmap:

| Sprint | Planned change to the design |
| --- | --- |
| 2 | Manage users screen (managers add users and set roles; Supabase invite emails; public sign-up off) · `tickets.assigned_to` column for "Assign to me" · priority chosen on submit · new `reports` table · weekly report on a schedule (Vercel Cron) · Gemini writes insights from numbers calculated in code |
| 3 | Forecast backtest · flags on responses (new columns or table) · audit entries for classify, draft and send · `/api/classify` behind sign-in or a rate limit |
| 4 | Request type and amount on tickets · approval rules and `approvals` rules (RLS) · automatic assignment and escalation · email notifications (e.g. Resend) |

## 7. Security, roles and responsible AI

*To be written in S1-24 (Wed 28 Oct).*
