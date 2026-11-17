# Approval rules (Sprint 4, S4-02)

These are the rules that decide whether a request needs a manager's sign-off. The database
(`request_approval` in migration 0020) and the submit form both follow this table. If a rule
changes, change this document first, then the code, in the same pull request.

Status: **agreed.** Kopano Freight is a fictional company, so the team makes the business
decisions and records them here (Mon 16 Nov 2026, Samukelo as the business analyst):
- Finance purchases over **R5,000** need a manager's sign-off. Purchases of R5,000 or less do not.
- **All leave** needs a manager's sign-off, whatever its length.

## The rules

| # | When a request is… | Needs sign-off? | Who decides | Test with |
|---|---|---|---|---|
| 1 | A purchase, classified to **Finance**, over **R5,000** | Yes | A manager of Finance, or a general manager | Finance purchase of R6,000 |
| 2 | A purchase of R5,000 or less | No | Not applicable | Finance purchase of R5,000 |
| 3 | A purchase classified to a department other than Finance | No | Not applicable | Operations purchase of R9,000 |
| 4 | A **leave** request, whatever the amount | Yes | A manager of the request's department, or a general manager | HR leave request, no amount |
| 5 | A system access or other request | No | Not applicable | IT system access request |

## How to read the table

- **Amount** is the value the person enters on the submit form. It is only used for purchases.
- **Department** is the department the ticket ends up in (the classifier's choice, or an agent's
  re-route). A purchase is checked against the department it ends up in, not the one first guessed.
- **A general manager** is a manager with no department. They can decide any approval.
- A request that needs sign-off moves to the status **Waiting for approval** until it is decided.

## Decisions and what happens next

- **Approved:** the ticket goes back into the normal flow (status Received), and the submitter is
  emailed once S4-10 is in.
- **Declined:** a reason is required. The ticket moves to Answered, so the submitter sees the
  decision and the reason in their request.
- Nobody can decide their own request. The database refuses it, as well as the screen.
- Only one approval can be pending on a ticket at a time.

## Tests (one per rule)

Run each test on the preview, with a fresh request for each row of the table, and record the result
in `docs/testing/approval-rules.md`:

1. Submit a Finance purchase of R6,000. The ticket must show **Waiting for approval**, and a manager
   must be able to see one pending approval.
2. Submit a Finance purchase of R5,000. It must not need approval.
3. Submit an Operations purchase of R9,000. It must not need approval.
4. Submit an HR leave request with no amount. It must need approval.
5. Submit an IT system access request. It must not need approval.

Each one is marked **Pass** or **Fail**. A fail is raised with the team before any code is changed.
