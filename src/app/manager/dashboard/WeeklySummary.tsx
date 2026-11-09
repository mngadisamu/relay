import { AiNote } from "@/components/AiNote";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { writeWeeklySummary } from "./actions";

// The AI summary box on the dashboard (S2-33). It shows the saved summary for the
// week, labelled as AI-written, or says plainly that there isn't one. The numbers
// above it are always the source of truth.

export type SavedSummary = {
  summary: string | null;
  status: "ok" | "unavailable";
};

export function WeeklySummary({
  weekStart,
  weekEnd,
  department,
  saved,
}: {
  weekStart: string;
  weekEnd: string;
  department: string | null;
  saved: SavedSummary | null;
}) {
  const hasSummary = saved?.status === "ok" && !!saved.summary;

  return (
    <section aria-labelledby="ai-summary-heading">
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="space-y-1">
            <h2 id="ai-summary-heading" className="text-base font-semibold text-ink">
              AI summary · written from the numbers above
            </h2>
            <p className="text-sm text-ink-2">
              Week of {weekStart} to {weekEnd}, {department ?? "all departments"}
            </p>
          </div>

          {hasSummary ? (
            <div className="space-y-2">
              <p className="text-[15px] leading-6 text-ink">{saved.summary}</p>
              <AiNote kind="summary" />
            </div>
          ) : (
            <p className="text-sm text-ink-2">Summary unavailable; the numbers above are up to date.</p>
          )}

          {/* Managers can write or rewrite the summary for this week. */}
          <form action={writeWeeklySummary} className="pt-1">
            <input type="hidden" name="week_start" value={weekStart} />
            <input type="hidden" name="department" value={department ?? ""} />
            <Button type="submit" variant="outline" className="w-full sm:w-auto">
              {saved ? "Write the summary again" : "Write the summary for this week"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
