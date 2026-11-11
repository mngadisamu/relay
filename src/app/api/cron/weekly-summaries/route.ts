import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateWeeklyInsight } from "@/lib/insights";

// Monday AI summaries for last week (S2-34). Vercel calls this on the schedule in vercel.json.
// Nobody is signed in when it runs, so it uses the public (anon) key plus CRON_SECRET.
// The database functions in migration 0019 check that secret. No service-role key is used here.

// Four Gemini calls run side by side; allow up to 60 seconds (the Hobby plan limit).
export const maxDuration = 60;

const DEPARTMENTS = ["HR", "IT", "Finance", "Operations"] as const;
const TZ = "Africa/Johannesburg";

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Last Monday to Sunday, in South African time. Same rule as migration 0018.
function lastWeek() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
  const base = addDays(today, -7);
  const weekday = (new Date(`${base}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  const from = addDays(base, -weekday);
  return { from, to: addDays(from, 6) };
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!secret || !url || !anonKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // Vercel sends "Authorization: Bearer <CRON_SECRET>" on its scheduled calls. Anyone else gets nothing.
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }

  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
  const { from, to } = lastWeek();

  const results = await Promise.all(
    DEPARTMENTS.map(async (department) => {
      const { data: metrics, error } = await supabase.rpc("scheduled_period_metrics", {
        p_secret: secret,
        p_from: from,
        p_to: to,
        p_department: department,
      });
      if (error || !metrics) return { department, saved: false, reason: error?.message ?? "no numbers" };

      // Only the fields docs/metrics.md allows go to Gemini (the same list as the dashboard button).
      const m = metrics as Record<string, unknown>;
      const summaryNumbers = {
        period: m.period,
        department: m.department,
        cards: m.cards,
        resolution_hours: m.resolution_hours,
        by_priority: m.by_priority,
      };

      const result = await generateWeeklyInsight(summaryNumbers, `the period from ${from} to ${to}, ${department}`);

      const { error: saveError } = await supabase.rpc("save_scheduled_summary", {
        p_secret: secret,
        p_period_from: from,
        p_period_to: to,
        p_department: department,
        p_summary: result.status === "ok" ? result.summary : null,
        p_metrics: summaryNumbers,
        p_status: result.status,
      });

      return { department, saved: !saveError, status: result.status, reason: saveError?.message ?? null };
    })
  );

  return NextResponse.json({ period: { from, to }, results });
}
