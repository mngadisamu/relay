import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { demoEnabled } from "@/lib/demo";

// Nightly reset of the Kopano Freight demo, at 02:17 South African time (vercel.json).
// Nobody is signed in when it runs, so it uses the public (anon) key plus CRON_SECRET.
// The reset_demo_company() function checks the secret. No service-role key is used here.
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  if (!demoEnabled()) {
    return NextResponse.json({ skipped: "The demo is not switched on." });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const staffEmail = process.env.DEMO_STAFF_EMAIL;
  if (!staffEmail) {
    return NextResponse.json({ error: "DEMO_STAFF_EMAIL is not set" }, { status: 500 });
  }
  const { data, error } = await supabase.rpc("reset_demo_company", {
    p_secret: secret,
    p_staff_email: staffEmail,
  });
  if (error) {
    console.error("Demo reset failed:", error.message);
    return NextResponse.json({ error: "Demo reset failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, result: data });
}
