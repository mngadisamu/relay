import { formatExact, type AuditEntry } from "./audit";

// The list of audit entries (S2-12). On a phone each entry is a card, so nothing
// scrolls sideways. From tablet width (md) up, the full table is shown instead.
export function AuditTable({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-[10px] border border-line bg-white px-5 py-8 text-center text-[15px] text-ink-2">
        No entries match these filters. Try a wider date range, or clear the filters.
      </p>
    );
  }

  return (
    <>
      <ul aria-label="Audit entries" className="space-y-3 md:hidden">
        {entries.map((e) => (
          <li key={e.id} className="rounded-[10px] border border-line bg-white p-4 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <time dateTime={e.createdAt} className="tabular-nums text-ink-2">
                {formatExact(e.createdAt)}
              </time>
              {e.reference && <span className="tabular-nums text-ink">{e.reference}</span>}
            </div>
            <p className="mt-2 font-medium text-ink">{e.actionLabel}</p>
            <p className="font-mono text-xs text-muted">{e.action}</p>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              <dt className="text-muted">Who</dt>
              <dd className="break-words text-ink">{e.who}</dd>
              <dt className="text-muted">Summary</dt>
              <dd className="break-words leading-5 text-ink">{e.summary}</dd>
            </dl>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-[10px] border border-line bg-white md:block">
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
    </>
  );
}
