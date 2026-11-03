# Dashboard metrics

Owner: Mihlali · Story S2-04 · Contract 2 · Written 2 Nov 2026

Every number on the dashboard, in the weekly reports, in the AI summaries and in the forecast history comes from **one** database function. No screen calculates its own numbers. If a definition here changes, it changes for everyone.

## The function

```sql
dashboard_metrics(p_from date, p_to date, p_department text default null) returns jsonb
```

| Parameter | Meaning |
| --- | --- |
| `p_from`, `p_to` | First and last day of the period, **both included**. Days are South African days (SAST, Africa/Johannesburg), never UTC. |
| `p_department` | `'IT'`, `'HR'`, `'Finance'`, `'Operations'`, or `null` for all departments. |

- **Past and live tickets together:** both are in the `tickets` table. Past tickets have `is_historical = true`. The function counts both, and never filters on `is_historical`.
- **Previous period:** the same number of days immediately before `p_from`. Every "change" below compares against it.
- **Who sees what:** the function runs as the caller (`security invoker`), so the existing row rules decide the numbers. A manager sees all departments. An agent sees only their own department. Staff are not given permission to run it.
- **Speed:** each call must answer in under 1 second.
- **No personal data:** the result contains counts and averages only. No names, no ticket text.

## Result shape

Example for `dashboard_metrics('2026-09-01', '2026-09-30', 'Finance')` (the numbers are illustrative):

```json
{
  "period":          { "from": "2026-09-01", "to": "2026-09-30", "days": 30 },
  "previous_period": { "from": "2026-08-02", "to": "2026-08-31" },
  "department": "Finance",
  "generated_at": "2026-11-03T08:15:00+02:00",

  "cards": {
    "tickets": {
      "value": 84, "previous": 70, "change_pct": 20.0
    },
    "first_reply_hours": {
      "value": 3.2, "previous": 4.1, "change_pct": -22.0, "based_on": 79
    },
    "open_tickets": {
      "value": 7, "previous": 5, "change_pct": 40.0
    },
    "needs_review": {
      "value": 11.9, "previous": 14.3, "change_points": -2.4, "count": 10
    }
  },

  "resolution_hours": {
    "value": 26.5, "previous": 30.2, "change_pct": -12.3, "based_on": 71
  },

  "by_priority": { "Low": 9, "Medium": 58, "High": 14, "Urgent": 3 },

  "by_department": [
    { "department": "Finance", "tickets": 84 }
  ],

  "weekly": [
    { "week_start": "2026-07-13", "tickets": 18 },
    { "week_start": "2026-07-20", "tickets": 21 },
    { "week_start": "2026-07-27", "tickets": 19 },
    { "week_start": "2026-08-03", "tickets": 22 },
    { "week_start": "2026-08-10", "tickets": 17 },
    { "week_start": "2026-08-17", "tickets": 20 },
    { "week_start": "2026-08-24", "tickets": 23 },
    { "week_start": "2026-08-31", "tickets": 19 },
    { "week_start": "2026-09-07", "tickets": 24 },
    { "week_start": "2026-09-14", "tickets": 21 },
    { "week_start": "2026-09-21", "tickets": 20 },
    { "week_start": "2026-09-28", "tickets": 22 }
  ],

  "daily": [
    { "date": "2026-09-01", "tickets": 4 },
    { "date": "2026-09-02", "tickets": 0 },
    { "date": "2026-09-03", "tickets": 5 }
  ]
}
```

(`daily` has one entry for every day in the period; only three are shown here.)

### Rules for the shape

- Counts are whole numbers. Hours and percentages are rounded to **1 decimal**.
- `change_pct` is the relative change, `(value − previous) ÷ previous × 100`. It is `null` when `previous` is 0 or `null`.
- `needs_review` is itself a percentage, so its change is `change_points`: the difference in percentage points.
- A value that can't be calculated is `null`, never `0` and never a missing key. The screen shows "No data".
- Keys never change name or move. New keys can be added; nothing is removed without telling the team at stand-up.

## Where each number comes from

All numbers come from the `tickets` table.

| Column | Used for |
| --- | --- |
| `created_at` | Which period and which day or week a ticket belongs to |
| `answered_at` | Time to first reply |
| `closed_at` | Time to resolve |
| `status` | Open tickets |
| `department` | The department filter and the split by department |
| `priority` | The split by priority |
| `needs_review` | Percentage needing review |
| `is_historical` | Not used for filtering; only to explain the data's limits below |

`assigned_at` and `assigned_to` are not used by any metric yet (see the next section).

## Metric definitions

