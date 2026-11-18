# Business case: Relay for Kopano Freight

Status: **draft.** The volumes are from the database. The cost and time figures are waiting for the team's assumptions, and they are marked **[input needed]** until they are added. Every number here is labelled with its source.

Sources used:
- **Database:** counts from the `tickets` table (the seeded past year, `is_historical = true`).
- **Assumption:** a figure the team has stated, not measured.
- **Price:** a current published price, with the date checked.

## 1. Volume: what the help desk handles

| Department | Tickets, past 12 months | Per month (average) | Source |
| --- | --- | --- | --- |
| HR | 3,900 | 325 | Database |
| IT | 3,900 | 325 | Database |
| Finance | 3,900 | 325 | Database |
| Operations | 3,879 | 323 | Database |
| **Total** | **15,579** | **about 1,300** | Database |

The past-year tickets were seeded from a realistic pattern, not recorded (see `data/README.md`). Treat the volumes as the expected load, not a measured one.

## 2. Cost of current handling

| Item | Value | Source |
| --- | --- | --- |
| Minutes spent per ticket, today | **[input needed]** | Assumption |
| Loaded hourly cost of an agent (R) | **[input needed]** | Assumption |
| Cost per ticket today (R) | minutes ÷ 60 × hourly cost | Calculated |
| Cost per year at 15,579 tickets (R) | cost per ticket × 15,579 | Calculated |

## 3. Time saved per ticket with Relay

| Item | Value | Source |
| --- | --- | --- |
| Minutes saved per ticket (drafting and routing) | **[input needed]** | Assumption |
| Share of tickets routed correctly by the model | To be measured from the classifier results | `ml/model/` |
| Hours saved per year | minutes saved × 15,579 ÷ 60 | Calculated |

## 4. Running costs

| Service | Used for | Price | Source |
| --- | --- | --- | --- |
| Google Gemini API | Reply drafts (not used for sensitive requests) | **[check current price]** | Price |
| Vercel | Hosting | **[check current price]** | Price |
| Supabase | Database and sign-in | **[check current price]** | Price |

## 5. Risks

- **Wrong routing.** The model sends some requests to the wrong team. An agent can move them, and the audit log records each move.
- **Sensitive requests.** Some requests are about health, conduct or safety. They are routed by fixed rules, never sent to Gemini, and can't be sent unchanged.
- **Approvals.** A manager can't approve their own request, and a sole general manager's own leave has no second approver until a second general manager is added.
- **Personal data.** Staff details are protected under POPIA. See `docs/responsible-ai/popia-note.md`.
