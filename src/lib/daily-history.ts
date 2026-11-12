import type { createClient } from "@/lib/supabase/server";
import type { HistoryDay } from "@/lib/forecast";

// Tickets per day, from the database (migration 0010, contract 4).
// The forecast screen (S2-27) and the report's forecast section (S2-24) load the
// history with this, then pass it to forecast() from src/lib/forecast.ts:
//
//   const history = await loadDailyHistory(supabase, "HR");
//   const result = forecast(history, { department: "HR", asOf: todayInSouthAfrica });

export type Department = "HR" | "IT" | "Finance" | "Operations";

// One day for one department (or all together): the DailyCount shape in docs/forecast.md.
export type DailyCount = { date: string; tickets: number };

type Supabase = Awaited<ReturnType<typeof createClient>>;

// The past tickets per day (the forecast learns from these only, docs/forecast.md),
// every day included, oldest first. Leave department out for all departments together.
// Counting happens in the database, so this returns one row per day (365 for the year),
// never the 15,000 tickets themselves.
export async function loadDailyHistory(supabase: Supabase, department?: Department): Promise<DailyCount[]> {
  const { data, error } = await supabase.rpc("daily_ticket_counts", {
    p_department: department ?? null,
    p_historical: true,
  });
  if (error) throw new Error("Couldn't load the daily ticket history: " + error.message);
  return (data ?? []) as DailyCount[];
}

// The history every forecast uses: the forecast page, the report preview and the PDF all call this,
// so they show the same numbers. Past tickets (the S2-03 periods) plus live tickets up to today.
// dashboard_metrics() counts them in SQL, so there is no 1,000-row limit. Oldest first.
export const HISTORY_START = "2025-10-19";
export const HISTORY_END = "2026-10-18";
export const LIVE_START = "2026-10-21";

export async function loadForecastHistory(supabase: Supabase, department: Department, today: string): Promise<HistoryDay[]> {
  const [hist, live] = await Promise.all([
    supabase.rpc("dashboard_metrics", { p_from: HISTORY_START, p_to: HISTORY_END, p_department: department }),
    supabase.rpc("dashboard_metrics", { p_from: LIVE_START, p_to: today, p_department: department }),
  ]);
  if (hist.error || live.error) {
    throw new Error("Couldn't load the ticket history: " + (hist.error?.message ?? live.error?.message));
  }
  const daily: DailyCount[] = [
    ...((hist.data as { daily: DailyCount[] }).daily ?? []),
    ...((live.data as { daily: DailyCount[] }).daily ?? []),
  ];
  return daily.map((d) => ({ date: d.date.slice(0, 10), tickets: d.tickets }));
}
