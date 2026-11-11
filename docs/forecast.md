## Accuracy backtest (S2-17)

Origin: 8 Oct 2026, four weeks before the last history date (5 Nov 2026). The forecast is made from history up to 8 Oct and scored on 9 Oct to 5 Nov, with the 19–20 Oct gap not scored.

| Department | Scored days | Forecast: off by (tickets/day) | Same as last week: off by (tickets/day) |
|---|---|---|---|
| HR | 26 | 7.7 | 6.0 |
| IT | 26 | 9.0 | 7.6 |
| Finance | 26 | 8.5 | 6.0 |
| Operations | 26 | 8.3 | 6.5 |

Over the 4 weeks to 5 Nov 2026, the forecast was off by more than a same-as-last-week guess for all four departments. The window spans the drop from the busy historical period to the quiet live period, and the forecast's level and weekday shape are learned from the older data, so it predicts higher volume than arrived. This is one backtest origin, so it's a warning about the method's current behaviour, not a verdict on it.
| HR | | | |
| IT | | | |
| Finance | | | |
| Operations | | | |

Limits: this is one backtest origin. The window spans the drop from busy historical volume to quiet live volume, so the errors reflect that shift as much as the method. A stronger test would roll the origin across several weeks.
## Range (S2-13)

Each day has a low and a high value around the expected one, forming an 80% range.

- The range comes from a Poisson model: tickets on a given day are treated as independent counts with mean equal to `expected`.
- `low` is the 10th percentile of that model, capped at `expected`.
- `high` is the 90th percentile, and is never below `expected` or below 1.
- Both are whole tickets.

Limits: the model assumes tickets arrive independently. Real tickets often come in bursts, so the 80% range may cover fewer than 8 in 10 real days. S2-17 measures that coverage. If it's short, report it as a finding rather than widening the range to hit the target.
Output
- `department`: the department requested
- `generatedAt`: ISO timestamp of the run (not used in the method)
- `days`: exactly 28 entries, starting the day after the last date in `history` (SAST)
  - `date`: `YYYY-MM-DD`
  - `expected`: expected tickets that day, one decimal place, never negative
  - `low`, `high`: null until S2-13 adds the range
