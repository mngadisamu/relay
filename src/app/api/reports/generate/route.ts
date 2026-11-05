import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

const DEPARTMENTS = ["HR", "IT", "Finance", "Operations"];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// Report preview numbers (S2-15): one department, one week.
// Everything under /api is public in the middleware, so check who is calling here.
// It runs as the signed-in manager (normal key), so row-level security applies.
export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "manager") {
    return NextResponse.json({ error: "Only managers can open reports." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const department = String(body?.department ?? "");
  const weekStart = String(body?.week_start ?? "");
  if (!DEPARTMENTS.includes(department) || !DAY.test(weekStart)) {
    return NextResponse.json({ error: "Choose a department and a week." }, { status: 400 });
  }
  // The week runs Monday to Sunday: the start day plus 6 days.
  const end = new Date(`${weekStart}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  const weekEnd = end.toISOString().slice(0, 10);

  const supabase = await createClient();
  const [{ data: metrics, error: metricsError }, { data: oldestOpen, error: ticketsError }] = await Promise.all([
    // Mihlali's function (migration 0007): these are its exact parameter names.
    supabase.rpc("dashboard_metrics", { p_from: weekStart, p_to: weekEnd, p_department: department }),
    // The 5 oldest tickets that aren't closed yet. "open" isn't a status in Relay.
    supabase
      .from("tickets")
      .select("reference, subject, created_at")
      .eq("department", department)
      .eq("is_historical", false)
      .neq("status", "closed")
      .order("created_at", { ascending: true })
      .limit(5),
  ]);
  if (metricsError || ticketsError) {
    return NextResponse.json({ error: (metricsError ?? ticketsError)?.message }, { status: 500 });
  }

  // Shaped the way ReportPreview reads it. The AI summary (S2-28/S2-34) and the
  // forecast (S2-24) are added by later stories, so they're empty for now.
  const now = Date.now();
  const oldest_tickets = (oldestOpen ?? []).map((t) => ({
    reference: t.reference as string,
    subject: t.subject as string,
    age_days: Math.floor((now - new Date(t.created_at as string).getTime()) / 86_400_000),
  }));
  return NextResponse.json({ department, week_start: weekStart, week_end: weekEnd, metrics, ai_summary: null, forecast: null, oldest_tickets });
}
