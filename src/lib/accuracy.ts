import { forecast, Department, HistoryDay } from './forecast';

// S2-17 backtest. The forecast is made from history up to an origin date, then scored against
// what actually happened over the following 28 days. The benchmark is "same as last week":
// for each day, the count on the most recent same weekday on or before the origin.

export type AccuracyResult = {
  department: Department;
  origin: string;      // last day of history the forecast was made from (SAST)
  scoredDays: number;  // days with a real count to compare
  forecastMae: number; // average error per day for the forecast, in tickets
  naiveMae: number;    // average error per day for same-as-last-week, in tickets
};

function addDays(date: string, n: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// 0 = Monday ... 6 = Sunday
function weekday(date: string): number {
  return (new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7;
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

export function accuracy(department: Department, history: HistoryDay[], origin: string): AccuracyResult {
  const byDate = new Map<string, number>();
  for (const h of history) byDate.set(h.date, h.tickets);

  const upTo = history.filter((h) => h.date <= origin);
  if (upTo.length === 0) {
    throw new Error('accuracy: no history on or before the origin');
  }

  const f = forecast(department, upTo);

  let forecastSum = 0;
  let naiveSum = 0;
  let scored = 0;

  for (const day of f.days) {
    const actual = byDate.get(day.date);
    if (actual === undefined) continue; // no real count, e.g. the 19–20 Oct gap: not scored

    // Same as last week: the most recent day with the same weekday, on or before the origin
    let naiveDate: string | null = null;
    for (let k = 0; k < 7; k++) {
      const candidate = addDays(origin, -k);
      if (weekday(candidate) === weekday(day.date)) {
        naiveDate = candidate;
        break;
      }
    }
    const naive = naiveDate === null ? undefined : byDate.get(naiveDate);
    if (naive === undefined) continue;

    forecastSum += Math.abs(actual - day.expected);
    naiveSum += Math.abs(actual - naive);
    scored += 1;
  }

  if (scored === 0) {
    throw new Error('accuracy: no scored days');
  }

  return {
    department,
    origin,
    scoredDays: scored,
    forecastMae: round1(forecastSum / scored),
    naiveMae: round1(naiveSum / scored),
  };
}