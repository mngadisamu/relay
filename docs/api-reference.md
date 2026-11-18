# API reference: classify and forecast

Relay has one HTTP route for classification, and one library function for forecasting. Everything else is a server action (for forms) or a Supabase function (for the database).

## 1. Classify

### `POST /api/classify`

Routes a request to a department with the trained model. The submit form does not call this route. It calls `classify()` directly (faster), then applies the sensitive-request rule. This route is for other screens and for testing.

**Who can call it:** a signed-in Relay user. `/api` is open to signed-out visitors at the middleware level, so the route checks the caller itself.

**Request**

```json
{ "subject": "string", "description": "string" }
```

Both fields are required and must not be empty.

**Response (200)**

```json
{
  "department": "HR",
  "confidence": 0.91,
  "needsReview": false,
  "modelVersion": "tfidf-logreg-v2"
}
```

| Field | Type | Meaning |
| --- | --- | --- |
| `department` | `"HR"`, `"IT"`, `"Finance"` or `"Operations"` | The model's choice. |
| `confidence` | number, 0 to 1 | How sure the model is. |
| `needsReview` | boolean | `true` when `confidence` is below **0.6** (`REVIEW_THRESHOLD`). The ticket is then marked for a person to check. |
| `modelVersion` | string | The version of the trained model that answered. |

**Errors**

| Status | Body | When |
| --- | --- | --- |
| 401 | `{ "error": "Sign in first" }` | Nobody is signed in. |
| 400 | `{ "error": "subject and description are required" }` | A field is missing, not a string, or empty. |

**Where the logic lives:** `src/lib/classifier.ts`. The model is `ml/model/classifier-model.json`, trained in Colab (`ml/notebooks/relay_classifier.ipynb`). The TypeScript code repeats the same arithmetic as the Python training code, so no Python server runs in production.

**Changing the model:** the request and response shape must not change. A new model replaces the JSON file and the code that reads it. Bump `version` in the JSON so `modelVersion` changes.

## 2. Forecast

Forecasting is a library function, not an HTTP route. The manager's forecast page (`/manager/forecast`) calls it on the server.

```ts
import { forecast, forecastRange } from "@/lib/forecast";
import { loadForecastHistory } from "@/lib/daily-history";

const history = await loadForecastHistory(supabase, "HR", "2026-11-18");
const result = forecastRange("HR", history, "2026-11-18");
```

### `forecast(department, history, asOf?)`

| Argument | Type | Meaning |
| --- | --- | --- |
| `department` | `"HR"`, `"IT"`, `"Finance"` or `"Operations"` | The department to forecast. |
| `history` | `HistoryDay[]` | One entry per day, `{ date: "YYYY-MM-DD", tickets: number }`, with zeros included. Past tickets only. |
| `asOf` | `"YYYY-MM-DD"`, optional | The day the forecast is made on. Passed in, never read from the clock, so the same inputs give the same result. |

It returns a `Forecast`: `department`, `generatedAt` (the run time, not used in the method) and `days`, which always has **28** entries. Each day has `date`, `expected` (one decimal place, never negative), and `low` and `high`, which are `null` here.

It throws `forecast: history is empty` when `history` has no days.

### `forecastRange(department, history, asOf?)`

The same as `forecast()`, but fills in `low` and `high`: the 10th and 90th percentiles of a Poisson count with the expected value (an 80% range). `high` is at least 1, so a range never has zero width.

### How the method works

Summary only. The full method, with the backtest results, is in [`forecast.md`](forecast.md).

- The level comes from the **average of the last 14 days** of history (`RECENT_DAYS`).
- The weekday pattern comes from older history.
- Days from the **25th** onward are raised by how much busier month-end has been over the past year (`MONTH_END_FROM_DAY`).
- The forecast learns from **past tickets only** (`is_historical = true`), and the live history starts after the seeded period. `HISTORY_START`, `HISTORY_END` and `LIVE_START` are in `src/lib/daily-history.ts`.

### Limits

- A department with very few live tickets (HR in the first weeks of live use) has a recent level based on very few tickets. The forecast page says so.
- The forecast is a guide to typical volume, not a promise.
