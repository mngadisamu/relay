# Security: accounts and access

How Relay protects people's accounts and decides who can manage whom. Owner: Samukelo. Read this before changing anything
about sign-in, roles, Manage users or the database rules, and say in your PR which rule below it touches.

Written Fri 6 Nov 2026, after feedback that account management was the weakest part of another bootcamp project.

## The rules for managing accounts

| Who | Add people | Change roles | Remove people who leave |
| --- | --- | --- | --- |
| **General manager** (manager with no department) | Anyone, any role | Anyone except themselves | Anyone except themselves; never the last general manager |
| **Department manager** | Agents of their own department only | Their own department's agents only | Their own department's agents only |

A department manager also sees only their own department: its tickets, approvals, dashboard, forecast, reports and risk report (migrations 0024 to 0026). They don't see staff at all in Manage users: only a general manager adds, changes or removes staff. The `invite-user` function checks the same rule before it sends an invite.

Updating details (name, email, depot) and sending a password reset follow the same rules (S2-36). A manager can always
update their own name and depot.
| **Agent, staff, compliance** | No | No | No |

- **Nobody changes their own role or removes themselves.** A manager can't lock the company out or give themselves more power.
- **There is always at least one general manager**, so someone can always manage everyone else.
- **People who leave are removed, never deleted.** Their name stays on their tickets, replies and audit entries (compliance and POPIA record-keeping need it).

## Where each rule is enforced

The page hides what you can't do, but **the database decides**. Every rule above is checked inside a database function, so
it holds even if someone calls Supabase directly with their own sign-in and skips Relay's pages.

| What | Enforced in |
| --- | --- |
| Nobody can write to `profiles` directly (no update or insert rules); roles change only through `set_user_role()` | Row-level security, migrations 0002 and 0012 |
| A new account always starts as `staff`; the role is never read from the sign-up data | `handle_new_user()`, migration 0002 |
| Who may add, change or remove whom | `set_user_role()` (0012), `deactivate_user()` and `reactivate_user()` (0013) |
| A removed person has no role in any rule, can't sign in, loses their open sessions, and can't be assigned tickets | `current_user_role()`, `banned_until`, a trigger on `tickets` (0013); `getCurrentProfile()` and sign-in (app) |
| Sending an invite needs Supabase's secret key, which never enters Relay's code | The `invite-user` Edge Function holds it inside Supabase and acts as the manager for everything else |
| Updating details and sending a password reset | `update_user_details()`, `can_manage_user()`, `reset_email_for()` (0015); an email change goes through the `invite-user` Edge Function, which asks `can_manage_user()` as the manager first |
| Every account change is recorded, and the record can't be edited | `user_create`, `role_change`, `user_update`, `user_email_change`, `password_reset_sent`, `user_deactivate`, `user_reactivate` in `audit_log` (append-only), [audit-actions.md](audit-actions.md). Names and emails are never written into the log, only which fields changed |

## Other protections

- **No public sign-up.** Accounts only come from a manager's invite. Sign-up is switched off in Supabase.
- **Invite links work once**, for a limited time; a used or old link shows "This link has expired". The sign-in in the link is
  removed from the address straight away.
- **Sign-in doesn't reveal which emails exist**: a wrong email and a wrong password give the same message. Only someone with
  the right password learns that their account was switched off.
- **Passwords** are at least 8 characters (the Welcome page). Supabase stores them hashed; Relay never sees or stores them.
- **Forgot your password** (S2-36) gives the same answer whether or not the email is in Relay, so nobody can use it to find
  out who works there. The link works once, for an hour, and in any browser; it only opens "Choose a new password". A
  removed person's link doesn't sign them in. Managers can send the same link from Manage users; they never see or set
  anyone's password.
- **Emails are only shown to managers** (`list_people()`, 0012), and never written into the audit log.
- **Secrets:** the secret (service-role) key is only in the Edge Function's environment and the local seed script, never in
  app code, the browser or Git.
- **Forms are server actions**, which Next.js protects against requests from other sites.

## Settings to check in the Supabase dashboard

These live in Supabase, not in Git, so check them after any change to the project:

- **Authentication → Sign In / Providers:** "Allow new users to sign up" is **off**. Minimum password length **8**, with
  letters and digits required.