| Metric | How it is calculated | Limits |
| --- | --- | --- |
| `cards.tickets` | Number of tickets with `created_at` inside the period (SAST days). | Counts every ticket, whatever its status. |
| `cards.first_reply_hours` | Average of `answered_at − created_at`, in hours, over tickets in the period that have an `answered_at`. `based_on` is how many tickets that is. | Tickets not yet answered are left out, so the number looks better than it is when many are waiting. For the 500 past tickets `answered_at` was assigned when the data was loaded, not recorded. For live tickets it is set when the first reply is sent (checked: it equals the first `responses.sent_at`). |
| `cards.open_tickets` | Tickets created in the period whose status is **not** Closed (Received, Assigned or Answered). | It uses the status **now**, not the status on `p_to`, so an old period's open count shrinks as tickets are closed. "Answered" still counts as open until the staff member confirms. |
| `cards.needs_review` | `value` = tickets in the period with `needs_review = true` ÷ tickets in the period × 100. `count` is the number of tickets. | Clears when an agent confirms the department (S2-06). Under about 20 tickets, one ticket moves the percentage a lot. |
| `resolution_hours` | Average of `closed_at − created_at`, in hours, over tickets in the period that have a `closed_at`. | The 500 past tickets have `closed_at`, but it was assigned, not recorded. Live tickets have none until S2-06 adds the close step, so a period with only live tickets returns `null`. |
| `by_priority` | Tickets in the period grouped by priority (Low, Medium, High, Urgent). | Every ticket is Medium today, so this is not meaningful until S2-11 lets staff choose a priority. Always return all four keys, with 0 where there are none. |
| `by_department` | Tickets in the period grouped by department, for the departments the caller can see. | With a department filter this has **one** entry. The dashboard shows the bar chart for all departments when the filter is "All". |
| `weekly` | Tickets per week for the **12 weeks ending with the week that contains `p_to`**. Weeks start on **Monday** (SAST). Weeks with no tickets show `0`. | Ignores `p_from` (the chart always shows 12 weeks) but respects the department filter. The first and last weeks can be partial if the period doesn't start or end on those days. |
| `daily` | Tickets per day for every day from `p_from` to `p_to`, with `0` on days with no tickets. | Used by the forecast (Elzel) and for sparklines. Large periods return many entries (about 365 for a year), so screens should ask for a short period. |

## What each consumer reads

| Consumer | Reads | Story |
| --- | --- | --- |
| Dashboard cards and filters | `cards`, `period`, `department` | S2-14 |
| Dashboard charts | `weekly`, `by_department` | S2-18 |
| Weekly insights (Gemini) | `cards`, `resolution_hours`, `by_priority` (numbers only) | S2-28 |
| Report preview and PDF | `cards`, `resolution_hours`, `by_priority` | S2-15, S2-19 |
| Forecast history | `daily` | S2-03 |

Not in this function: the 5 oldest open tickets (Baphakamise reads those from `tickets` directly) and the forecast (Elzel's `forecast(department)`).

## What the data looks like today (2 Nov 2026)

- 515 tickets in `tickets`: 500 past (`is_historical = true`) created 19 to 30 Oct 2025, and 15 live created 21 to 30 Oct 2026. Nothing exists between them.
- Only the last two weeks of the 12-week chart have live data, and the only dense data is in 19 to 30 Oct 2025.
- No ticket has an `assigned_at` yet. Time-to-assign is not a metric until S2-06.
- All tickets are Medium priority.
- With so few live tickets, one ticket moves a percentage a lot. Read the changes with care.

## Rules for the AI summary

Gemini only ever receives this JSON, never ticket text or names. Every number in a generated summary must appear in this JSON (after rounding); otherwise the summary is rejected. That is why the changes (`change_pct`, `change_points`) are pre-calculated here and not left for the AI to work out.

## Open questions to confirm at stand-up

1. **Elzel:** is `daily` enough for the forecast history, or do you need it per department in one call?
2. **Baphakamise:** do the weekly report numbers come from `cards` and `resolution_hours` for a Monday-to-Sunday period, or do you need anything else?
3. **Team:** `by_department` follows the department filter (one entry when filtered), as S2-09 says "every number is for HR only". Agreed?
4. **Team:** open ticket = status is not Closed. Agreed?
5. **Team:** `first_reply_hours` and `resolution_hours` for the 500 past tickets use assigned times, not recorded ones. Is it fine to show them on the dashboard as they are, with that limit written here?
6. **Team:** past tickets all fall in 19 to 30 Oct 2025 and live tickets in 21 to 30 Oct 2026. Is that expected? It leaves the 12-week chart and the forecast history almost empty.