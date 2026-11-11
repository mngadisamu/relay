import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "manager") {
    return NextResponse.json({ error: "Only managers can view saved reports." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("id, department, week_start, created_at")
    .order("created_at", { ascending: false });

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