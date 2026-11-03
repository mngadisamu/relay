import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadAuditEntries, readFilters, toCsv } from "../audit";

// The most rows one export holds. Narrow the dates to get older entries.
const EXPORT_LIMIT = 5000;

// Export CSV (S2-12): the same entries as the screen, with the same filters.
// Runs as the signed-in user, so row-level security still applies.
export async function GET(request: Request) {
  await requireRole(["compliance", "manager"]);
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const filters = readFilters(params);

  const supabase = await createClient();
  const { entries, error } = await loadAuditEntries(supabase, filters, EXPORT_LIMIT);
  if (error) return new Response("The audit log couldn't be loaded: " + error, { status: 500 });

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
  return new Response(toCsv(entries), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relay-audit-log-${today}.csv"`,
    },
  });
}
