import type { ForecastDay } from "./forecast";

const MONTH_END_FROM = 25;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dayOfMonth(date: string): number {
  return Number(date.slice(8, 10));
}

function monthIndex(date: string): number {
  return Number(date.slice(5, 7)) - 1;
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

// Monday of the week containing this date (weeks start on Monday, as in the rest of the app)
function mondayOf(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export function formatShortDate(date: string): string {
  return `${Number(date.slice(8, 10))} ${MONTHS[monthIndex(date)]}`;
}

// Callout for a month-end rise in the forecast. Returns null when there is no rise to report.
export function monthEndCallout(dept: string, days: ForecastDay[]): string | null {
  const before = days.filter((d) => dayOfMonth(d.date) < MONTH_END_FROM);
  const end = days.filter((d) => dayOfMonth(d.date) >= MONTH_END_FROM);
  if (before.length === 0 || end.length === 0) return null;

  // Use the first month-end block in the forecast, so a window spanning two months still reads cleanly
  const firstMonth = monthIndex(end[0].date);
  const block = end.filter((d) => monthIndex(d.date) === firstMonth);

  const beforeAvg = mean(before.map((d) => d.expected));
  const endAvg = mean(block.map((d) => d.expected));
  if (beforeAvg === 0) return null;

  const pct = Math.round(((endAvg - beforeAvg) / beforeAvg) * 100);
  if (pct <= 0) return null;

  const start = block[0].date;
  const finish = block[block.length - 1].date;
  return `Expect about ${pct}% more ${dept} requests from ${dayOfMonth(start)} to ${formatShortDate(finish)}`;
}

export type WeekStaffing = {
  weekStart: string;  // Monday, 'YYYY-MM-DD'
  avgPerDay: number;  // average forecast tickets per day in that week
  agents: number;     // avgPerDay ÷ tickets per agent, rounded up
};

export function agentsByWeek(days: ForecastDay[], perAgent: number): WeekStaffing[] {
  const weeks = new Map<string, number[]>();
  for (const d of days) {
    const w = mondayOf(d.date);
    weeks.set(w, [...(weeks.get(w) ?? []), d.expected]);
  }
  return [...weeks.entries()].map(([weekStart, values]) => {
    const avg = mean(values);
    return { weekStart, avgPerDay: round1(avg), agents: Math.ceil(avg / perAgent) };
  });
}