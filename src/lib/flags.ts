import type { createClient } from "@/lib/supabase/server";

// Flagged replies (S2-26, migration 0011). Compliance can't read every reply,
// so Relay points them at the risky ones. A flag marks one sent reply for a
// second look; compliance reviews it on /compliance/flags.

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type FlagKind = "sent_without_edits" | "invented_detail" | "person";

export const FLAG_LABEL: Record<FlagKind, string> = {
  sent_without_edits: "Sent without edits",
  invented_detail: "Possible invented detail",
  person: "Flagged by a person",
};

export type Flag = {
  id: number;
  kind: FlagKind;
  source: "auto" | "person";
  note: string | null;
  created_at: string;
  resolved_at: string | null;
  outcome: "ok" | "needs_change" | null;
};

export const FLAG_COLUMNS = "id, kind, source, note, created_at, resolved_at, outcome";

// ---------------------------------------------------------------
// "Possible invented detail"
// ---------------------------------------------------------------
// Gemini is told not to invent names, numbers or dates, but it sometimes does,
// and a wrong amount or date in a reply is a real risk (a promise the team
// can't keep). So every amount, date, time and number in the reply must also
// appear in the request, the template or an earlier message. Plain word rules,
// so the panel can see exactly what is checked.
const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*";
const DETAIL = new RegExp(
  [
    "\\bR\\s?\\d[\\d\\s,]*(?:\\.\\d{1,2})?", // amounts: R500, R 1 200, R1,200.50
    `\\b\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTH}(?:\\s+\\d{4})?\\b`, // 14 November (2026)
    `\\b${MONTH}\\s+\\d{1,2}(?:st|nd|rd|th)?\\b`, // November 14
    "\\b\\d{4}-\\d{2}-\\d{2}\\b", // 2026-11-14
    "\\b\\d{1,2}/\\d{1,2}(?:/\\d{2,4})?\\b", // 14/11, 14/11/2026
    "\\b0\\d{2}[\\s-]?\\d{3}[\\s-]?\\d{4}\\b", // phone numbers: 011 555 1234, 0821234567
    "\\b\\d{1,2}(?::\\d{2})?\\s?(?:am|pm)\\b", // 2pm, 2:30 pm
    "\\b\\d{1,2}:\\d{2}\\b", // 14:30
    "\\b\\d+(?:[.,]\\d+)?\\s?%", // 15%
    "\\b\\d+(?:[.,]\\d+)?\\b", // any other number: 48 hours, ext 2041
  ].join("|"),
  "gi",
);

// Ticket references (KF-261105-0042) are Relay's own, so they never count.
const REFERENCE = /\bKF-\d{6}-\d{4}\b/gi;

// Compare without spaces, commas or capital letters, so "R 1 200" matches "R1200".
const squash = (s: string) => s.toLowerCase().replace(/[\s,]/g, "");

// The details in a reply that aren't anywhere in the sources, in the order they
// appear, without repeats.
export function findNewDetails(reply: string, sources: string[]): string[] {
  const known = squash(sources.join(" ").replace(REFERENCE, " "));
  const found: string[] = [];
  for (const match of reply.replace(REFERENCE, " ").matchAll(DETAIL)) {
    const detail = match[0].trim();
    // A bare amount's number ("500" in "R500") counts as known if the number is.
    const plain = squash(detail).replace(/^r(?=\d)/, "");
    if (!known.includes(squash(detail)) && !known.includes(plain) && !found.includes(detail)) found.push(detail);
  }
  return found;
}

// ---------------------------------------------------------------
// The automatic check, run by sendReply right after a reply is saved
// ---------------------------------------------------------------
// Runs as the agent who sent it (flag_reply() checks that). Only replies that
// started from a Gemini draft are checked: a reply typed from scratch, or one
// from the template when Gemini was skipped, has no AI text to check.
// Never stops the send: if a check fails, it's logged and the reply stays sent.
export async function autoFlagReply(supabase: Supabase, responseId: number): Promise<Flag[]> {
  try {
    const { data: response } = await supabase
      .from("responses")
      .select("id, ticket_id, ai_draft, final_text, ai_generated, templates(body)")
      .eq("id", responseId)
      .maybeSingle<{
        id: number;
        ticket_id: number;
        ai_draft: string | null;
        final_text: string | null;
        ai_generated: boolean;
        templates: { body: string } | null;
      }>();
    if (!response?.ai_generated || !response.ai_draft || !response.final_text) return [];

    const toFlag: { kind: FlagKind; note?: string }[] = [];

    // 1. The AI draft went out exactly as Gemini wrote it.
    if (response.ai_draft.trim() === response.final_text.trim()) toFlag.push({ kind: "sent_without_edits" });

    // 2. An amount, date or number nobody gave the AI. What the agent typed counts
    //    too: it went out under an "AI-drafted" reply, so it gets the same check.
    const [{ data: ticket }, { data: messages }] = await Promise.all([
      supabase.from("tickets").select("subject, description").eq("id", response.ticket_id).maybeSingle<{ subject: string; description: string }>(),
      supabase.from("ticket_messages").select("body").eq("ticket_id", response.ticket_id),
    ]);
    const sources = [ticket?.subject ?? "", ticket?.description ?? "", response.templates?.body ?? "", ...(messages ?? []).map((m) => m.body)];
    const details = findNewDetails(response.final_text, sources);
    if (details.length > 0) toFlag.push({ kind: "invented_detail", note: details.slice(0, 5).join(", ") });

    const flags: Flag[] = [];
    for (const f of toFlag) {
      const { error } = await supabase.rpc("flag_reply", { p_response_id: responseId, p_kind: f.kind, p_note: f.note ?? null });
      if (error) console.error(`Could not flag reply ${responseId} (${f.kind}):`, error.message);
    }
    if (toFlag.length > 0) {
      const { data } = await supabase.from("flags").select(FLAG_COLUMNS).eq("response_id", responseId).order("created_at");
      flags.push(...((data ?? []) as Flag[]));
    }
    return flags;
  } catch (error) {
    console.error("The automatic flag check failed:", error);
    return [];
  }
}
