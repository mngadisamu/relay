# Rollout checklist: companies, demo and admin (for Samukelo)

**Status as of Wed 25 Nov 2026**, checked against the live Supabase project (`krxzxwulkdxhirgarkwa`) and the demo project (`bkdqnndsevayxpjckubw`). This replaces the earlier draft runbook: the drafts were applied as numbered migrations (0030 to 0039). The full migration table is in [AGENTS.md](../AGENTS.md), section 5.

Samukelo owns migrations and approves each one. Run each new migration on a Supabase branch first, then on the live project, and check each result with a `select`.

## 1. Done

| Item | Live | Demo | Check |
| --- | --- | --- | --- |
| Companies, platform admins, company settings, platform company people (0030 to 0035) | Applied | Partly: 0035 functions missing | `select slug from companies;` |
| Demo reset (0031) | Present but **locked** (25 Nov) | Applied, runs nightly | Live: `has_function_privilege('anon','public.reset_demo_company(text,text)','execute')` is `false` |
| Demo AI cap (0036) | Applied | **Not applied** | `use_demo_gemini_call` exists |
| Create company (0033) | Applied | **Not applied** | `create_company` exists |
| Department scope for people, reports and risk (0025, 0026, 0038) | Applied | Applied | `list_people` exists |
| Platform admin account | One row in `platform_admins` | None | `select count(*) from platform_admins;` |
| `invite-user` Edge Function, with the company name on manager invites too | Deployed (version 8, 25 Nov) | Not checked | Supabase → Edge Functions |
| Auto-assign (0028) and escalation (0029), with the `escalate-urgent` job every 15 minutes | Applied | Applied | `select jobname from cron.job;` |
| Company-scoped jobs, reports and summaries, grant hardening (0039) | Applied | Applied | `scheduled_companies` exists |
| Weekly reports cron (Mondays 06:00 UTC, 08:00 SAST) | Scheduled | Scheduled | `select * from cron.job;` |

## 2. Not done

1. **Demo database:** add 0033, 0035 and 0036, or the platform admin area and the AI cap will not work there. Its migration history is empty, so record which migrations it has.
2. **Demo platform admin:** the demo has no platform admin row yet.
3. **Company addresses (P7):** no sign of them in the code or the database. Check the `RELAY_BASE_DOMAIN` value in Vercel: if it's blank, every company signs in on the one address. Setting it up needs a domain you control and a wildcard in Vercel (the default `vercel.app` address can't have company subdomains).
4. **Demo nightly reset (02:17 SAST):** it is scheduled by Vercel, not Supabase (`vercel.json`, `17 0 * * *`, on the demo's Vercel project). Check a run in that project's logs.
5. **Leaked password protection** is off on live (Supabase security advisor). Turn it on in Authentication → Settings.

## 3. Checks before saying it is done

- `npx tsc --noEmit` and `npm run lint` pass on `main`.
- Each of the four test accounts (`staff`, `agent`, `manager`, `compliance` @relay.test) signs in and sees only its own company.
- A manager and a compliance account still get the two-step prompt.
- The new audit actions are in `docs/audit-actions.md`.
- The migrations in section 2 are in the table in AGENTS.md.

## 4. Open decisions (not built)

- Demo: block profile and password changes, block outbound email, and set a daily cap on Gemini calls (the cap migration is written, see item 3 above).
- Two-step for staff and agents: a team decision, because every staff member would need an authenticator app.
- Email from the demo: a decision is needed (see [kopano-demo.md](kopano-demo.md)). Options: a fixed recipient list, email off for the demo, or a separate demo deployment.
