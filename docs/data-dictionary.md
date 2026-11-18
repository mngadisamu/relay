# Data dictionary

Every table is in the `public` schema of the Supabase Postgres database. Row-level security is on for every table. Who can read or write what is in [`architecture.md`](architecture.md) (section 4) and in `AGENTS.md` (section 5). This file lists the columns.

Times are stored in UTC. Show them in South African time (`Africa/Johannesburg`).

## Enums

| Enum | Values |
| --- | --- |
| `user_role` | `staff`, `agent`, `manager`, `compliance` |
| `department` | `HR`, `IT`, `Finance`, `Operations` |
| `ticket_status` | `received`, `assigned`, `awaiting_approval`, `answered`, `closed` |
| `ticket_priority` | `low`, `medium`, `high`, `urgent` |
| `reply_tone` | `formal`, `friendly`, `urgent` |
| `request_type` | `purchase`, `leave`, `system_access`, `other` |

## profiles

One row per person. Created automatically when an account is added.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, not null | Same as the sign-in user's id. |
| `full_name` | text, not null | |
| `role` | `user_role`, not null | Default `staff`. |
| `department` | `department` | Agents and department managers have one. A manager without one is a general manager. |
| `depot` | text | Head office, City Deep, Pomona. |
| `created_at` | timestamptz, not null | |
| `active` | boolean, not null | `false` means the person has left. Never delete a profile. |
| `deactivated_at` | timestamptz | |
| `deactivated_by` | uuid | The manager who removed the person. |

The email address is in Supabase's `auth.users`, not here.

## tickets

One row per request.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint, not null | |
| `reference` | text, not null | Generated, for example `KF-261105-0042` (date in South African time, then a number). |
| `submitted_by` | uuid | The person who sent it. |
| `subject` | text, not null | |
| `description` | text, not null | |
| `depot` | text | |
| `department` | `department` | Where it was routed. Changes only through `reroute_ticket()`. |
| `priority` | `ticket_priority`, not null | Default `medium`. |
| `status` | `ticket_status`, not null | Default `received`. |
| `needs_review` | boolean, not null | `true` when the model's confidence was below 0.6. |
| `is_sensitive` | boolean, not null | Set by the word rules in `src/lib/sensitive.ts`. |
| `sensitive_kind` | text | `conduct`, `wellbeing`, `incident`, `security` or `personal`. |
| `request_type` | `request_type` | Purchase, leave, system access or other. Set when a request type is sent; the submit form does not ask for one yet (S4-01). |
| `amount` | numeric | The purchase amount, in rand. |
| `is_historical` | boolean, not null | `true` for the seeded past tickets. |
| `assigned_to` | uuid | The agent who took the ticket. |
| `created_at` | timestamptz, not null | |
| `assigned_at` | timestamptz | |
| `answered_at` | timestamptz | |
| `closed_at` | timestamptz | |

## classifications

Every routing decision the model made, kept for the audit. Never overwritten.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint, not null | |
| `ticket_id` | bigint, not null | |
| `predicted_department` | `department`, not null | The model's own choice, even when the sensitive rule sent the ticket elsewhere. |
| `confidence` | numeric, not null | 0 to 1. |
| `model_version` | text, not null | For example `tfidf-logreg-v2`. |
| `overridden_by` | uuid | The agent or manager who changed the department. |
| `overridden_department` | `department` | The new department. |
| `confirmed_by` | uuid | Who confirmed the department is correct. |
| `confirmed_at` | timestamptz | |
| `created_at` | timestamptz, not null | |

## responses

An AI draft and what was finally sent. Staff can't see a draft until it is sent.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint, not null | |
| `ticket_id` | bigint, not null | |
| `template_id` | bigint | The template the draft started from, if any. |
| `tone` | `reply_tone`, not null | Default `formal`. |
| `ai_draft` | text | Exactly what the AI wrote. Kept even after editing. |
| `final_text` | text | What the agent sent. |
| `ai_generated` | boolean, not null | Default `true`. |
| `sent_by` | uuid | |
| `sent_at` | timestamptz | Empty until the reply is sent. |
| `created_at` | timestamptz, not null | |

## templates

Reply templates for each department. Formal, friendly and urgent for each, plus a "Sensitive" template for HR, IT and Operations.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint, not null | |
| `department` | `department`, not null | |
| `name` | text, not null | |
| `body` | text, not null | |
| `updated_by` | uuid | |
| `created_at` | timestamptz, not null | |
| `updated_at` | timestamptz, not null | |

## ticket_messages

A staff member's "I still need help" message, added with `reopen_ticket()`.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint, not null | |
| `ticket_id` | bigint, not null | |
| `author` | uuid, not null | |
| `body` | text, not null | |
| `created_at` | timestamptz, not null | |

## approvals

One row per request that needs a manager's decision.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint, not null | |
| `ticket_id` | bigint, not null | |
| `requested_by` | uuid | The person who asked. Nobody decides their own request. |
| `requested_at` | timestamptz, not null | |
| `approver` | uuid | The manager who decided. |
| `decision` | text | `pending` (default), `approved` or `rejected`. |
| `decided_at` | timestamptz | |
| `decision_note` | text | Required when rejecting. |
| `created_at` | timestamptz, not null | |

## flags

An AI reply marked for a second look by a person or the automatic check.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint, not null | |
| `response_id` | bigint, not null | |
| `ticket_id` | bigint, not null | |
| `kind` | text, not null | `sent_without_edits`, `invented_detail` or `person`. |
| `source` | text, not null | `auto` or `person`. |
| `note` | text | |
| `flagged_by` | uuid, not null | |
| `created_at` | timestamptz, not null | |
| `resolved_by` | uuid | Compliance only. |
| `resolved_at` | timestamptz | |
| `outcome` | text | `ok` or `needs_change`. |
| `resolution_note` | text | |

## audit_log

Every action, append-only. The list of actions and what goes in `details` is in [`audit-actions.md`](audit-actions.md).

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint, not null | |
| `actor` | uuid | The signed-in user. |
| `action` | text, not null | For example `classify`, `assign`, `approval_request`, `approval_decision`. |
| `ticket_id` | bigint | Empty for actions that are not about one ticket. |
| `details` | jsonb | The fields listed for each action in `audit-actions.md`. No email addresses. |
| `created_at` | timestamptz, not null | |

## insights

The weekly AI summary for the dashboard.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint, not null | |
| `week_start` | date, not null | |
| `department` | text | Empty means all departments. |
| `summary` | text | |
| `metrics` | jsonb, not null | The numbers the summary was written from. |
| `status` | text, not null | |
| `period_from` | date, not null | |
| `period_to` | date, not null | |
| `created_by` | uuid | |
| `created_at` | timestamptz, not null | |

## reports

Saved weekly reports.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, not null | |
| `department` | `department`, not null | |
| `week_start` | date, not null | |
| `metrics` | jsonb, not null | |
| `ai_summary` | text | |
| `forecast` | jsonb, not null | The forecast saved with the report. |
| `created_at` | timestamptz, not null | |
