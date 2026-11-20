# Platform plan: system admin and many companies

**Status: plan only.** Nothing here is built, and no migration is live. The demo (`docs/kopano-demo.md`) is the first step.

## Goal

One Relay can host several companies. Each company has its own departments, depots, people, and company admin. A **system admin** (a platform admin) creates companies, sets their rules and sees counts across all companies, but cannot read ticket text or replies unless support access is granted.

## Rules (from the security note, `docs/security.md`)

1. Every company is a row in `companies`. Every company-owned table gets a `company_id`. Row-level security checks the caller's company.
2. Platform admins are listed in `platform_admins` (draft `supabase/drafts/0028_platform_admins.sql`). Only functions read that table.
3. A platform admin sees counts (people, tickets, replies, emails), never ticket text, replies or names, unless a company grants time-limited support access, which is logged.
4. A company admin manages people in their own company only.
5. Domain rules are optional and per company (for example, only `@kopanofreight.example` may be invited). They are checked in the invite function.
6. **Two-step sign-in is on for every real company** and set by a `require_two_step` flag that only the platform admin can change. Demo accounts are the only exception.

## Stories

| # | Story | Done when |
| --- | --- | --- |
| P1 | `companies` table and `company_id` on every company table, backfilled to Kopano | Existing pages still show Kopano only; a second test company sees none of Kopano's rows |
| P2 | Company-aware RLS on tickets, profiles, templates, responses, audit log, flags, approvals | Cross-company tests fail as expected (a user of company B reads nothing from company A) |
| P3 | System admin page `/system`: create company, list companies, counts per company | Only platform admins reach it; counts match SQL |
| P4 | Company tabs on Manage users (people, departments, depots, domains) | A company admin sees only their company |
| P5 | Support access: request, time limit, audit entry | Expired access stops working on the next request |
| P6 | Classifier per company, or one model with a label map (decision below) | Kopano's results are unchanged |
| P7 | Subdomain or path per company (decision below) | Each company's login goes to its own address |

## Phases

1. Plan and decide (this document, the decisions below).
2. Demo (`docs/kopano-demo.md`), on the single Kopano company.
3. Companies foundation (P1, P2) with cross-company tests in CI.
4. System admin page and company tabs (P3, P4).
5. Support access and per-company classifier (P5, P6).

## Decisions (confirmed 19 Nov 2026)

- **Classifier:** one model with a label map per company (keeps Kopano's model and results unchanged).
- **Address:** subdomain per company (needs a wildcard domain).
- **Database:** one database with row-level security for the bootcamp.
- **Platform admin:** a separate sign-in from any company account.
- **After the bootcamp:** showcase only, unless the team decides to keep it running.

- **Departments (19 Nov, revised):** stay fixed as HR, IT, Finance and Operations for every company. Per-company departments were considered and dropped: they would change the classifier, routing, RLS and reports. Depots and allowed email domains are per company (P4).

## Phase 3 progress

- P1 and P2: draft migration `supabase/drafts/0030_companies_foundation.sql` and cross-company tests `supabase/drafts/0030_companies_tests.sql`. Not run. The tests must run on a Supabase branch before live.
- Security approach: a restrictive "Same company only" policy on each company table, so existing policies (0003 to 0027) are not dropped.
- Known temporary step: new profiles fall back to Kopano until company-aware invites (P4).

## Two-step and company addresses (19 Nov, P6 and P7)

- **P6 (classifier):** nothing to build. One model serves every company, and departments are fixed.
- **Two-step:** the company's `require_two_step` setting now decides the two-step check for managers and compliance. If the company can't be read (before migration 0030 runs), the check stays on. Extending two-step to staff and agents is a decision for the team, because every staff member would have to set it up.
- **Company addresses (P7):** with `RELAY_BASE_DOMAIN` set, a company's address (for example kopano.relay.example) only lets in its own people. Signing in from another company's address redirects to the login page. Before the variable is set, nothing changes.
- **Samukelo's steps:** buy a domain you control, add it to Vercel with a wildcard (`*.<domain>`), point DNS at Vercel, and set `RELAY_BASE_DOMAIN` in Vercel for Production and Preview. The default vercel.app address can't have company subdomains.
