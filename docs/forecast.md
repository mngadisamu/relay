## Forecast contract (S2-08)

Function: `forecast(department)` in `src/lib/forecast.ts`

Input
- `department`: one of `HR`, `IT`, `Finance`, `Operations`
- `history`: `HistoryDay[]`, one row per day for that department, zeros included, from the first day of the historical period through today (SAST). The two gap days (19–20 Oct 2026) are excluded, since they are not real history.

Output
- `department`: the department requested
- `generatedAt`: ISO timestamp of the run (not used in the method)
- `days`: exactly 28 entries, starting the day after the last date in `history` (SAST)
  - `date`: `YYYY-MM-DD`
  - `expected`: expected tickets that day (whole number)
  - `low`, `high`: null until S2-13 adds the range
# Workload forecast (contract 4)

How Relay estimates how many tickets each department will get over the next 4 weeks.
**Elzel** builds the method (S2-08, S2-13, S2-17) in `src/lib/forecast.ts`. **Baphakamise** shows it in the weekly
report (S2-24) and **Elzel** on the forecast screen (S2-27). Both build against the shape on this page, so change it
only after agreeing it at stand-up.

The daily history it learns from is in `ml/notebooks/S2-03_daily_history.ipynb`, with its charts in `docs/forecast/`.

## Decisions (Samukelo, Thu 5 Nov)

1. **The forecast learns from the past tickets only** (`is_historical = true`, 19 Oct 2025 to 18 Oct 2026). Live tickets
   are still test traffic from the team (about 1 a day, against about 43 a day in the history); mixing them in would
   pull every forecast down by about a third. Add them once Relay has real users.
2. **The history is passed in**, not loaded inside the function, so tests and the backtest control exactly what it sees.
3. **`asOf` is passed in**, not read from the clock: the same history and `asOf` always give the same answer. The backtest
   (S2-17) uses it to forecast "as if it were 4 weeks ago". There's no `generatedAt` in the result; a screen can add its
   own time if it wants one.
4. **It uses the last 8 weeks of the history it's given**, not "the 8 weeks before `asOf`". The past tickets stop on
   18 Oct 2026, so the 8 weeks before today would be mostly empty.
5. **The month-end criterion stays.** On weekdays, the 25th to month-end is busier by a factor of 1.18 (IT, Operations)
   to 1.33 (Finance), so the method can learn it (notebook, section 5).

## The shape

```ts
export type Department = "HR" | "IT" | "Finance" | "Operations";

// One day of history for one department (or for all, if the caller added them up).
// Every day must be there, with 0 on days with no tickets, oldest first.
export type DailyCount = { date: string; tickets: number }; // date: "2026-10-18", a day in South African time

export type ForecastDay = {
  date: string;        // "2026-11-09"
  weekday: string;     // "Mon"
  expected: number;    // tickets expected that day, 1 decimal place
  low: number;         // range (S2-13). Until S2-13 lands, low = high = expected
  high: number;
  monthEnd: boolean;   // true from the 25th to the end of the month
};

export type Forecast = {
  department: Department | null; // null = all departments together
  asOf: string;                   // the first forecast day, e.g. today in South African time
  method: string;                 // "weekday-average-8w + month-end", shown under the chart
  days: ForecastDay[];            // `days` entries, starting at asOf
};

export function forecast(
  history: DailyCount[],
  options: { department?: Department; asOf: string; days?: number }, // days defaults to 28
): Forecast;
```

## The method (S2-08)

For each forecast day, starting at `asOf`:

1. **Weekday average:** the average of the same weekday over the **last 56 days** of `history`
   (8 Mondays for a Monday, and so on).
2. **Month-end:** if the day is the 25th or later, multiply by the **month-end factor**: the average of weekdays from the
   25th onwards, divided by the average of other weekdays, over **all** of `history`.
3. Round to 1 decimal place.

It needs at least 56 days of history; with less, `forecast` throws an error that says so.

### Worked example: HR, as of Thu 5 Nov 2026

The last 56 days of HR history (24 Aug to 18 Oct 2026) average 18.9 on Mondays, 11.0 on Tuesdays, 13.8 on Wednesdays,
12.5 on Thursdays, 11.8 on Fridays, 4.5 on Saturdays and 1.5 on Sundays. HR's month-end factor over the year is 1.21.

| date | weekday | expected | monthEnd |
| --- | --- | --- | --- |
| 2026-11-05 | Thu | 12.5 | false |
| 2026-11-06 | Fri | 11.8 | false |
| 2026-11-07 | Sat | 4.5 | false |
| 2026-11-09 | Mon | 18.9 | false |
| 2026-11-24 | Tue | 11.0 | false |
| 2026-11-25 | Wed | 16.6 | true (13.8 × 1.21) |
| 2026-11-26 | Thu | 15.1 | true (12.5 × 1.21) |

Use these numbers as the first test: `data/processed/daily_counts.csv` holds exactly this history.

## Where the history comes from

- **Notebook and tests:** `data/processed/daily_counts.csv` (one row per day, one column per department), written by the
  S2-03 notebook.
- **In the app (S2-24, S2-27):** `loadDailyHistory(supabase, department)` from `src/lib/daily-history.ts`. It calls the
  database function `daily_ticket_counts` (migration 0010), which counts the past tickets per day in SQL and returns
  one row per day in exactly the `DailyCount` shape, so a page never fetches 15,000 tickets (Supabase returns at most
  1,000 rows at a time). It runs as the signed-in user, so managers count every department.

  ```ts
  const history = await loadDailyHistory(supabase, "HR"); // 365 days, 19 Oct 2025 to 18 Oct 2026
  const result = forecast(history, { department: "HR", asOf: "2026-11-05" });
  ```

  Its numbers match `data/processed/daily_counts.csv` exactly (checked for HR: 365 days, 3,900 tickets, 591 in the
  last 8 weeks). Import `DailyCount` from `src/lib/daily-history.ts` in `forecast.ts`, so both use one type.

## Limits (say these to the panel)

- The dates of the past tickets were **assigned** in S1-06 with a realistic pattern (busier Mondays, month-end and winter),
  not recorded at Kopano Freight. The forecast shows how the method works, not what the real company will see.
- The method doesn't know about public holidays or one-off events; a holiday Monday is forecast like any Monday.
- Every forecast on screen shows `<AiNote kind="forecast" />` ("Forecast from past tickets · a guide, not a promise").
