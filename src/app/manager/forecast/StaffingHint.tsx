"use client";

import { useState } from "react";
import type { ForecastDay } from "@/lib/forecast";
import { agentsByWeek, formatShortDate } from "@/lib/staffing";

export function StaffingHint({ days, callout }: { days: ForecastDay[]; callout: string | null }) {
  const [raw, setRaw] = useState("15");
  const perAgent = Number(raw);
  const valid = Number.isFinite(perAgent) && perAgent > 0;

  return (
    <div className="space-y-3">
      {callout && <p className="rounded bg-amber-50 p-3 text-sm">{callout}</p>}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor="per-agent">Tickets one agent handles per day</label>
        <input
          id="per-agent"
          type="number"
          min={1}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          className="w-20 rounded border px-2 py-1"
        />
      </div>

      {valid ? (
        <ul className="space-y-1 text-sm">
          {agentsByWeek(days, perAgent).map((w) => (
            <li key={w.weekStart}>
              Week of {formatShortDate(w.weekStart)}: {w.agents} {w.agents === 1 ? "agent" : "agents"} (estimate)
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Enter a number above 0 to see the agents needed.</p>
      )}
    </div>
  );
}