## Accuracy backtest (S2-17)

Origin: 8 Oct 2026, four weeks before the last history date (5 Nov 2026). The forecast is made from history up to 8 Oct and scored on 9 Oct to 5 Nov, with the 19–20 Oct gap not scored.

| Department | Scored days | Forecast: off by (tickets/day) | Same as last week: off by (tickets/day) |
|---|---|---|---|
| HR | 26 | 7.7 | 6.0 |
| IT | 26 | 9.0 | 7.6 |
| Finance | 26 | 8.5 | 6.0 |
| Operations | 26 | 8.3 | 6.5 |

Over the 4 weeks to 5 Nov 2026, the forecast was off by more than a same-as-last-week guess for all four departments. The window spans the drop from the busy historical period to the quiet live period, and the forecast's level and weekday shape are learned from the older data, so it predicts higher volume than arrived. This is one backtest origin, so it's a warning about the method's current behaviour, not a verdict on it.