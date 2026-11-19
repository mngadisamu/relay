# Accessibility review (WCAG 2.1 AA and 360 px)

Status: **first pass, from the code.** This is not the final audit. The final audit (S4-16) also needs a keyboard walk-through, a screen reader, an automated scan, and a check at 360 px on the Vercel preview. Those are listed under "Still to check" below.

## Screens reviewed

- Landing page (`src/app/page.tsx`)
- Sign-in and the second-step pages (`src/app/login/`, `src/app/mfa/`)
- Submit request (`src/app/staff/SubmitForm.tsx`)
- Request status in words and colour (`src/app/staff/status.ts`)
- Agent ticket view: reply box and the reason it is blocked (`src/app/agent/[id]/TicketReply.tsx`)
- Manager approvals queue and the approve or decline form (`src/app/manager/approvals/`)

## Method

- Read each screen's code for labels, error messages, headings, colour and touch size.
- Calculated the contrast ratio of each text colour against its background, using the colours in `src/app/globals.css`.

## Results

### Met from the code

| Rule | Where | Evidence |
| --- | --- | --- |
| 1.1.1 Text alternatives | Routing illustration on the landing page | `role="img"` with a full `aria-label`. |
| 1.3.1 Info and relationships | All forms | Every input has a `<label htmlFor>` matching its `id`. Headings go h1, then h2 and h3. |
| 1.3.1 Info and relationships | Submit request | Errors use `aria-describedby` and `aria-invalid`. |
| 1.4.3 Contrast (text) | All text colours | Lowest ratio 6.48:1 (error text in its box), against a 4.5:1 minimum. See the table below. |
| 1.4.1 Use of colour | Status pills | Each status has a text label as well as a colour, for example "Waiting for approval". |
| 3.3.1 Error identification | Sign-in, MFA, approvals, submit | Errors are shown as text, and the messages say what to do. |
| 3.3.2 Labels or instructions | Submit, MFA code, decline note | Each field has a visible label. The MFA code field says "Six-digit code". |
| 4.1.3 Status messages | Approvals decision, MFA errors | Errors use `role="alert"`, success uses `role="status"`. |
| 3.1.1 Language of page | `src/app/layout.tsx` | `<html lang="en">`. |

### Contrast

| Text | On | Ratio | Needs |
| --- | --- | --- | --- |
| Landing page text (`#d6e2f2`, `#b9cce6`) | Navy `#0b3d73` | 8.3:1, 6.66:1 | 4.5:1 |
| Error text (`#a4231a`) | White | 7.41:1 | 4.5:1 |
| Error text | Error box `#fdecea` | 6.48:1 | 4.5:1 |
| Approvals error text | Box `#fdf1ef` | 6.71:1 | 4.5:1 |
| Success text (`#1b6b36`) | White | 6.56:1 | 4.5:1 |
| "Waiting for approval" (`#8a3b00`) | `#fff0e3` | 6.96:1 | 4.5:1 |
| "Closed" (`#4a4f57`) | White | 8.24:1 | 4.5:1 |
| Own-request note (`#0b3d73`) | `#eef3fb` | 9.77:1 | 4.5:1 |

### First-pass findings (now fixed on main)

| # | Screen | Rule | Finding | Fix |
| --- | --- | --- | --- | --- |
| 1 | MFA set-up and code screens (`src/app/mfa/MfaForms.tsx`) | 1.3.1 | The error message is announced (`role="alert"`) but is not linked to the code field. | Done: the error has an `id`, and the code input has `aria-describedby` when there is an error. |
| 2 | Approvals decline form (`src/app/manager/approvals/DecisionForm.tsx`) | 1.3.1 | The "needed to decline" note field is not linked to its error message. | Done: the error is linked with `aria-describedby`. |

Neither gap stopped a person from completing the task, because the error was still announced. Both are fixed in the code on main (`src/app/mfa/MfaForms.tsx` and `src/app/manager/approvals/DecisionForm.tsx`). Check the fix on the Vercel preview, as listed below.

## Still to check (on the Vercel preview)

- **360 px layout, every screen above.** Check there is no sideways scrolling and that buttons and text don't overlap. The landing page's routing illustration is the most likely to overflow.
- **Keyboard only.** Tab through sign-in, MFA set-up, submit, the agent reply box and the approvals form. Check the focus ring is visible on each control (the shadcn default ring must not be removed).
- **Screen reader.** Check that the MFA QR code has its text alternative read out, and that the approval and error messages are announced.
- **Automated scan.** Run an automated checker on each screen and record anything it finds here.
- **Touch size.** The text links ("Back to inbox", "Forgot your password?") are about 28 px high. WCAG 2.1 AA does not set a minimum for this, but 44 px is better on phones. Check on a real phone.
