# Approval rules: test record (S4-02)

Each row of the rules table in `docs/approval-rules.md` was checked against the rule logic in
migration 0020 (`request_approval`), run as a read-only query on the live database on Mon 16 Nov 2026.
The check uses the same condition as the function: leave always needs sign-off, and a Finance purchase
needs it only when the amount is over R5,000.

| # | Test request | Expected | Logic check | Form check (S4-07) |
|---|---|---|---|---|
| 1 | Finance purchase, R6,000 | Needs sign-off | Pass | Not run yet: the S4-07 form is on main, so test it on the preview |
| 2 | Finance purchase, R5,000 | No sign-off | Pass | Not run yet: test on the preview (S4-07 form is on main) |
| 3 | Operations purchase, R9,000 | No sign-off | Pass | Not run yet: test on the preview (S4-07 form is on main) |
| 4 | HR leave request, no amount | Needs sign-off | Pass | Not run yet: test on the preview (S4-07 form is on main) |
| 5 | IT system access request | No sign-off | Pass | Not run yet: test on the preview (S4-07 form is on main) |

The form checks are repeated on the preview once S4-07 is merged. Any Fail is raised with the team
before code is changed.
