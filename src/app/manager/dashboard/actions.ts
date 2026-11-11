"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { generateWeeklyInsight } from "@/lib/insights";
import { createClient } from "@/lib/supabase/server";

const DEPARTMENTS = ["IT", "HR", "Finance", "Operations"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Writes (or rewrites) the AI summary for the exact period the manager is looking at,
// for one department or all of them (S2-28). It runs the same dashboard_metrics() call as
// the dashboard, so the summary always describes the numbers shown above it.
export async function writeWeeklySummary(formData: FormData) {
  const profile = await requireRole(["manager"]);

  const periodFrom = String(formData.get("period_from") ?? "");
  const periodTo = String(formData.get("period_to") ?? "");
  const dept = String(formData.get("department") ?? "");
  const department = DEPARTMENTS.includes(dept) ? dept : null;
  if (!DATE.test(periodFrom) || !DATE.test(periodTo) || periodFrom > periodTo) return;

  const supabase = await createClient();
  const { data: metrics, error } = await supabase.rpc("dashboard_metrics", {
    p_from: periodFrom,
    p_to: periodTo,
    p_department: department,
  });
  if (error || !metrics) return;

  // Only the fields docs/metrics.md allows for the summary go to Gemini.
  const m = metrics as Record<string, unknown>;
  const summaryNumbers = {
    period: m.period,
    department: m.department,
    cards: m.cards,
    resolution_hours: m.resolution_hours,
    by_priority: m.by_priority,
  };

  const scope = `the period from ${periodFrom} to ${periodTo}, ${department ?? "all departments"}`;
  const result = await generateWeeklyInsight(summaryNumbers, scope);

  const row = {
    // week_start is kept only because the column is required; the period columns are what is matched.
    week_start: periodFrom,
    period_from: periodFrom,
    period_to: periodTo,
    department,
    summary: result.summary,
    metrics: summaryNumbers,
    status: result.status,
  };

  // One summary per exact period and department (migration 0017). Update it if it exists.
  let existingQuery = supabase.from("insights").select("id").eq("period_from", periodFrom).eq("period_to", periodTo);
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
      period_from: periodFrom,
      period_to: periodTo,
      ai_generated: result.status === "ok",
    },
  });

  revalidatePath("/manager/dashboard");
  revalidatePath("/manager/reports");
}
