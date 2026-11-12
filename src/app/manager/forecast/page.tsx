import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { forecastRange, type Department, type HistoryDay } from "@/lib/forecast";
import { accuracy } from "@/lib/accuracy";
import { AiNote } from "@/components/AiNote";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RoleHeader } from "@/components/RoleHeader";
import { MANAGER_MENU } from "@/lib/menus";
import ForecastChart, { type ChartRow } from "./ForecastChart";

const DEPARTMENTS: Department[] = ["HR", "IT", "Finance", "Operations"];
const BACKTEST_ORIGIN = "2026-10-08"; // same origin as the S2-17 table in docs/forecast.md

// Same periods as the S2-03 notebook. The 19–20 Oct 2026 gap sits between them.
const HISTORY_START = "2025-10-19";
const HISTORY_END = "2026-10-18";
const LIVE_START = "2026-10-21";

type DailyRow = { date: string; tickets: number };

function sastToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
}

function addDays(date: string, n: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

export default async function ForecastPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string }>;
}) {
  const profile = await requireRole(["manager"]);
  const params = await searchParams;
  const dept: Department = DEPARTMENTS.find((d) => d === params.dept) ?? "HR";

  const supabase = await createClient();
  const today = sastToday();

  const [hist, live] = await Promise.all([
    supabase.rpc("dashboard_metrics", { p_from: HISTORY_START, p_to: HISTORY_END, p_department: dept }),
    supabase.rpc("dashboard_metrics", { p_from: LIVE_START, p_to: today, p_department: dept }),
  ]);
  if (hist.error || live.error) {
    throw new Error(hist.error?.message ?? live.error?.message ?? "Could not load ticket history");
  }

  const daily: DailyRow[] = [
    ...(hist.data as { daily: DailyRow[] }).daily,
    ...(live.data as { daily: DailyRow[] }).daily,
  ];
  const history: HistoryDay[] = daily.map((d) => ({ date: d.date.slice(0, 10), tickets: d.tickets }));
  if (history.length === 0) {
    throw new Error("No ticket history for this department");
  }
  const last = history[history.length - 1].date;

  const result = forecastRange(dept, history);
  const byDate = new Map(history.map((h) => [h.date, h.tickets]));

  const actualStart = addDays(last, -55);
  const actualRows: ChartRow[] = Array.from({ length: 56 }, (_, i) => {
    const date = addDays(actualStart, i);
    return { date, actual: byDate.get(date) ?? null, forecast: null, base: null, span: null };
  });

  const forecastRows: ChartRow[] = result.days.map((d) => {
    const low = d.low ?? d.expected;
    const high = d.high ?? d.expected;
    return { date: d.date, actual: null, forecast: d.expected, base: low, span: high - low };
  });

  const n = result.days.length;
  const avgExpected = result.days.reduce((s, d) => s + d.expected, 0) / n;
  const avgLow = result.days.reduce((s, d) => s + (d.low ?? 0), 0) / n;
  const avgHigh = result.days.reduce((s, d) => s + (d.high ?? 0), 0) / n;
  const summary =
    `Next 4 weeks, ${result.days[0].date} to ${result.days[n - 1].date}: on average the forecast expects ` +
    `${round1(avgExpected)} ${dept} tickets a day, with a range of ${round1(avgLow)} to ${round1(avgHigh)} a day.`;

  let backtestText = "Backtest not available for this department.";
  try {
    const bt = accuracy(dept, history, BACKTEST_ORIGIN);
    backtestText =
      `Backtest over the last 4 weeks: the forecast was off by ${bt.forecastMae} tickets a day; ` +
      `same as last week was off by ${bt.naiveMae}.`;
  } catch {
    // keep the default message
  }

  return (
    <>
      <RoleHeader profile={profile} home="/manager" menu={MANAGER_MENU} current="/manager/forecast" />
      <main className="mx-auto max-w-340 space-y-6 px-4 pb-12 pt-7 sm:px-6">
        <h1 className="text-xl font-semibold">Forecast</h1>

        <form method="get" className="flex flex-wrap items-end gap-2">
          <label htmlFor="dept" className="text-sm font-medium">Department</label>
          <select id="dept" name="dept" defaultValue={dept} className="rounded border px-2 py-1.5 text-sm">
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <Button type="submit">Show</Button>
        </form>

        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">Forecast from past tickets</h2>
              <AiNote kind="forecast" />
            </div>

            <ForecastChart
              rows={[...actualRows, ...forecastRows]}
              label={`${dept} tickets per day: last 8 weeks actual, next 4 weeks forecast with the range shaded`}
            />

            <p className="text-sm">{summary}</p>
            <p className="text-xs text-muted-foreground">{backtestText}</p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}