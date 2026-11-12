export type Department = 'HR' | 'IT' | 'Finance' | 'Operations';

// One row per day for one department, zeros included, SAST dates.
// Pass history from the first day of the historical period through today.
// The 19–20 Oct 2026 gap is excluded, since it is not real history.
export type HistoryDay = {
  date: string;      // 'YYYY-MM-DD'
  tickets: number;
};

export type ForecastDay = {
  date: string;        // 'YYYY-MM-DD', SAST
  expected: number;    // one decimal place, never negative
  low: number | null;  // whole tickets, 10th percentile (S2-13)
  high: number | null; // whole tickets, 90th percentile, at least 1 (S2-13)
};

export type Forecast = {
  department: Department;
  generatedAt: string; // ISO timestamp of the run (not used in the method)
  days: ForecastDay[]; // always 28 entries
};

const HORIZON_DAYS = 28;
const RECENT_DAYS = 14;      // agreed with Samukelo; must start after the historical period ends
const MONTH_END_FROM_DAY = 25;
const RANGE_LOW_Q = 0.1;     // 80% range: 10th to 90th percentile
const RANGE_HIGH_Q = 0.9;
const MIN_HIGH = 1;          // a range never collapses to zero width

function addDays(date: string, n: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// 0 = Monday ... 6 = Sunday
function weekday(date: string): number {
  return (new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7;
}

function dayOfMonth(date: string): number {
  return Number(date.slice(8, 10));
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

// Smallest whole count k where the Poisson chance of k or fewer reaches q, for mean lambda
function poissonQuantile(lambda: number, q: number): number {
  if (lambda <= 0) return 0;
  let p = Math.exp(-lambda);
  let cdf = p;
  let k = 0;
  while (cdf < q) {
    k += 1;
    p *= lambda / k;
    cdf += p;
  }
  return k;
}

export function monthEndFactor(history: HistoryDay[]): number {
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const endAvg = mean(sorted.filter((h) => dayOfMonth(h.date) >= MONTH_END_FROM_DAY).map((h) => h.tickets));
  const otherAvg = mean(sorted.filter((h) => dayOfMonth(h.date) < MONTH_END_FROM_DAY).map((h) => h.tickets));
  return endAvg > 0 && otherAvg > 0 ? endAvg / otherAvg : 1;
}

// asOf (SAST date, optional): the 28 days start the day after asOf. Without it they start after the
// last day of history, which is what the backtest in accuracy.ts relies on. The screens and reports
// pass today, so a forecast never shows days that have already passed.
export function forecast(department: Department, history: HistoryDay[], asOf?: string): Forecast {
  if (history.length === 0) {
    throw new Error('forecast: history is empty');
  }

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1].date;

  // Recent level: average daily tickets over the last RECENT_DAYS
  const windowStart = addDays(last, -(RECENT_DAYS - 1));
  const recent = sorted.filter((h) => h.date >= windowStart);
  const earlier = sorted.filter((h) => h.date < windowStart);
  if (earlier.length === 0) {
    throw new Error('forecast: need history before the recent window to learn the weekday shape');
  }
  const recentLevel = mean(recent.map((h) => h.tickets));

  // Weekday shape: from history before the recent window, so quiet live days don't flatten it
  const sums = new Array<number>(7).fill(0);
  const counts = new Array<number>(7).fill(0);
  for (const h of earlier) {
    const w = weekday(h.date);
    sums[w] += h.tickets;
    counts[w] += 1;
  }
  const earlierOverall = mean(earlier.map((h) => h.tickets));
  const weekdayMeans = Array.from({ length: 7 }, (_, w) =>
    counts[w] > 0 ? sums[w] / counts[w] : earlierOverall
  );
  const shapeMean = mean(weekdayMeans);
  const shape = weekdayMeans.map((m) => (shapeMean > 0 ? m / shapeMean : 1));

  const monthEnd = monthEndFactor(sorted);

  // Start from asOf when it is later than the history, so the days are in the future.
  const start = asOf && asOf > last ? asOf : last;

  const days: ForecastDay[] = [];
  for (let i = 1; i <= HORIZON_DAYS; i++) {
    const date = addDays(start, i);
    const factor = dayOfMonth(date) >= MONTH_END_FROM_DAY ? monthEnd : 1;
    const expected = Math.max(0, Math.round(shape[weekday(date)] * recentLevel * factor * 10) / 10);
    days.push({ date, expected, low: null, high: null });
  }

  return {
    department,
    generatedAt: new Date().toISOString(),
    days,
  };
}

// S2-13: each day gets an 80% range in whole tickets, from a Poisson model of the expected count.
// Low never exceeds expected; high is never below expected or below 1.
export function forecastRange(department: Department, history: HistoryDay[], asOf?: string): Forecast {
  const base = forecast(department, history, asOf);
  const days = base.days.map((d) => {
    const low = Math.min(d.expected, poissonQuantile(d.expected, RANGE_LOW_Q));
    const high = Math.max(d.expected, MIN_HIGH, poissonQuantile(d.expected, RANGE_HIGH_Q));
    return { ...d, low, high };
  });
  return { ...base, days };
}