"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { NeedsReviewTag, PriorityTag, StatusPill } from "@/components/StatusPill";
import { formatWhen, type TicketPriority, type TicketStatus } from "@/app/staff/status";
import { rerouteTicket, sendReply } from "./actions";

type Tone = "formal" | "friendly" | "urgent";

export type TicketForReply = {
  id: number;
  reference: string;
  subject: string;
  description: string;
  depot: string | null;
  department: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  needs_review: boolean;
  created_at: string;
};

export type Classification = {
  predicted_department: string;
  confidence: number;
  model_version: string;
  overridden_department: string | null;
};
export type Submitter = { full_name: string; email: string; depot: string | null };
export type Draft = { id: number; ai_draft: string | null; tone: Tone; ai_generated: boolean };
export type SentReply = { final_text: string; sent_at: string; ai_generated: boolean };

// Which template goes with each tone (index in src/lib/templates.ts).
const TEMPLATE_FOR_TONE: Record<Tone, number> = { formal: 0, friendly: 1, urgent: 2 };
const TONES: { value: Tone; label: string }[] = [
  { value: "formal", label: "Formal" },
  { value: "friendly", label: "Friendly" },
  { value: "urgent", label: "Urgent" },
];
const DEPARTMENTS = ["HR", "IT", "Finance", "Operations"];

