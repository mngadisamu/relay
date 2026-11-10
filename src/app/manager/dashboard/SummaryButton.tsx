"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

// The button that writes the summary for the period on screen (S2-33). Gemini can take up to
// 25 seconds, so while the form is sending, the button says so and stays disabled.
// It has to be a client component to read the form's pending state.
export function SummaryButton({ hasSummary }: { hasSummary: boolean }) {
  const { pending } = useFormStatus();

  return (
    <div className="space-y-2">
      <Button type="submit" disabled={pending} aria-disabled={pending} className="w-full sm:w-auto">
        {pending ? "Writing the summary…" : hasSummary ? "Write the summary again" : "Write the summary for this period"}
      </Button>
      {pending ? (
        <p role="status" className="text-sm text-ink-2">
          This can take up to 25 seconds. Keep this page open.
        </p>
      ) : null}
    </div>
  );
}
