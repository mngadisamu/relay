import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RoleHeader } from "@/components/RoleHeader";
import { COMPLIANCE_MENU, MANAGER_MENU } from "@/lib/menus";
import { ACTIONS, ACTION_LABEL, filtersToQuery, loadAuditEntries, readFilters } from "./audit";
import { AuditTable } from "./AuditTable";

// How many entries the screen shows at once. Narrow the filters to see older ones;
// the CSV export goes further back.
const SCREEN_LIMIT = 300;

// Audit log (S2-12): every AI decision and human change, so compliance can answer
// "who did what, and when?" for any ticket. Filters live in the address, so a
// filtered view can be bookmarked or shared.
export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const profile = await requireRole(["compliance", "manager"]);
  const filters = readFilters(await searchParams);

  const supabase = await createClient();
  const { entries, error } = await loadAuditEntries(supabase, filters, SCREEN_LIMIT);

  const isManager = profile.role === "manager";
  const query = filtersToQuery(filters);
  const field = "h-11 w-full rounded-md border border-field bg-white px-3 text-sm text-ink focus:outline-2 focus:outline-brand";

  return (
    <div className="min-h-screen bg-page">
      <RoleHeader
        profile={profile}
        home={isManager ? "/manager" : "/compliance"}
        menu={isManager ? MANAGER_MENU : COMPLIANCE_MENU}
        current="/compliance/audit"
      />
      <main className="mx-auto max-w-[1360px] space-y-5 px-4 pb-12 pt-7 sm:px-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-ink">Audit log</h1>
          <p className="text-[15px] text-ink-2">
            Every AI decision and every change people make, with who and when. Times are South African time.
          </p>
        </div>

        {/* A plain GET form: the filters go into the address, so no JavaScript is needed. */}
        <form method="get" className="grid gap-3 rounded-[10px] border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1.2fr_auto]">
          <div className="space-y-1.5">
            <label htmlFor="action" className="block text-[13px] font-medium text-ink-2">Action</label>
            <select id="action" name="action" defaultValue={filters.action ?? ""} className={field}>
              <option value="">All actions</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {ACTION_LABEL[a]} ({a})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="from" className="block text-[13px] font-medium text-ink-2">From</label>
            <input id="from" name="from" type="date" defaultValue={filters.from} className={field} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="to" className="block text-[13px] font-medium text-ink-2">To</label>
            <input id="to" name="to" type="date" defaultValue={filters.to} className={field} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ref" className="block text-[13px] font-medium text-ink-2">Ticket reference</label>
            <input id="ref" name="ref" type="search" defaultValue={filters.ref} placeholder="e.g. KF-261105-0042" className={field} />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="h-11 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark">
              Apply
            </button>
            <Link href="/compliance/audit" className="flex h-11 items-center rounded-md px-3 text-sm font-medium text-brand hover:text-brand-dark">
              Clear
            </Link>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="text-sm text-ink-2">
            {filters.ref
              ? `History of tickets matching ${filters.ref}, oldest first: ${entries.length} ${entries.length === 1 ? "entry" : "entries"}`
              : entries.length === SCREEN_LIMIT
                ? `Showing the newest ${SCREEN_LIMIT} entries. Narrow the filters, or export them all.`
                : `${entries.length} ${entries.length === 1 ? "entry" : "entries"}, newest first`}
          </p>
          {/* A normal link, so the browser downloads the file with the same filters. */}
          <a
            href={`/compliance/audit/export${query ? `?${query}` : ""}`}
            className="inline-flex h-10 items-center gap-1.5 rounded-md border border-field bg-white px-3.5 text-sm font-medium text-ink hover:bg-page"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
            </svg>
            Export CSV
          </a>
        </div>

        {error ? (
          <p role="alert" className="rounded-md border border-[#f0c8c3] bg-[#fdf1ef] px-3 py-2.5 text-sm text-[#a4231a]">
            The audit log couldn&apos;t be loaded: {error}
          </p>
        ) : (
          <AuditTable entries={entries} />
        )}
      </main>
    </div>
  );
}