- **Authentication → URL Configuration:** Redirect URLs only list localhost, the live site and `https://relay-*.vercel.app/**`.
- **Edge Functions → invite-user:** deployed from `supabase/functions/invite-user/index.ts` on `main`.
- **Who has access to the Supabase project itself:** only the team. Anyone with dashboard access can change everything.

## Known limits (say these to the panel)

- **Two-step sign-in is required for managers and compliance officers** (S4-17). After the password, they enter a six-digit
  code from an authenticator app (`/mfa/enrol` first time, `/mfa/verify` after that). The gate is in
  `src/lib/supabase/middleware.ts`, and every private page and server action runs through it.
  - **`/api` routes:** the page gate doesn't run on `/api`, so the routes that managers and compliance use check the second step
    themselves with `secondStepMissing()` (`src/lib/mfa.ts`): the draft route and the three report routes. `/api/classify` needs a
    signed-in person only, and the Monday job (`/api/cron/weekly-summaries`) checks `CRON_SECRET` instead.
  - **Lost phone:** there are no backup codes and no self-service reset yet. Supabase's MFA doesn't provide backup codes, so adding them would be a new feature for the team to decide. Samukelo removes the authenticator in the Supabase dashboard
    (Authentication → Users → the person → multi-factor), and the person sets it up again at next sign-in.
  - Staff and agents do not have two-step sign-in. That is a decision for the team, not a gap in the code.
- **A removed person's current sign-in can last up to an hour** in Supabase's own records, but it can't do anything: the rules
  give them no role, and Relay's pages treat them as signed out.
- **The built-in email only reaches the Supabase team**, a few emails an hour, and its templates can't be edited. Relay's
  own designs and the Gmail set-up are in [email-templates/README.md](email-templates/README.md); real use needs the
  company's own email domain.
- **Rate limits** on sign-in and invites are Supabase's defaults.

## Many companies on one Relay (built, 23 Nov 2026)

Relay now holds several companies (migrations 0030 to 0038; the live database has eight). These are the rules as built. Where the built system differs from the first plan, the difference is stated.

1. **Each company's data is separated in the database, not only on the page.** A `companies` table, a `company_id` on the company tables, and a "Same company only" rule on each (migration 0032). The people list is limited to the caller's company (0038). The test script `0032_companies_tests.sql` checks that a user from one company can't see another's rows. Confirm it passed before relying on it, because the run isn't recorded in the repo.
2. **Platform admins are not a company role.** They are listed in `platform_admins` (0030), which nobody reads directly. Platform admins can:
   - see every company and its counts (`system_summary()`, `platform_list_companies()`),
   - create a company and invite its first system admin, who becomes a general manager of that company (`create_company()`, 0033, and `invite-user`),
   - see and edit the **people** in any company: name, department and depot (`platform_list_company_people()`, `platform_update_person()`, 0035), and change an email through `invite-user`.

   They **cannot** read tickets or replies. No row policy grants them access to those tables. **Difference from the first plan:** the plan said a system admin couldn't read a company's people by default. The built system lets platform admins see and edit them. The team needs to decide whether to keep this.
3. **Support access is not built.** There is no grant that lets a platform admin read a company's tickets for a set time. The plan (time-limited, recorded in that company's audit log) is still open. Until it is built, a platform admin can't see a company's tickets.
4. **Each company manages its own people.** General managers add, change and remove people in their own company only. Nobody in one company can change someone in another.
5. **Optional per company:** the allowed email domains (`companies.allowed_domains`, set on Manage users → Company, 0034) are built. Two-step sign-in can be required per company (`companies.require_two_step`), enforced in `src/lib/supabase/middleware.ts`.
6. **Open (23 Nov):** the `notices` and `email_outbox` tables have a "Same company only" rule for every command, so any signed-in person in a company can read and change those rows directly. The intended rule is that only the functions write them. This needs a new migration (Samukelo).

## Secret scan (18 Nov 2026)

The current files and the full git history were searched for key shapes (Supabase, Gemini, Resend, cron secret) and for passwords. Every match was a placeholder (`xxxxxxxx`), a password field in form code, a base64 image or text from the ticket dataset. No real secret was found. Re-run the scan before the panel and after any new key is added.
