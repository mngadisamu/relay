## Range (S2-13)

Each day has a low and a high value around the expected one, forming an 80% range.

- The range comes from a Poisson model: tickets on a given day are treated as independent counts with mean equal to `expected`.
- `low` is the 10th percentile of that model, capped at `expected`.
- `high` is the 90th percentile, and is never below `expected` or below 1.
- Both are whole tickets.

Limits: the model assumes tickets arrive independently. Real tickets often come in bursts, so the 80% range may cover fewer than 8 in 10 real days. S2-17 measures that coverage. If it's short, report it as a finding rather than widening the range to hit the target.