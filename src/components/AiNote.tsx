// The transparency note shown with every piece of AI work (S2-07, contract 3).
// Relay's rule: AI output is always labelled and a person can check or change it.
//
//   <AiNote kind="routing" confidence={0.92} />   Routed by AI · 92% sure · an agent can change it
//   <AiNote kind="draft" />                        AI-drafted · check before sending
//   <AiNote kind="summary" />                      Summary written by AI · check it against the numbers
//   <AiNote kind="forecast" />                     Forecast from past tickets · a guide, not a promise

type Props =
  | { kind: "routing"; confidence: number }
  | { kind: "draft" | "summary" | "forecast"; confidence?: never };

// The agreed wording for each kind. Change it here, and it changes everywhere.
function wording(props: Props): string {
  switch (props.kind) {
    case "routing":
      return `Routed by AI · ${Math.round(props.confidence * 100)}% sure · an agent can change it`;
    case "draft":
      return "AI-drafted · check before sending";
    case "summary":
      return "Summary written by AI · check it against the numbers";
    case "forecast":
      return "Forecast from past tickets · a guide, not a promise";
  }
}

export function AiNote(props: Props) {
  return (
    <span className="inline-flex min-h-6 items-center gap-1.5 rounded bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-dark">
      {/* Small spark icon; the words carry the meaning, so it's hidden from screen readers. */}
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.5 6.5l2.5 2.5M15 15l2.5 2.5M17.5 6.5L15 9M9 15l-2.5 2.5" />
      </svg>
      {wording(props)}
    </span>
  );
}