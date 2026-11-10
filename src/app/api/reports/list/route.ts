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
    .select("id, department, week_start, week_end, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reports: data ?? [] });
}