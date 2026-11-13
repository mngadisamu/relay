import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { buildBiasTestPdf } from "./build";

// The full bias test as a PDF (S2-21). "Read the full bias test" on the Risk report
// opens it in the browser. Under /compliance, so sign-in is already required; the
// role is checked here too, as every route must.
export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile || !["compliance", "manager"].includes(profile.role)) {
    return NextResponse.json({ error: "Only compliance and managers can read the bias test" }, { status: 403 });
  }
  return new NextResponse(Buffer.from(buildBiasTestPdf()), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="Relay-bias-test.pdf"',
    },
  });
}
