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