export default function TicketReply({
  ticket,
  templates,
  classification,
  submitter,
  initialDraft,
  sentReply,
}: {
  ticket: TicketForReply;
  templates: string[];
  classification: Classification | null;
  submitter: Submitter | null;
  initialDraft: Draft | null;
  sentReply: SentReply | null;
}) {
  const [tone, setTone] = useState<Tone>(initialDraft?.tone ?? "formal");
  const [draft, setDraft] = useState(initialDraft?.ai_draft ?? "");
  const [responseId, setResponseId] = useState<number | null>(initialDraft?.id ?? null);
  const [aiGenerated, setAiGenerated] = useState(initialDraft?.ai_generated ?? true);
  // The text from before the last new draft, so the agent can undo it.
  const [previousDraft, setPreviousDraft] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<SentReply | null>(sentReply);
  const [isSending, startSending] = useTransition();

  const [moveTo, setMoveTo] = useState("");
  const [moveError, setMoveError] = useState<string | null>(null);
  const [isMoving, startMoving] = useTransition();

  // Ask the server for a new draft in the chosen tone (S1-08, S1-13, S1-14).
  async function generateDraft(selectedTone: Tone) {
    setIsGenerating(true);
    setError(null);
    if (draft.trim()) setPreviousDraft(draft);
    try {
      const res = await fetch("/api/generate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: ticket.id,
          templateText: templates[TEMPLATE_FOR_TONE[selectedTone]] ?? templates[0],
          tone: selectedTone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Draft failed");
      setDraft(data.draft);
      setResponseId(data.responseId ?? null);
      setAiGenerated(data.aiGenerated ?? true);
    } catch {
      // If the AI route fails completely, start from the template so the agent can still reply.
      setDraft(templates[TEMPLATE_FOR_TONE[selectedTone]] ?? "");
      setResponseId(null);
      setAiGenerated(false);
      setError("The AI draft didn't load, so the template is shown instead.");
    } finally {
      setIsGenerating(false);
    }
  }

  // Draft automatically the first time an agent opens the ticket (S1-13).
  // If a draft was already saved, it's shown straight away instead of waiting for a new one.
  useEffect(() => {
    if (!sent && !initialDraft) generateDraft("formal");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeTone(newTone: Tone) {
    if (newTone === tone) return;
    setTone(newTone);
    generateDraft(newTone);
  }

  function undoNewDraft() {
    if (previousDraft === null) return;
    setDraft(previousDraft);
    setPreviousDraft(null);
  }

  // Send the edited reply (S1-23).
  function handleSend() {
    setError(null);
    const text = draft.trim();
    startSending(async () => {
      const result = await sendReply({ ticketId: ticket.id, responseId, finalText: text, tone });
      if ("error" in result) setError(result.error);
      else setSent({ final_text: text, sent_at: new Date().toISOString(), ai_generated: aiGenerated });
    });
  }

  // Move the ticket to another department (S1-25).
  function handleMove() {
    if (!moveTo) {
      setMoveError("Choose the department it should go to.");
      return;
    }
    setMoveError(null);
    startMoving(async () => {
      // On success the server goes straight back to the inbox; we only get here on an error.
      const result = await rerouteTicket({ ticketId: ticket.id, reference: ticket.reference, department: moveTo });
      if (result?.error) setMoveError(result.error);
    });
  }

  const status: TicketStatus = sent ? "answered" : ticket.status;
  const secondaryBtn =
    "inline-flex h-[42px] items-center gap-1.5 rounded-md border border-field bg-white px-3.5 text-sm font-medium text-ink hover:bg-page disabled:opacity-60";
  const busy = isGenerating || isSending || isMoving;

  return (
    <main className="mx-auto max-w-[1360px] space-y-4 px-4 pb-12 pt-5 sm:px-6">
      <Link href="/agent" className="inline-flex items-center gap-1 py-1 text-sm font-medium text-brand hover:text-brand-dark">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        Back to inbox
      </Link>

      <div className="flex flex-wrap items-start gap-4">
        {/* Left: who sent it, the ticket, and how it was routed */}
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-4">
          <section className="space-y-3.5 rounded-[10px] border border-line bg-white p-5">
            <div className="space-y-2">
              <p className="text-[13px] tabular-nums text-muted">{ticket.reference}</p>
              <h1 className="text-xl font-semibold leading-[27px] text-ink">{ticket.subject}</h1>
              <div className="flex flex-wrap gap-2">
                <StatusPill status={status} size="sm" />
                <PriorityTag priority={ticket.priority} />
                {ticket.needs_review && <NeedsReviewTag />}
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-3 border-t border-line-soft pt-3.5 sm:grid-cols-2">
              <div className="space-y-0.5">
                <dt className="text-[13px] text-muted">From</dt>
                <dd className="text-sm font-medium text-ink">{submitter?.full_name ?? "Unknown"}</dd>
                {submitter?.email && (
                  <dd className="break-all text-[13px]">
                    <a href={`mailto:${submitter.email}`} className="text-brand hover:text-brand-dark">
                      {submitter.email}
                    </a>
                  </dd>
                )}
              </div>
              <div className="space-y-0.5">
                <dt className="text-[13px] text-muted">Depot</dt>
                <dd className="text-sm font-medium text-ink">{ticket.depot ?? submitter?.depot ?? "Not given"}</dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-[13px] text-muted">Received</dt>
                <dd className="text-sm font-medium text-ink">{formatWhen(ticket.created_at)}</dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-[13px] text-muted">Department</dt>
                <dd className="text-sm font-medium text-ink">{ticket.department ?? "Not routed"}</dd>
              </div>
            </dl>

            <div className="space-y-1 border-t border-line-soft pt-3.5">
              <p className="text-[13px] text-muted">Request</p>
              <p className="whitespace-pre-line text-[15px] leading-[22px] text-ink">{ticket.description}</p>
            </div>
          </section>

          <section aria-labelledby="routing-heading" className="space-y-3.5 rounded-[10px] border border-line bg-white p-5">
            <h2 id="routing-heading" className="text-[15px] font-semibold text-ink">
              Routing
            </h2>
            {classification ? (
              <dl className="grid grid-cols-3 gap-3">
                <div className="space-y-0.5">
                  <dt className="text-[13px] text-muted">AI chose</dt>
                  <dd className="text-sm font-medium text-ink">{classification.predicted_department}</dd>
                </div>
                <div className="space-y-0.5">
                  <dt className="text-[13px] text-muted">Confidence</dt>
                  <dd className="text-sm font-medium tabular-nums text-ink">{Math.round(classification.confidence * 100)}%</dd>
                </div>
                <div className="space-y-0.5">
                  <dt className="text-[13px] text-muted">Model</dt>
                  <dd className="break-all text-sm font-medium text-ink">{classification.model_version}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-muted">No classification recorded for this ticket.</p>
            )}
            {classification?.overridden_department && (
              <p className="text-[13px] text-ink-2">Moved by an agent to {classification.overridden_department}.</p>
            )}
            {ticket.needs_review && (
              <p className="rounded-md bg-[#fff4e0] px-3 py-2.5 text-[13px] leading-[19px] text-[#7a4a00]">
                The AI wasn&apos;t sure about this one. Check it belongs to {ticket.department}, or move it below.
              </p>
            )}

            {/* Reroute (S1-25) */}
            <div className="space-y-1.5 border-t border-line-soft pt-3.5">
              <label htmlFor="move-to" className="block text-[13px] font-medium text-ink-2">
                Wrong department? Move it to
              </label>
              <div className="flex flex-wrap gap-2">
                <select
                  id="move-to"
                  value={moveTo}
                  onChange={(e) => setMoveTo(e.target.value)}
                  disabled={busy}
                  aria-invalid={moveError ? true : undefined}
                  aria-describedby={moveError ? "move-error" : "move-hint"}
                  className="h-[42px] min-w-[160px] flex-1 rounded-md border border-field bg-white px-3 text-sm text-ink"
                >
                  <option value="">Choose a department</option>
                  {DEPARTMENTS.filter((d) => d !== ticket.department).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={handleMove} disabled={busy} className={secondaryBtn}>
                  {isMoving ? "Moving…" : "Move ticket"}
                </button>
              </div>
              {moveError ? (
                <p id="move-error" role="alert" className="text-[13px] text-[#a4231a]">
                  {moveError}
                </p>
              ) : (
                <p id="move-hint" className="text-[13px] text-muted">
                  It leaves your inbox. Your name and the time are saved.
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Right: the reply (S1-13, S1-14, S1-23) */}
        <section aria-labelledby="reply-heading" className="flex min-w-0 flex-[999_1_560px] flex-col gap-4 rounded-[10px] border border-line bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 id="reply-heading" className="text-[17px] font-semibold text-ink">
                Reply
              </h2>
              {aiGenerated && !sent && (
                <span className="inline-flex h-6 items-center gap-1.5 rounded bg-brand-soft px-2 text-xs font-semibold text-brand-dark">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 20h4L19 9l-4-4L4 16z" />
                    <path d="M13.5 6.5l4 4" />
                  </svg>
                  AI-drafted · check before sending
                </span>
              )}
            </div>
            {!sent && (
              <div role="group" aria-label="Tone (writes a new draft)" className="flex gap-0.5 rounded-lg border border-line bg-page p-[3px]">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    aria-pressed={tone === t.value}
                    disabled={busy}
                    onClick={() => changeTone(t.value)}
                    className={`rounded-md px-3 py-1.5 text-[13px] ${
                      tone === t.value ? "bg-white font-semibold text-ink shadow-sm" : "font-medium text-ink-2"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-[#fdecea] px-3 py-2.5 text-sm text-[#a4231a]">
              {error}
            </p>
          )}

          {sent ? (
            <div className="space-y-3">
              <p role="status" className="flex items-center gap-2 rounded-md bg-[#e5f3ea] px-3 py-2.5 text-sm font-medium text-[#1b6b36]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                Reply sent {formatWhen(sent.sent_at)}. The ticket is Answered.
              </p>
              <div className="space-y-1">
                <p className="text-[13px] text-muted">What the staff member received</p>
                <p className="whitespace-pre-line rounded-md border border-line-soft bg-page px-3.5 py-3 text-[15px] leading-[23px] text-ink">
                  {sent.final_text}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="draft" className="text-[13px] font-medium text-ink-2">
                  Message to {submitter?.full_name ?? "the staff member"} (you can edit it)
                </label>
                <textarea
                  id="draft"
                  rows={12}
                  value={isGenerating ? "Writing a draft…" : draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setPreviousDraft(null);
                  }}
                  disabled={isGenerating}
                  className="w-full resize-y rounded-md border border-field bg-white px-3.5 py-3 text-[15px] leading-[23px] text-ink disabled:text-muted"
                />
              </div>

              {previousDraft !== null && !isGenerating && (
                <p role="status" className="flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
                  New draft written; your previous text was replaced.
                  <button type="button" onClick={undoNewDraft} className="font-semibold text-brand underline-offset-2 hover:underline">
                    Undo
                  </button>
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="space-y-1">
                  <button type="button" onClick={() => generateDraft(tone)} disabled={busy} className={secondaryBtn}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
                      <path d="M20 5v6h-6" />
                    </svg>
                    Write a new AI draft
                  </button>
                  <p className="text-xs text-muted">Replaces the text above with a fresh draft in the {tone} tone.</p>
                </div>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={busy || !draft.trim()}
                  className="h-[42px] rounded-md bg-brand px-5 text-[15px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                >
                  {isSending ? "Sending…" : "Send reply"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
