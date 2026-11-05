import type { createClient } from "@/lib/supabase/server";

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
