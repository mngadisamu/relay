# Relay design (Sprint 1)

Design work for Relay, the Kopano Freight help desk. Owner: Mihlali (F3 · Staff request portal, UI/UX).

The live, editable versions are on the team's design canvas (ask Mihlali or Samukelo for access). The PDFs here are exports of that canvas.

| File | Story | What it is |
| --- | --- | --- |
| [personas.pdf](personas.pdf) | S1-03 | One persona per role: staff (driver), agent, manager, compliance. Goals, frustrations and what Relay must do for each |
| [journey-map.pdf](journey-map.pdf) | S1-03 | The staff persona's journey in 8 steps, from a declined fuel card to reading the reply |
| [wireframes.pdf](wireframes.pdf) | S1-07 | Low-fidelity wireframes of the 7 Sprint 1 screens: login, submit request, My requests, request detail, agent inbox, ticket view, template library |
| [review/S1-11-review-sheet.pdf](review/S1-11-review-sheet.pdf) | S1-11 | The colleague review sheet. Replace it with the filled-in sheet (a photo or scan is fine) after the review |
| [style-guide.pdf](style-guide.pdf) | S1-12 | Colours (with contrast ratios), type, spacing, components and the values for `src/app/globals.css` |
| [mockups.pdf](mockups.pdf) | S1-22, S1-26, S1-19, S1-23, S1-27 | High-fidelity screens the code is built to: sign in (phone and desktop), submit request, request sent, My requests, request detail, agent inbox, ticket view, template library |

## Design rules every screen follows

- Phone first for staff (works at 360 px); desktop for agents.
- Every input has a visible label; errors are shown in words with `role="alert"`.
- Status is shown in words **and** colour (Received, Assigned, Answered, Closed), never colour alone.
- Every AI draft is labelled "AI-drafted" and can be edited before it is sent.
- Agents see the depot, not the submitter's name (agents can't read other people's profiles in Sprint 1).
