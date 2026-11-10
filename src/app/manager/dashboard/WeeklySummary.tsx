import { AiNote } from "@/components/AiNote";
import { Card, CardContent } from "@/components/ui/card";
import { writeWeeklySummary } from "./actions";
import { SummaryButton } from "./SummaryButton";

// The AI summary box on the dashboard (S2-33). It shows the saved summary for exactly the
// period and department filtered above (not a fixed week), labelled as AI-written, with the
// time it was written. If there isn't one for this period, it says so and offers to write one.
// The numbers above it are always the source of truth.

export type SavedSummary = {
  summary: string | null;
  status: "ok" | "unavailable";
  created_at: string;
};

export function WeeklySummary({
  from,
  to,
  periodLabel,
  department,
  saved,
}: {
  from: string;
  to: string;
  periodLabel: string;
  department: string | null;
  saved: SavedSummary | null;
}) {
  const hasSummary = saved?.status === "ok" && !!saved.summary;
  const writtenAt = saved
    ? new Date(saved.created_at).toLocaleString("en-ZA", {
        timeZone: "Africa/Johannesburg",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <section aria-labelledby="ai-summary-heading">
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="space-y-1">
            <h2 id="ai-summary-heading" className="text-base font-semibold text-ink">
              AI summary · written from the numbers above
            </h2>
            <p className="text-sm text-ink-2">
              {periodLabel}, {department ?? "all departments"}
            </p>
          </div>

          {hasSummary ? (
            <div className="space-y-2">
              <p className="text-[15px] leading-6 text-ink">{saved.summary}</p>
              <AiNote kind="summary" />
              <p className="text-xs text-muted">Written {writtenAt}. It covers exactly the period above.</p>
            </div>
          ) : (
            <p className="text-sm text-ink-2">
              {saved
                ? "Summary unavailable for this period; the numbers above are up to date."
                : "No summary has been written for this period yet."}
            </p>
          )}

          {/* Managers can write or rewrite the summary for exactly this period. */}
          <form action={writeWeeklySummary} className="pt-1">
            <input type="hidden" name="period_from" value={from} />
            <input type="hidden" name="period_to" value={to} />
            <input type="hidden" name="department" value={department ?? ""} />
            <SummaryButton hasSummary={!!saved} />
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
