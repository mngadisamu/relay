# Rollout checklist: companies, demo and admin (for Samukelo)

**Status as of Mon 23 Nov 2026**, checked against the live Supabase project (`krxzxwulkdxhirgarkwa`) and the demo project (`bkdqnndsevayxpjckubw`). This replaces the earlier draft runbook: the drafts were applied as numbered migrations (0030 to 0038). The full migration table is in [AGENTS.md](../AGENTS.md), section 5.

Samukelo owns migrations and approves each one. Run each new migration on a Supabase branch first, then on the live project, and check each result with a `select`.

## 1. Done

| Item | Live | Demo | Check |
| --- | --- | --- | --- |
| Companies, platform admins, company settings, platform company people (0030 to 0035) | Applied | Partly: 0035 functions missing | `select slug from companies;` |
| Demo reset (0031) | Applied | Applied | `reset_demo_company` exists |
| Demo AI cap (0036) | Applied | **Not applied** | `use_demo_gemini_call` exists |
| Create company (0033) | Applied | **Not applied** | `create_company` exists |
| Department scope for people, reports and risk (0025, 0026, 0038) | Applied | Applied | `list_people` exists |
| Platform admin account | One row in `platform_admins` | None | `select count(*) from platform_admins;` |
| `invite-user` Edge Function with company admin and platform email change | Deployed (version 7) | Not checked | Supabase → Edge Functions |
| Weekly reports cron (Mondays 06:00 UTC, 08:00 SAST) | Scheduled | Scheduled | `select * from cron.job;` |

## 2. Not done

1. **Auto-assign (0028)** is on live (checked 25 Nov). Check that `auto_assign_ticket` exists after any database change.
2. **Escalation (0029)** is not on live, so the `escalate-urgent` job every 15 minutes is not scheduled. The demo has it.
3. **Demo database:** add 0033, 0035 and 0036, or the platform admin area and the AI cap will not work there. Its migration history is empty, so record which migrations it has.
4. **Demo platform admin:** the demo has no platform admin row yet.
5. **Company addresses (P7):** no sign of them in the code or the database. Check the `RELAY_BASE_DOMAIN` value in Vercel: if it's blank, every company signs in on the one address. Setting it up needs a domain you control and a wildcard in Vercel (the default `vercel.app` address can't have company subdomains).
6. **Demo nightly reset (02:17 SAST):** check the first run in the Vercel logs. It is not in the Supabase `cron.job` list, so confirm where it is scheduled.

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
