# Business case: Relay for Kopano Freight

Status: **draft with assumptions.** The volumes come from the database. The staff cost, minutes per ticket and exchange rate are **assumptions** the team must replace with real figures before the panel. The running costs are **current published prices**, checked on the dates shown.

Every number is labelled with its source:
- **Database:** a count from the `tickets` table.
- **Assumption:** a figure chosen for this draft, to be replaced.
- **Price:** a published price, with the date it was checked.
- **Calculated:** worked out from the rows above it.

## 1. Volume: what the help desk handles

| Department | Tickets, past 12 months | Per month (average) | Source |
| --- | --- | --- | --- |
| HR | 3,900 | 325 | Database |
| IT | 3,900 | 325 | Database |
| Finance | 3,900 | 325 | Database |
| Operations | 3,879 | 323 | Database |
| **Total** | **15,579** | **about 1,300** | Database |

The past-year tickets were seeded from a realistic pattern, not recorded (see `data/README.md`). Treat the volumes as the expected load, not a measured one.

## 2. Assumptions to replace

| Assumption | Value used | Replace with |
| --- | --- | --- |
| Loaded hourly cost of an agent (salary, benefits, overheads) | R250 per hour | Kopano Freight's real figure |
| Minutes an agent spends per ticket today (read, route, draft, send) | 12 minutes | Timed sample of real tickets |
| Minutes saved per ticket with Relay (AI routing and draft) | 5 minutes | Measured in the pilot |
| Exchange rate, rand per US dollar | R18 per USD | The rate on the day of the panel |
| Tokens per AI draft (input and output) | 1,500 in, 300 out | Read from the Gemini usage log |

## 3. Cost of current handling

| Item | Value | Source |
| --- | --- | --- |
| Cost per ticket today | 12 min ÷ 60 × R250 = **R50.00** | Calculated from the assumptions |
| Cost per year at 15,579 tickets | 15,579 × R50 = **R778,950** | Calculated (database volume × assumption) |

## 4. Time saved with Relay

| Item | Value | Source |
| --- | --- | --- |
| Saved per ticket | 5 min ÷ 60 × R250 = **R20.83** | Calculated from the assumptions |
| Hours saved per year | 15,579 × 5 ÷ 60 = **about 1,298 hours** | Calculated (database volume × assumption) |
| Value of the hours saved per year | 1,298 × R250 = **R324,562** | Calculated |

The reply is still checked and edited by a person, so the saving is the time the draft and the routing replace, not the whole ticket.

## 5. Running costs

| Service | Used for | Price used | Monthly / yearly | Source and date |
| --- | --- | --- | --- | --- |
| Supabase Pro | Database and sign-in | From $25 per month | $300 per year | Price, supabase.com/pricing, checked 18 Nov 2026 |
| Vercel Pro | Hosting, four developer seats | $20 per seat per month × 4 | $960 per year | Price, vercel.com/pricing, checked 18 Nov 2026 |
| Google Gemini API (3.8 Flash) | Reply drafts (not sent for sensitive requests) | $0.75 per million input tokens, $3.75 per million output tokens | about $35 per year | Price, benchlm.ai/google/api-pricing, checked 23 Oct 2026 |
| **Total** | | | **about $1,295 per year (about R23,311 at R18 per USD)** | Calculated |

Notes on the running costs:
- The Gemini price is an introductory rate that runs to 31 December 2026 and doubles on 1 January 2027. At the doubled rate the yearly figure is still about $70, so the total barely moves.
- Vercel's Hobby plan may be enough for a demo, but the Pro plan is used here, because the team has four developers and the figure is the stricter one.
- A spreadsheet of usage for the first month of live use would replace the estimates above.

## 6. Net value (calculated)

| Item | Per year |
| --- | --- |
| Value of hours saved | R324,562 |
| Running costs | about R23,311 |
| **Net value, on the assumptions above** | **about R301,251** |

Compared with the cost of handling tickets today (R778,950), this is the saving on the assumptions above. It is not a promise. It changes in proportion to the hourly cost and the minutes saved, so check it against the pilot.

## 7. Risks

- **Wrong routing.** The model sends some requests to the wrong team. An agent can move them, and the audit log records each move.
- **Sensitive requests.** Some requests are about health, conduct or safety. They are routed by fixed rules, never sent to Gemini, and can't be sent unchanged.
- **Approvals.** A manager can't approve their own request. A sole general manager's own leave has no second approver until a second general manager is added.
- **Personal data.** Staff details are protected under POPIA. See `docs/responsible-ai/popia-note.md`.
- **Assumptions.** The hourly cost, minutes per ticket and minutes saved drive the whole result. If they are wrong, the value is wrong by the same proportion.
