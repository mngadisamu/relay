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

// The Action dropdown's closed label: what is picked, in words.
function actionSummary(actions: string[] | undefined) {
  if (!actions || actions.length === 0) return "All actions";
  if (actions.length === 1) return ACTION_LABEL[actions[0]];
  return `${actions.length} actions selected`;
}

// Audit log (S2-12): every AI decision and human change, so compliance can answer
// "who did what, and when?" for any ticket. Filters live in the address, so a
// filtered view can be bookmarked or shared.
export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
          <h1 className="text-xl font-semibold text-ink sm:text-2xl">Audit log</h1>
          <p className="text-[15px] text-ink-2">
            Every AI decision and every change people make, with who and when. Times are South African time.
          </p>
        </div>

        {/* A plain GET form: the filters go into the address, so no JavaScript is needed. */}
        <form method="get" className="grid gap-3 rounded-[10px] border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1.2fr_auto]">
          <fieldset className="space-y-1.5">
            <legend className="block text-[13px] font-medium text-ink-2">Action</legend>
            {/* A dropdown that opens into checkboxes, so several actions can be picked at once. */}
            <details className="relative">
              <summary className={`${field} flex cursor-pointer list-none items-center justify-between`}>
                <span>{actionSummary(filters.actions)}</span>
                <span aria-hidden="true">▾</span>
              </summary>
              <div className="absolute z-20 mt-1 max-h-80 w-full min-w-[340px] overflow-y-auto rounded-md border border-line bg-white p-2 shadow-lg">
                {ACTIONS.map((a) => (
                  // Every row has the same layout: the box and the first line of text share a top edge,
                  // so long names that wrap don't push one box out of line with the others.
                  <label key={a} className="flex items-start gap-3 rounded px-2 py-2 text-sm text-ink hover:bg-page">
                    {/* One box style for every row. The real checkbox is visually hidden; the box shows its state. */}
                    <input type="checkbox" name="action" value={a} defaultChecked={filters.actions?.includes(a)} className="peer sr-only" />
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-field bg-white peer-checked:border-brand peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 peer-checked:opacity-100">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    </span>
                    <span className="min-w-0 leading-5">
                      {ACTION_LABEL[a]} <span className="font-mono text-xs text-muted">({a})</span>
                    </span>
                  </label>
                ))}
              </div>
            </details>
          </fieldset>
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

        {filters.actions && (
          <p className="text-sm text-ink-2">
            Showing: <span className="font-medium text-ink">{filters.actions.map((a) => ACTION_LABEL[a]).join(", ")}</span>
          </p>
        )}

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
