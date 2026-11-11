import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RoleHeader } from "@/components/RoleHeader";
import { COMPLIANCE_MENU, MANAGER_MENU } from "@/lib/menus";
import { AI_LABEL_CHECKS, BIAS_SUMMARY, aiUnavailableWarning, formatDay, loadRiskMetrics, readRange, riskRows } from "@/lib/risk";

// Risk report (S2-30): one page on how Relay's AI is behaving, so the risks
// are visible and can be shared (Export PDF). The numbers come from
// risk_metrics() (migration 0014); the bias test and the AI label check are
// written down in src/lib/risk.ts.

const STATUS_TEXT = { ok: "Shown", missing: "Missing", "not built yet": "Not built yet" } as const;
const STATUS_STYLE = {
  ok: "bg-[#e5f3ea] text-[#1b6b36]",
  missing: "bg-[#fdecea] text-[#8f1f15]",
  "not built yet": "bg-[#eceef1] text-[#3d4651]",
} as const;

export default async function RiskReportPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const profile = await requireRole(["compliance", "manager"]);
  const range = readRange(await searchParams);
  const isManager = profile.role === "manager";

  const supabase = await createClient();
  const { metrics, error } = await loadRiskMetrics(supabase, range);
  const field = "h-11 w-full rounded-md border border-field bg-white px-3 text-sm text-ink focus:outline-2 focus:outline-brand";
  const pdfHref = `/compliance/risk/pdf?from=${range.from}&to=${range.to}`;

  return (
    <div className="min-h-screen bg-page">
      <RoleHeader
        profile={profile}
        home={isManager ? "/manager" : "/compliance"}
        menu={isManager ? MANAGER_MENU : COMPLIANCE_MENU}
        current="/compliance/risk"
      />
      <main className="mx-auto max-w-[1100px] space-y-6 px-4 pb-12 pt-7 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-ink sm:text-2xl">Risk report</h1>
            <p className="text-[15px] text-ink-2">
              How Relay&apos;s AI behaved from {formatDay(range.from)} to {formatDay(range.to)}. Live requests only; times
              are South African time.
            </p>
          </div>
          {metrics && (
            <a
              href={pdfHref}
              download
              className="inline-flex h-11 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Export PDF
            </a>
          )}
        </div>

        <form method="get" className="grid gap-3 rounded-[10px] border border-line bg-white p-4 sm:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-1.5">
            <label htmlFor="from" className="block text-[13px] font-medium text-ink-2">From</label>
            <input id="from" name="from" type="date" defaultValue={range.from} className={field} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="to" className="block text-[13px] font-medium text-ink-2">To</label>
            <input id="to" name="to" type="date" defaultValue={range.to} className={field} />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="h-11 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark">
              Apply
            </button>
            <Link href="/compliance/risk" className="flex h-11 items-center rounded-md px-3 text-sm font-medium text-brand hover:text-brand-dark">
              Last 30 days
            </Link>
          </div>
        </form>

        {error && (
          <p role="alert" className="rounded-md border border-[#f0c8c3] bg-[#fdf1ef] px-3 py-2.5 text-sm text-[#a4231a]">
            The report couldn&apos;t be loaded: {error}
          </p>
        )}

        {metrics && aiUnavailableWarning(metrics) && (
          <p role="status" className="flex gap-3 rounded-[10px] border border-[#f3d58a] bg-[#fff8e5] px-4 py-3 text-sm leading-6 text-[#5c4300]">
            <span aria-hidden="true" className="font-bold">!</span>
            <span>
              <span className="font-semibold">AI unavailable.</span> {aiUnavailableWarning(metrics)}
            </span>
          </p>
        )}

        {metrics && (
          <section aria-labelledby="numbers-heading" className="space-y-3">
            <h2 id="numbers-heading" className="text-base font-semibold text-ink sm:text-lg">
              1. How the AI was used
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {riskRows(metrics).map((row) => (
                <li key={row.label} className="space-y-1 rounded-[10px] border border-line bg-white p-4">
                  <p className="text-sm font-medium text-ink-2">{row.label}</p>
                  <p className="text-2xl font-semibold text-ink sm:text-3xl">{row.value}</p>
                  <p className="text-[13px] leading-5 text-muted">{row.note}</p>
                </li>
              ))}
            </ul>
            <p className="text-sm text-ink-2">
              Open flags are on{" "}
              <Link href="/compliance/flags" className="font-medium text-brand hover:text-brand-dark">
                Flagged replies
              </Link>
              ; every decision is in the{" "}
              <Link href="/compliance/audit" className="font-medium text-brand hover:text-brand-dark">
                Audit log
              </Link>
              .
            </p>
          </section>
        )}

        <section aria-labelledby="bias-heading" className="space-y-3 rounded-[10px] border border-line bg-white p-4">
          <h2 id="bias-heading" className="text-base font-semibold text-ink sm:text-lg">
            2. Bias test
          </h2>
          <p className="text-sm text-ink-2">
            The same requests sent with four names and three depots, run on {BIAS_SUMMARY.ranOn}.
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink">
            {BIAS_SUMMARY.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <a href={BIAS_SUMMARY.link} className="inline-block text-sm font-medium text-brand hover:text-brand-dark">
            Read the full bias test
          </a>
        </section>

        <section aria-labelledby="labels-heading" className="space-y-3">
          <div className="space-y-1">
            <h2 id="labels-heading" className="text-base font-semibold text-ink sm:text-lg">
              3. AI labels on each screen
            </h2>
            <p className="text-sm text-ink-2">Every piece of AI output should say it came from AI. Checked by hand on 6 Nov 2026.</p>
          </div>
          <ul className="divide-y divide-line-soft rounded-[10px] border border-line bg-white">
            {AI_LABEL_CHECKS.map((c) => (
              <li key={`${c.output}-${c.screen}`} className="grid gap-1 px-4 py-3 sm:grid-cols-[1.4fr_auto_2fr] sm:items-center sm:gap-4">
                <p className="text-sm text-ink">
                  <span className="font-semibold">{c.output}</span> · {c.screen}
                </p>
                <span className={`inline-flex h-[22px] w-fit items-center rounded px-2 text-xs font-semibold ${STATUS_STYLE[c.status]}`}>
                  {STATUS_TEXT[c.status]}
                </span>
                <p className="text-[13px] text-muted">{c.note}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
