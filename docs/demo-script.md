# Scripted demo and five-minute pitch (S4-21)

Use this script for the panel. It is the plan's F4 deliverable, so it belongs to Samukelo, but the whole team rehearses it. Each step names the account to sign in with. Passwords are shared privately by Samukelo and are never written here.

## Before the demo

- [ ] Run `node --env-file=.env.local scripts/reset-demo.mjs` on the live database, **after the team agrees**. It puts the demo back to the scripted set (a Finance purchase and a leave request awaiting approval, and an HR ticket with an AI draft).
- [ ] `manager@relay.test` and `compliance@relay.test` have set up their authenticator app. Check that both can sign in with a code.
- [ ] Keep the authenticator app on the presenter's phone, charged. There are no backup codes yet (see the gaps below).
- [ ] Open the live site in a private window, so the presenter is signed out at the start.
- [ ] Have screenshots of each step ready, in case the network fails on the day.

## The five minutes

| Time | Who | What to show | What to say |
| --- | --- | --- | --- |
| 0:00 to 0:30 | Nobody yet | The landing page | "Relay sends each staff request to the team that can answer it, and that team replies fast." |
| 0:30 to 1:30 | `staff@relay.test` | Submit a request (for example, a question about a payslip). Show the reference and the department it was routed to. | "Staff don't need to know who to ask. Relay routes it, and shows the reference so they can follow it." |
| 1:30 to 2:30 | `manager@relay.test` (with the code) | Approvals. Show the pending Finance purchase from the scripted set. Approve it, or decline it with a note. | "Big purchases and all leave need a manager. Nobody decides their own request, and the decision is recorded." |
| 2:30 to 3:30 | `agent@relay.test` or an HR agent | Open the HR ticket. Show the AI draft labelled **AI-drafted**, change the tone, edit it, and send it. | "The AI writes the first draft. The person reads it, changes it and sends it. Both the draft and the sent text are kept." |
| 3:30 to 4:30 | `compliance@relay.test` (with the code) | The audit log for the request just approved, and the risk report. | "Every action is in the audit log. Compliance can check the AI, and nothing is hidden from them." |
| 4:30 to 5:00 | Nobody | Business case figures, then questions | "Here is what it saves on our own numbers. The assumptions are labelled, and the pilot will test them." |

## If something goes wrong

| Problem | What to do |
| --- | --- |
| The AI draft is slow or fails | Relay uses the department's template text instead. Say so: the template is labelled, and the person still edits it. |
| The authenticator code is rejected | Check the time on the phone (codes depend on it). Try the next code. If it still fails, switch to the screenshot for that step. |
| The live site is down | Use the screenshots. Say what would have appeared. |
| The scripted approval has already been decided | Run the reset script again beforehand, or use the leave request instead. |

## Known gaps to say honestly

- **The submit form doesn't yet ask for the request type or amount** (S4-01). A purchase or leave request sent through the form doesn't wait for approval. The approval step in the demo comes from the scripted set. Say so if asked.
- **No backup codes for the second step.** A lost phone needs Samukelo to reset the authenticator in the Supabase dashboard.
- **There is no HR agent test account.** Use an agent from the test accounts, or ask Samukelo to add one before the demo.
- **Notices by email are not built.** Notices and their reset are open, so don't promise email in the pitch.
