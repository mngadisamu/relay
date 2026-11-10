import { GoogleGenAI } from "@google/genai";

// Weekly AI summary (S2-28). Gemini writes 3 to 5 sentences from the week's numbers.
// Only the numbers go to Gemini: no ticket text and no names. The result is checked
// before it is saved, and if Gemini fails, is too slow or breaks the rules, the
// summary is "unavailable" and the numbers still show on the dashboard.

// Gemini key stays on the server only (never NEXT_PUBLIC_).
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// How long to wait for Gemini. 10 seconds failed too often in live use (Gemini was
// slow or overloaded), so the limit is 25 seconds. S2-28 was changed to match; the
// manager waits on the button, so the wait is acceptable.
const TIMEOUT_MS = 25_000;

export type InsightResult =
  | { status: "ok"; summary: string }
  | { status: "unavailable"; summary: null; reason: string };

// Every number in the metrics, as plain numbers. "09" becomes 9, and a date such as
// "2026-11-09" gives 2026, 11 and 9.
function numbersIn(value: unknown): Set<number> {
  const found = new Set<number>();
  for (const m of JSON.stringify(value).matchAll(/\d+(?:\.\d+)?/g)) found.add(Number(m[0]));
  return found;
}

// Returns why the summary is rejected, or null when it is fine: 3 to 5 sentences,
// and every number in it is one of the metrics. "Rejected" means "unavailable".
export function checkSummary(summary: string, metrics: unknown): string | null {
  const sentences = summary.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim().length > 0);
  if (sentences.length < 3 || sentences.length > 5) {
    return `The summary had ${sentences.length} sentences, not 3 to 5.`;
  }
  const allowed = numbersIn(metrics);
  for (const m of summary.matchAll(/\d+(?:\.\d+)?/g)) {
    if (!allowed.has(Number(m[0]))) return `The summary used the number ${m[0]}, which is not in the metrics.`;
  }
  return null;
}

// The prompt sends the numbers and nothing else. It asks for plain sentences that
// use only those numbers and don't guess a cause.
function promptFor(metrics: unknown, scope: string) {
  return `You write a short weekly summary of a help desk's numbers for a manager at Kopano Freight, a logistics company in Johannesburg.
Scope: ${scope}.

Write 3 to 5 plain sentences in South African English. Say what went up or down compared with the previous period, and which number the manager may want to look at.
Use only the numbers in the JSON below, written as digits. Don't add any other number, date or percentage, and don't guess why something changed.
No headings, no bullet points.

JSON:
${JSON.stringify(metrics)}`;
}

// The summary for one week (or one department's week). Never throws: it returns
// "unavailable" with a reason instead, so the page can still show the numbers.
export async function generateWeeklyInsight(metrics: unknown, scope: string): Promise<InsightResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Gemini timeout")), TIMEOUT_MS);
    });
    const result = await Promise.race([
      ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: promptFor(metrics, scope),
        config: { thinkingConfig: { thinkingBudget: 0 } },
      }),
      timeout,
    ]);
    const summary = result.text?.trim() ?? "";
    if (!summary) return { status: "unavailable", summary: null, reason: "Gemini sent an empty answer." };

    const problem = checkSummary(summary, metrics);
    if (problem) {
      console.warn("Weekly summary rejected:", problem);
      return { status: "unavailable", summary: null, reason: problem };
    }
    return { status: "ok", summary };
  } catch (error) {
    console.warn("Gemini failed or timed out; no weekly summary:", error);
    return { status: "unavailable", summary: null, reason: "Gemini failed or took over 25 seconds." };
  } finally {
    clearTimeout(timer);
  }
}
