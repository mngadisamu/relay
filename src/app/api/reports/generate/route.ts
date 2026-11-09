import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { forecast, Department, HistoryDay } from "@/lib/forecast";

const DEPARTMENTS = ["HR", "IT", "Finance", "Operations"];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// Report preview numbers (S2-15 & S2-24): one department, one week + forecast + oldest tickets.
export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "manager") {
    return NextResponse.json({ error: "Only managers can open reports." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const department = String(body?.department ?? "") as Department;
  const weekStart = String(body?.week_start ?? "");
  if (!DEPARTMENTS.includes(department) || !DAY.test(weekStart)) {
    return NextResponse.json({ error: "Choose a department and a week." }, { status: 400 });
  }

  const end = new Date(`${weekStart}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  const weekEnd = end.toISOString().slice(0, 10);

  const supabase = await createClient();

  // 1. Fetch metrics, oldest open tickets, and ticket history for the forecast in parallel
  const [
    { data: metrics, error: metricsError },
    { data: oldestOpen, error: ticketsError },
    { data: historyRows, error: historyError }
  ] = await Promise.all([
    supabase.rpc("dashboard_metrics", { p_from: weekStart, p_to: weekEnd, p_department: department }),
    supabase
      .from("tickets")
      .select("reference, subject, created_at")
      .eq("department", department)
      .eq("is_historical", false)
      .neq("status", "closed")
      .order("created_at", { ascending: true })
      .limit(5),
    supabase
      .from("tickets")
      .select("created_at")
      .eq("department", department)
      .order("created_at", { ascending: true })
  ]);

  if (metricsError || ticketsError || historyError) {
    return NextResponse.json({ error: (metricsError ?? ticketsError ?? historyError)?.message }, { status: 500 });
  }

  // 2. Build daily ticket history counts for forecast(department, history)
  const countMap: Record<string, number> = {};
  for (const row of historyRows ?? []) {
    const d = (row.created_at as string).slice(0, 10);
    countMap[d] = (countMap[d] || 0) + 1;
  }

  const history: HistoryDay[] = Object.entries(countMap).map(([date, tickets]) => ({
    date,
    tickets,
  }));

  // Fallback history entry if empty to prevent error
  if (history.length === 0) {
    history.push({ date: weekStart, tickets: 0 });
  }

  // 3. Generate the 4-week forecast using Elzel's library function
  const forecastResult = forecast(department, history);
  
  // Format summary projection string for the preview component
  const totalForecastTickets = forecastResult.days.reduce((sum, d) => sum + d.expected, 0);
  const forecastProjection = `Projected total of ${totalForecastTickets} requests over the next 28 days across ${forecastResult.days.length} days.`;

  // 4. Format oldest tickets (guaranteeing no user names are included)
  const now = Date.now();
  const oldest_tickets = (oldestOpen ?? []).map((t) => ({
    reference: t.reference as string,
    subject: t.subject as string,
    age_days: Math.floor((now - new Date(t.created_at as string).getTime()) / 86_400_000),
  }));

  return NextResponse.json({
    department,
    week_start: weekStart,
    week_end: weekEnd,
    metrics,
    ai_summary: null,
    forecast: {
      projection: forecastProjection,
      days: forecastResult.days,
    },
    oldest_tickets,
  });
}