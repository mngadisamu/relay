import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { loadRiskMetrics, readRange } from "@/lib/risk";
import { buildRiskPdf } from "./build";

// Export PDF for the Risk report (S2-30). Under /compliance, so the middleware
// already requires sign-in; the role is checked here too, as every route must.

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || !["compliance", "manager"].includes(profile.role)) {
    return NextResponse.json({ error: "Only compliance and managers can export the risk report" }, { status: 403 });
  }

  const range = readRange({
    from: request.nextUrl.searchParams.get("from") ?? undefined,
    to: request.nextUrl.searchParams.get("to") ?? undefined,
  });
  const supabase = await createClient();
  const { metrics, error } = await loadRiskMetrics(supabase, range);
  if (!metrics) return NextResponse.json({ error: error ?? "No numbers for this range" }, { status: 400 });

  const pdf = buildRiskPdf(metrics, range);

  // Record who took a copy, as for the weekly reports (docs/audit-actions.md).
  await supabase.from("audit_log").insert({
    actor: profile.id,
    action: "risk_report_download",
    details: { from: range.from, to: range.to },
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Relay-risk-report-${range.from}-to-${range.to}.pdf"`,
    },
  });
}
