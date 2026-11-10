# Audit actions (S2-07, contract 3)

Every AI decision and every human change in Relay writes one row to `audit_log`.
This page is the single list of those rows, so every feature records its work the
same way and the audit log screen (S2-12) and risk report (S2-30) can read them.

**Adding a new action?** Add it to this table in the same pull request.

## Rules for every entry

- **`actor`** is the signed-in user's id (`auth.uid()`). Row-level security refuses anything else.
- **`ticket_id`** is set when the action is about a ticket, and left empty otherwise.
- **`details`** holds ids and short values only. Never copy a request, reply or message text into it:
  the text already lives in its own table, and the audit log is read by more people (POPIA).
- **`created_at`** is the time of the action. It's stored in UTC; screens show it in South African time.
- Entries are **never edited or deleted** (there are no update or delete rules on `audit_log`).
- Write the entry in the **same step** as the change: inside the database function, or straight
  after the change in the same server action.

## The actions

| Action | Written by (where) | When | `ticket_id` | `details` |
| --- | --- | --- | --- | --- |
| `classify` | The staff member who sent the request (`src/app/staff/actions.ts`) | The AI routes a new request | yes | `department` (where it went), `confidence` (0 to 1), `model_version`, `needs_review`, `sensitive` (`conduct`, `wellbeing`, `incident`, `security`, `personal` or null), `routed_by_rule` (true when the sensitive-request rule sent it somewhere other than the AI's choice) |
| `draft` | The agent (`src/app/api/generate-draft/route.ts`) | An AI draft is made or remade in a tone | yes | `tone`, `ai_generated` (false when the template was used: Gemini failed, or the request is sensitive), `response_id`, `template_id`, `sensitive` (true when the text was kept away from Gemini) |
| `send` | The agent (`src/app/agent/[id]/actions.ts`) | A reply is sent | yes | `tone`, `response_id`, `edited_ai_draft` (true when the reply started from a saved draft; compare `responses.ai_draft` with `final_text` to see how much changed) |
| `reroute` | The agent or manager (`reroute_ticket()`, migration 0004) | A ticket is moved to another department | yes | `from`, `to` (departments) |
| `confirm_department` | The agent or manager (`confirm_department()`, 0006) | "Department is correct" on a Needs review ticket | yes | `department` |
| `assign` | The agent or manager (`assign_ticket()`, 0006) | Take ticket, or a manager assigns it | yes | `assigned_to` (profile id), `previous` (profile id or null) |
| `close` | The sender, agent or manager (`close_ticket()`, 0006) | "This solved it", or Close ticket | yes | `closed_by_role` (`staff`, `agent` or `manager`) |
| `reopen` *(added by 0006)* | The sender (`reopen_ticket()`, 0006) | "I still need help" | yes | `message_id` (row in `ticket_messages`) |
| `template_edit` | The agent or manager (`src/app/agent/templates/actions.ts`) | A reply template is saved | no | `template_id`, `department`, `name` |
| `user_create` | The manager (Manage users, S2-25: the invite-user Edge Function calls `set_user_role()`, migration 0012, as the manager) | A person is added | no | `user_id`, `role`, `department` (no email: it's in `auth.users`) |
| `role_change` | The manager (Manage users, S2-25: `set_user_role()`, migration 0012) | A role or department changes | no | `user_id`, `from_role`, `to_role`, `from_department`, `to_department` |
| `user_deactivate` | The manager (Manage users, "Remove from Relay", S2-35: `deactivate_user()`, migration 0013) | A person who left is switched off: they can't sign in, and their unanswered tickets go back to the inbox | no | `user_id`, `role`, `department`, `tickets_returned` |
| `user_reactivate` | The manager (Manage users, "Bring back", S2-35: `reactivate_user()`, migration 0013) | A removed person is switched back on, with the role they had | no | `user_id`, `role`, `department` |
| `user_update` | The manager (Manage users, "Edit details", S2-36: `update_user_details()`, migration 0015) | A person's name or depot changed | no | `user_id`, `changed` (the fields, e.g. `["full_name", "depot"]`; never the old or new values) |
| `user_email_change` | The manager (Manage users, "Edit details", S2-36: the invite-user Edge Function) | A person's sign-in email changed | no | `user_id` (never the address) |
| `password_reset_sent` | The manager (Manage users, "Send password reset", S2-36: `reset_email_for()`, migration 0015) | A "choose a new password" link was sent to someone | no | `user_id` |
| `insight_generate` | The manager who opens it (`src/lib/insights.ts`, S2-28) | Gemini writes a weekly summary | no | `insight_id`, `department` (or null for all), `period_from`, `period_to` (the exact period the summary covers), `ai_generated` (false if the numbers-only fallback was used) |
| `report_download` | The manager (PDF route, S2-19) | A report PDF is downloaded | no | `report_id` (null for an unsaved preview), `department`, `week_start` |
| `risk_report_download` | The compliance officer or manager (Risk report, Export PDF, S2-30) | A risk report PDF is downloaded | no | `from`, `to` |
| `flag` | The agent who sent the reply (automatic check in `sendReply`, `src/lib/flags.ts`), or an agent, manager or compliance officer (Flag button) (`flag_reply()`, migration 0011) | An AI reply is flagged for a second look | yes | `flag_id`, `response_id`, `reason` (`Sent without edits`, `Possible invented detail` or `Flagged by a person`; the written reason stays in `flags.note`, not here), `source` (`auto` or `person`) |
| `flag_resolve` | The compliance officer (Flagged replies, `resolve_flag()`, migration 0011) | A flag is reviewed | yes | `flag_id`, `outcome` (`ok` or `needs_change`); the note stays in `flags.resolution_note` |

## How to read it

- A ticket's whole history: `select * from audit_log where ticket_id = 42 order by created_at;`
  It runs `classify` → (`confirm_department` or `reroute`) → `assign` → `draft` → `send` → `close`
  (or `reopen`, then round again).
- How often people overrule the AI: count `reroute` against `classify` for the same period.
- How often AI drafts go out unchanged: `send` entries where `edited_ai_draft` is true, joined to
  `responses` to compare `ai_draft` and `final_text`.

Only managers and compliance can read `audit_log` (migration 0004).