// Shown straight away while a page loads its data, so a click never feels
// like nothing happened. Next.js uses it through the loading.tsx files.
export function PageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="min-h-screen bg-page">
      <div className="h-14 border-b border-line bg-white" />
      <main className="mx-auto max-w-3xl space-y-3 px-4 py-5" aria-busy="true">
        <p role="status" className="text-sm text-muted">
          {label}
        </p>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-[10px] border border-line bg-white" />
        ))}
      </main>
    </div>
  );
}
