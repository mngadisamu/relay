# Security: accounts and access

How Relay protects people's accounts and decides who can manage whom. Owner: Samukelo. Read this before changing anything
about sign-in, roles, Manage users or the database rules, and say in your PR which rule below it touches.

Written Fri 6 Nov 2026, after feedback that account management was the weakest part of another bootcamp project.

## The rules for managing accounts

| Who | Add people | Change roles | Remove people who leave |
| --- | --- | --- | --- |
| **General manager** (manager with no department) | Anyone, any role | Anyone except themselves | Anyone except themselves; never the last general manager |
| **Department manager** | Staff, and agents for their own department | Staff, and their own department's agents | Staff, and their own department's agents |

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

- **No two-step sign-in (MFA) yet.** Supabase supports authenticator apps for free; it should be required for managers and
  compliance before real use (Sprint 4).
- **A removed person's current sign-in can last up to an hour** in Supabase's own records, but it can't do anything: the rules
  give them no role, and Relay's pages treat them as signed out.
- **The built-in email only reaches the Supabase team**, a few emails an hour, and its templates can't be edited. Relay's
  own designs and the Gmail set-up are in [email-templates/README.md](email-templates/README.md); real use needs the
  company's own email domain.
- **Rate limits** on sign-in and invites are Supabase's defaults.

## Later: many companies on one Relay (system admin)

Relay is built for Kopano Freight now, but the plan is to offer it to any company. When that starts, these rules apply:

1. **Every company's data is separated in the database, not only on the page.** A `companies` table, a `company_id` on every
   table (profiles, tickets, templates, responses, audit log…), and every row-level security rule also checks
   `company_id = current_user_company()`. A test checks that a user from company A sees **0 rows** from company B, for every
   table.
2. **The system admin is not a company role.** Relay's own staff are listed in a separate `platform_admins` table, with
   two-step sign-in required. A system admin can create a company and invite its first general manager, and see usage
   numbers, but **can't read any company's tickets, replies or people** by default.
3. **Support access is asked for, time-limited and recorded.** If a company needs help, its general manager grants a system
   admin access for a set time (e.g. 24 hours); every grant and everything done with it is in that company's audit log.
4. **Each company manages its own people** with the rules above: its general managers are its admins. Nobody in one company can
   add, change or remove someone in another.
5. **Optional per company:** only allow emails from the company's own domain, and require two-step sign-in for everyone.
