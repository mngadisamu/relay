import { formatExact, type AuditEntry } from "./audit";

// The list of audit entries (S2-12). On a phone the table scrolls sideways inside
// its own box, so the page itself never does.
export function AuditTable({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-[10px] border border-line bg-white px-5 py-8 text-center text-[15px] text-ink-2">
        No entries match these filters. Try a wider date range, or clear the filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[10px] border border-line bg-white">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line text-[13px] text-muted">
            <th scope="col" className="px-4 py-3 font-medium">When (SAST)</th>
            <th scope="col" className="px-4 py-3 font-medium">Who</th>
            <th scope="col" className="px-4 py-3 font-medium">Action</th>
            <th scope="col" className="px-4 py-3 font-medium">Ticket</th>
            <th scope="col" className="px-4 py-3 font-medium">Summary</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-line-soft align-top last:border-0">
              <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink-2">
                <time dateTime={e.createdAt}>{formatExact(e.createdAt)}</time>
              </td>
              <td className="px-4 py-3 text-ink">{e.who}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <span className="font-medium text-ink">{e.actionLabel}</span>
                <span className="block font-mono text-xs text-muted">{e.action}</span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink">{e.reference ?? "—"}</td>
              <td className="px-4 py-3 leading-5 text-ink">{e.summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
