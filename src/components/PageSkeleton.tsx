// A grey placeholder shown the moment a page starts loading (loading.tsx), so the
// screen changes at once instead of freezing until the data arrives. It has no text,
// so it is hidden from screen readers; the top progress bar still says "loading".
export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="mx-auto max-w-340 space-y-6 px-4 pb-12 pt-7 sm:px-6">
      <div className="h-7 w-48 animate-pulse rounded bg-line" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border border-line-soft bg-white" />
        ))}
      </div>
      <div className="space-y-3 rounded-lg border border-line-soft bg-white p-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-page" />
        ))}
      </div>
    </div>
  );
}
