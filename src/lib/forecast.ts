export type Department = 'HR' | 'IT' | 'Finance' | 'Operations';

// One row per day for one department, zeros included, SAST dates.
// Use the historical period only (see S2-03), so the 19–20 Oct 2026 gap is not in the input.
export type HistoryDay = {
  date: string;      // 'YYYY-MM-DD'
  tickets: number;
};

export type ForecastDay = {
  date: string;        // 'YYYY-MM-DD', SAST
  expected: number;    // whole number, never negative
  low: number | null;  // filled in S2-13
  high: number | null; // filled in S2-13
};

export type Forecast = {
  department: Department;
  generatedAt: string; // ISO timestamp of the run (not used in the method)
  days: ForecastDay[]; // always 28 entries
};

const HORIZON_DAYS = 28;
const WEEKDAY_WINDOW_DAYS = 8 * 7;
const MONTH_END_FROM_DAY = 25;

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

export function monthEndFactor(history: HistoryDay[]): number {
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const endAvg = mean(sorted.filter((h) => dayOfMonth(h.date) >= MONTH_END_FROM_DAY).map((h) => h.tickets));
  const otherAvg = mean(sorted.filter((h) => dayOfMonth(h.date) < MONTH_END_FROM_DAY).map((h) => h.tickets));
  return endAvg > 0 && otherAvg > 0 ? endAvg / otherAvg : 1;
}

export function forecast(department: Department, history: HistoryDay[]): Forecast {
  if (history.length === 0) {
    throw new Error('forecast: history is empty');
  }

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1].date;

  // Weekday averages from the last 8 weeks of history
  const windowStart = addDays(last, -(WEEKDAY_WINDOW_DAYS - 1));
  const recent = sorted.filter((h) => h.date >= windowStart);
  const overall = mean(recent.map((h) => h.tickets));

  const sums = new Array<number>(7).fill(0);
  const counts = new Array<number>(7).fill(0);
  for (const h of recent) {
    const w = weekday(h.date);
    sums[w] += h.tickets;
    counts[w] += 1;
  }
  const weekdayAvg = (w: number) => (counts[w] > 0 ? sums[w] / counts[w] : overall);

  // Month-end factor from the full history: average on the 25th onward vs the rest of the month
    const monthEnd = monthEndFactor(sorted);

  const days: ForecastDay[] = [];
  for (let i = 1; i <= HORIZON_DAYS; i++) {
    const date = addDays(last, i);
    const factor = dayOfMonth(date) >= MONTH_END_FROM_DAY ? monthEnd : 1;
    const expected = Math.max(0, Math.round(weekdayAvg(weekday(date)) * factor));
    days.push({ date, expected, low: null, high: null });
  }

  return {
    department,
    generatedAt: new Date().toISOString(),
    days,
  };
}