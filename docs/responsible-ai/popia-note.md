# POPIA note (S2-31)

**Owner:** Samukelo · **Last updated:** Mon 9 Nov 2026 · **Status:** the team's working understanding, not legal advice

The Protection of Personal Information Act (POPIA) governs how Relay handles personal information about staff and anyone else who writes to the help desk. This note explains how Relay meets the main requirements, and what Kopano Freight's information officer must still confirm.

## 1. What personal information Relay holds

| Information | Where it lives | Why we need it |
| --- | --- | --- |
| Name, work email, depot, role | `profiles` | To sign in, route work and show who did what |
| Request subject and description | `tickets` | To answer the request. These are often personal: payslips, leave, medical aid, disciplinary matters |
| Health and wellbeing | Inside request text, marked *Sensitive: personal* or *Sensitive: wellbeing* | Only so the right person can reply with care |
| Replies (AI draft and final text) | `responses` | To show what was sent, and what the AI suggested |
| Who did what, and when | `audit_log` (no names or emails are written in it, only which fields changed) | Accountability |
| Classifier results | `classifications` | To show how routing was decided |

Relay does not store passwords. Supabase stores them hashed.

## 2. How the POPIA conditions are met

| POPIA condition | How Relay meets it |
| --- | --- |
| **Accountability** | A named owner for the system (the team lead, Samukelo, for the build; Kopano Freight's information officer for the company). This note and the risk register are kept up to date |
| **Processing limitation** | Only what a request needs is used. The classifier reads the subject and description; the depot is a separate field and is not sent to it |
| **Purpose specification** | Requests are used to answer the person and to route the work. They are not used for anything else |
| **Further processing** | The Sprint 2 dashboard and reports use counts, not the request text. The forecast uses counts per day |
| **Information quality** | Agents check every reply. Invented details are flagged. Wrong routings can be changed and are recorded |
| **Openness** | Staff can see their own requests and replies. This note explains the AI use. Kopano Freight must tell staff in its own privacy notice (section 6) |
| **Security safeguards** | Row-level security in the database, sign-in for every page, secret keys kept off the app and browser, append-only audit log. See [security.md](../security.md) |
| **Data subject participation** | Staff can see their requests. A process to answer access and correction requests is still open (section 6) |

## 3. Who else handles the information (operators and transfers)

Relay uses these outside services:

| Service | What it gets | Where it is hosted | Note |
| --- | --- | --- | --- |
| **Supabase** (database and sign-in) | Everything in section 1 | The project's region (to confirm in the Supabase dashboard) | Must have a written operator agreement with Kopano Freight |
| **Vercel** (hosting) | Requests and replies as they pass through the app | Vercel's network | Must have an operator agreement |
| **Google Gemini** (reply drafts) | The request subject and description, the department template, the person's name and depot, for **non-sensitive** requests only | Google's servers, likely outside South Africa | **Open:** a transfer outside South Africa needs a basis under POPIA section 72. See section 4 |
| **Gmail SMTP** (emails from Supabase, for invites and resets) | The person's name and email address | Google | Must have an operator agreement, or Kopano Freight's own email domain |

Relay sends **no sensitive request text** to Gemini. Sensitive requests are found by word rules before any AI call (see `src/lib/sensitive.ts`).

## 4. The Gemini question, for Kopano Freight to decide

Non-sensitive requests still contain names, depots and details of people's work. These are sent to Gemini to write a draft. Options:

1. **Accept the transfer** with a written agreement from Google and a basis under POPIA section 72 (for example, the person's consent, or the agreement's adequate protection). Kopano Freight tells staff.
2. **Remove names and depots** from the text before it is sent, and put the name back in the reply afterwards. This reduces what is sent but does not remove all personal information, since the request itself can describe a person.
3. **Use a South African or locally hosted model** for drafts. This would need a new story and a bigger change.

The team's recommendation for the pilot is option 2 now, with option 1 or 3 decided before live use.

## 5. Keeping information, and deleting it

- **Retention:** no period has been agreed. Suggested for discussion: keep live requests for a set number of years after closing (to match Kopano Freight's record-keeping rules), then delete or anonymise them. Former staff are **removed, not deleted** (S2-35), so their history stays.
- **Deletion:** there is no delete button yet. A deletion process must be agreed before live use.

## 6. What Kopano Freight still has to do

- [ ] Appoint or confirm its **information officer**, and register with the Information Regulator if required.
- [ ] Decide on the **Gemini transfer** (section 4).
- [ ] Sign **operator agreements** with Supabase, Vercel, Google (Gemini and email) and any other service.
- [ ] Confirm the **Supabase project region**.
- [ ] Agree a **retention period** (section 5).
- [ ] Write a **staff privacy notice** that covers the help desk and the AI use.
- [ ] Write a **process for access and correction requests** from staff.
- [ ] Write a **breach response procedure**, including when to report to the Information Regulator and to the people affected. Security requests in Relay are already routed to IT as high priority and flagged for a manager or compliance.

## 7. Automated decisions

POPIA section 71 limits decisions that have legal effect on a person and are made only by automated processing. Relay's routing decides which team sees a request. No decision about a person's pay, job or rights is made by the AI. An agent reviews every reply, and every routing under 60% confidence waits for a person. We have designed Relay so a person stays in the loop, and we'll state this clearly to staff.
