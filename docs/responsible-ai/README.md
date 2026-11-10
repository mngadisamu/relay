# Responsible AI note (S2-31)

**Owner:** Samukelo · **Last updated:** Mon 9 Nov 2026 · **Status:** draft for review

This note says where Relay uses AI, what a person still decides, and where to find the evidence. It is written for Kopano Freight and for the Week 8 panel. Read it with:

- [risk-register.md](risk-register.md): every risk, what Relay does about it, and the screen or check that handles it.
- [popia-note.md](popia-note.md): how personal information is handled, and what Kopano Freight still has to decide.
- [prompt-and-template-notes.md](prompt-and-template-notes.md): exactly what the reply prompt asks for, and the ethics talking points.
- [bias-test.md](bias-test.md): the bias test, with its results and limits (classifier, depots and reply drafts by name).
- [bias-test-classifier.md](bias-test-classifier.md) and [bias-test-drafts.md](bias-test-drafts.md): every result behind the bias test.

## 1. Where Relay uses AI

| AI output | What it does | Model | Who checks it | Labelled in the app as |
| --- | --- | --- | --- | --- |
| Routing | Sends each request to HR, IT, Finance or Operations, with a confidence score | TF-IDF and logistic regression, trained in Google Colab, run in the app (no outside AI service) | Requests under 60% confidence are marked **Needs review**. An agent can move any request to another department, and every move is recorded | "Routed by AI · n% sure · an agent can change it" |
| Reply drafts | Writes a reply draft from the approved template, the request and the chosen tone | Google Gemini (`gemini-3.6-flash` once `fix/gemini-model` is merged) | An agent reads, edits and sends every reply. Nothing is sent automatically | "AI-drafted · check before sending" |
| Weekly summary (planned, S2-28 and S2-34) | A short AI summary of the week's numbers, for managers | Gemini | Shown only with the AI label; a manager reads it before it's used | Must show `AiNote kind="summary"` before it is released |
| Forecast (planned, S2-08 and S2-27) | Expected ticket numbers per department | A statistical method in `src/lib/forecast.ts`, tested against the last 8 weeks | Managers see the range, not a single number | Must show `AiNote kind="forecast"` before it is released |

## 2. What stays with a person

- **Every reply is a person's decision.** The draft is only text in a box. The agent edits it or writes their own, and presses Send.
- **Sensitive requests never reach Gemini.** Harassment, wellbeing, incidents, security and personal matters (health, disciplinary, dismissal) are found by plain word rules in `src/lib/sensitive.ts`. Their text is never sent to Gemini. They start from a "Sensitive" template, and the reply can't be sent unchanged.
- **Uncertain routing goes to a person.** Under 60% confidence, the ticket is marked **Needs review** and waits for an agent.
- **Everything is recorded.** Routing, drafts, sends, flags and risk-report downloads are written to the audit log, which can't be edited.
- **Nobody sees more than their job needs.** Row-level security in the database decides what each role can read ([security.md](../security.md)).

## 3. Principles we followed

1. **A person is always in the loop** for anything that reaches a staff member.
2. **Say when AI was used.** Every AI output has a label, and the Risk report checks each screen for one.
3. **Test for unfairness before trusting it.** The bias test changed the classifier's depot handling and records what it still gets wrong.
4. **Keep the evidence.** Both the AI's draft and the final text are stored. Every classification is kept, not overwritten.
5. **Fail safely.** If Gemini is slow or down, the approved template is used, and the Risk report shows how often that happened.
6. **Keep sensitive text away from outside services.** It stays inside Relay.

## 4. What is not done yet

These are open, and they're listed in the risk register with their status:

- The classifier still places some requests by depot name (two of 40 in the bias test), to be fixed at the next retrain.
- Reply drafts are longer for some names on some requests. We need more drafts per name before we can say whether that is a pattern.
- `/api/classify` is still open without sign-in (it's a read-only routing check, but it should have a rate limit).
- The weekly AI summary and the forecast screen aren't built yet, so they carry no label yet.
- Two-step sign-in (MFA) is not switched on for managers and compliance.
- The POPIA points for Kopano Freight to decide are listed in [popia-note.md](popia-note.md).
