import type { createClient } from "@/lib/supabase/server";

// The Risk report (S2-30): how Relay's AI behaved over a date range, for
// compliance. Shared by the page (/compliance/risk) and its PDF, so both always
// show the same numbers and wording.

type Supabase = Awaited<ReturnType<typeof createClient>>;

// The shape risk_metrics() returns (migration 0014).
export type RiskMetrics = {
  from: string;
  to: string;
  drafts: {
    drafted: number;
    sent: number;
    sent_unchanged: number;
    pct_unchanged: number | null;
    ai_unavailable?: number; // Gemini didn't answer, so the template was given (0016)
    sensitive_kept?: number; // template on purpose: sensitive request (0016)
  };
  routing: {
    routed: number;
    changed: number;
    confirmed: number;
    needs_review: number;
    pct_changed: number | null;
    pct_needs_review: number | null;
  };
  sensitive: number;
  flags: {
    raised: number;
    open: number;
    resolved: number;
    needs_change: number;
    sent_without_edits: number;
    invented_detail: number;
    person: number;
  };
};

// Today in South African time, as "2026-11-06".
export function todaySast() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
}

function daysBefore(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

const isDate = (v: string | undefined) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

// The date range from the address (?from=…&to=…); the last 30 days by default.
export function readRange(params: { from?: string; to?: string }) {
  const to = isDate(params.to) ? params.to! : todaySast();
  const from = isDate(params.from) ? params.from! : daysBefore(to, 29);
  return { from, to };
}

export async function loadRiskMetrics(supabase: Supabase, range: { from: string; to: string }) {
  const { data, error } = await supabase.rpc("risk_metrics", { p_from: range.from, p_to: range.to });
  return { metrics: (data ?? null) as RiskMetrics | null, error: error?.message ?? null };
}

// "50%", or "–" when there was nothing to count.
export const pct = (v: number | null) => (v === null ? "–" : `${Number(v).toFixed(v % 1 === 0 ? 0 : 1)}%`);

// "6 Nov 2026"
export const formatDay = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// The numbers, each with what it means, in the order they appear on the page
// and in the PDF.
export function riskRows(m: RiskMetrics) {
  return [
    {
      label: "Replies drafted by AI",
      value: String(m.drafts.drafted),
      note: `${m.drafts.sent} AI-drafted replies were sent in this period.${
        m.drafts.ai_unavailable ? ` ${m.drafts.ai_unavailable} more drafts were the plain template, because the AI didn't answer.` : ""
      }`,
    },
    {
      label: "Sent without edits",
      value: pct(m.drafts.pct_unchanged),
      note: `${m.drafts.sent_unchanged} of ${m.drafts.sent} sent exactly as the AI wrote them. High means agents may be trusting the AI without reading.`,
    },
    {
      label: "Routings changed by an agent",
      value: pct(m.routing.pct_changed),
      note: `${m.routing.changed} of ${m.routing.routed} requests were moved to another department. High means the classifier is often wrong.`,
    },
    {
      label: "Marked Needs review",
      value: pct(m.routing.pct_needs_review),
      note: `${m.routing.needs_review} of ${m.routing.routed} were routed with under 60% confidence, so an agent had to check them.`,
    },
    {
      label: "Flags open",
      value: String(m.flags.open),
      note: `${m.flags.raised} replies flagged in this period; ${m.flags.resolved} reviewed, ${m.flags.needs_change} needed a change.`,
    },
    {
      label: "Sensitive requests kept from Gemini",
      value: String(m.sensitive),
      note: "Harassment, wellbeing, incidents, security and personal matters: their text never went to the AI.",
    },
  ];
}

// A warning when Gemini didn't answer for some drafts in the range: agents got
// the plain template instead, so "0 AI drafts" can mean the AI is down, over
// its daily limit, or its model name has changed, not that nobody used it.
export function aiUnavailableWarning(m: RiskMetrics) {
  const n = m.drafts.ai_unavailable ?? 0;
  if (n === 0) return null;
  const total = n + m.drafts.drafted;
  return `The AI didn't answer for ${n} of ${total} drafts in this period, so agents got the plain template instead. Check the Gemini key, its daily limit and the model name in the draft route.`;
}

// The bias test (S2-21, docs/responsible-ai/bias-test.md). Update this when
// the test is run again.
export const BIAS_SUMMARY = {
  ranOn: "5 and 9 Nov 2026",
  points: [
    "Names: 0 of 40 requests went to a different department for Thabo Mokoena, Sarah van der Merwe, Priya Naidoo or Johan Botha. The classifier can't see names.",
    "Depots: 2 of 40 short IT requests went to Operations when the person wrote \"City Deep depot\", and any depot lowered confidence. Both were marked Needs review. Fix planned for the next retrain.",
    "AI drafts by name: 50 of 50 drafts made. Tone, thanks and help offered were the same for every name. Some single requests differed in length by up to 16 words; we can't yet tell whether that is the name or chance. Next: three drafts per name.",
  ],
  link: "https://github.com/mngadisamu/relay/blob/main/docs/responsible-ai/bias-test.md",
};

// Every AI output in Relay, and whether its screen shows the AI note (S2-07).
// Checked by hand on Fri 6 Nov 2026 for S2-30; check again when a screen changes.
export type LabelCheck = { output: string; screen: string; status: "ok" | "missing" | "not built yet"; note: string };
export const AI_LABEL_CHECKS: LabelCheck[] = [
  { output: "Routing", screen: "Agent ticket view", status: "ok", note: "\"Routed by AI · n% sure · an agent can change it\"" },
  { output: "Routing", screen: "Staff: request sent", status: "missing", note: "\"Sent to IT\" doesn't say the AI chose it (Mihlali, staff pages)" },
  { output: "Draft", screen: "Agent reply box", status: "ok", note: "\"AI-drafted · check before sending\"" },
  { output: "Draft", screen: "Staff: request detail", status: "ok", note: "\"Drafted with AI, then checked and sent by the … team\"" },
  { output: "Draft", screen: "Flagged replies", status: "ok", note: "AI note on every draft shown" },
  { output: "Summary", screen: "Weekly report preview", status: "ok", note: "Shown when the report has an AI summary" },
  { output: "Summary", screen: "Dashboard insights", status: "not built yet", note: "S2-28 / S2-33 (Mihlali): must use <AiNote kind=\"summary\" />" },
  { output: "Forecast", screen: "Forecast view", status: "not built yet", note: "S2-27 (Elzel): must use <AiNote kind=\"forecast\" />" },
];
