"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { generateWeeklyInsight } from "@/lib/insights";
import { createClient } from "@/lib/supabase/server";

const DEPARTMENTS = ["IT", "HR", "Finance", "Operations"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Adds days to a YYYY-MM-DD date.
function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Writes (or rewrites) the AI summary for one week, for one department or all of them (S2-28).
// Only managers can run it, and it runs the same dashboard_metrics() call as the page,
// so the summary is written from the same numbers the manager sees.
export async function writeWeeklySummary(formData: FormData) {
  const profile = await requireRole(["manager"]);

  const weekStart = String(formData.get("week_start") ?? "");
  const dept = String(formData.get("department") ?? "");
  const department = DEPARTMENTS.includes(dept) ? dept : null;
  if (!DATE.test(weekStart)) return;
  const weekEnd = addDays(weekStart, 6);

  const supabase = await createClient();
  const { data: metrics, error } = await supabase.rpc("dashboard_metrics", {
    p_from: weekStart,
    p_to: weekEnd,
    p_department: department,
  });
  if (error || !metrics) return;

  const scope = `the week of ${weekStart} to ${weekEnd}, ${department ?? "all departments"}`;
  const result = await generateWeeklyInsight(metrics, scope);

  const row = {
    week_start: weekStart,
    department,
    summary: result.summary,
    metrics,
    status: result.status,
  };

  // One summary per week and department (see the insights index in 0007). Update it if it exists.
  let existingQuery = supabase.from("insights").select("id").eq("week_start", weekStart);
  existingQuery = department ? existingQuery.eq("department", department) : existingQuery.is("department", null);
  const { data: existing } = await existingQuery.maybeSingle<{ id: number }>();

  const saved = existing
    ? await supabase.from("insights").update(row).eq("id", existing.id).select("id").single()
    : await supabase.from("insights").insert(row).select("id").single();
  if (saved.error || !saved.data) return;

  // Every generated summary goes in the audit log (docs/audit-actions.md).
  await supabase.from("audit_log").insert({
    actor: profile.id,
    action: "insight_generate",
    details: {
      insight_id: saved.data.id,
      department,
      week_start: weekStart,
      ai_generated: result.status === "ok",
    },
  });

  revalidatePath("/manager/dashboard");
}
