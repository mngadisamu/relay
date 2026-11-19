import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { secondStepMissing } from "@/lib/mfa";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "manager") {
    return NextResponse.json({ error: "Only managers can view saved reports." }, { status: 403 });
  }
  // S4-17: managers and compliance also need the second sign-in step.
  if (await secondStepMissing(profile)) {
    return NextResponse.json({ error: "Complete the two-step sign-in first." }, { status: 403 });
  }

  const supabase = await createClient();
  let query = supabase
    .from("reports")
    .select("id, department, week_start, created_at")
    .order("created_at", { ascending: false });
  // A department manager sees only their own department's saved reports.
  if (profile.department) query = query.eq("department", profile.department);
  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // The table stores the Monday only; the Sunday is the Monday plus six days.
  const reports = (data ?? []).map((r) => {
    const end = new Date(`${r.week_start}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 6);
    return { ...r, week_end: end.toISOString().slice(0, 10) };
  });

  return NextResponse.json({ reports });
}