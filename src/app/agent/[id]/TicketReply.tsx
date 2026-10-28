"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { sendReply } from "./actions";

type Tone = "formal" | "friendly" | "urgent";

export type TicketForReply = {
  id: number;
  reference: string;
  subject: string;
  description: string;
  depot: string | null;
  department: string | null;
  priority: string;
  status: string;
  needs_review: boolean;
  created_at: string;
};

// Which template goes with each tone (index in src/lib/templates.ts).
const TEMPLATE_FOR_TONE: Record<Tone, number> = { formal: 0, friendly: 1, urgent: 2 };

export default function TicketReply({
  ticket,
  templates,
}: {
  ticket: TicketForReply;
  templates: string[];
}) {
  const [tone, setTone] = useState<Tone>("formal");
  const [draft, setDraft] = useState("");
  const [responseId, setResponseId] = useState<number | null>(null);
  const [aiGenerated, setAiGenerated] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(ticket.status === "answered");
  const [isSending, startSending] = useTransition();

  // Ask the server for a draft in the chosen tone (S1-08, S1-13, S1-14).
  async function generateDraft(selectedTone: Tone) {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: ticket.id,
          ticketContent: `${ticket.subject}: ${ticket.description}`,
          department: ticket.department ?? "IT",
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

  // Draft automatically when the agent opens the ticket (S1-13).
  useEffect(() => {
    if (!sent) generateDraft("formal");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeTone(newTone: Tone) {
    setTone(newTone);
    generateDraft(newTone);
  }

  // Send the edited reply (S1-23).
  function handleSend() {
    setError(null);
    startSending(async () => {
      const result = await sendReply({ ticketId: ticket.id, responseId, finalText: draft, tone });
      if ("error" in result) setError(result.error);
      else setSent(true);
    });
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <Link href="/agent" className="text-sm font-medium text-blue-700 hover:underline">
        ← Back to inbox
      </Link>

      <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-5">
        <p className="text-sm text-gray-600">{ticket.reference}</p>
        <h1 className="text-xl font-semibold text-gray-900">{ticket.subject}</h1>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-gray-100 px-2.5 py-1 capitalize text-gray-700">
            Status: {sent ? "answered" : ticket.status}
          </span>
          <span className="rounded bg-gray-100 px-2.5 py-1 capitalize text-gray-700">
            Priority: {ticket.priority}
          </span>
          {ticket.needs_review && (
            <span className="rounded bg-amber-100 px-2.5 py-1 text-amber-900">Needs review</span>
          )}
        </div>
        <p className="text-sm text-gray-600">
          Depot: {ticket.depot ?? "Not given"} · Received{" "}
          {new Date(ticket.created_at).toLocaleString("en-ZA")}
        </p>
        <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-900">{ticket.description}</p>
      </section>

      <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Reply</h2>
            {aiGenerated && !sent && (
              <span className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800">
                AI-drafted · check before sending
              </span>
            )}
          </div>
          {!sent && (
            <div role="group" aria-label="Tone" className="flex gap-1 rounded-lg bg-gray-100 p-1">
              {(["formal", "friendly", "urgent"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={tone === t}
                  disabled={isGenerating || isSending}
                  onClick={() => changeTone(t)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
                    tone === t ? "bg-white text-gray-900 shadow" : "text-gray-700"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}

        {sent ? (
          <p role="status" className="rounded-md bg-green-50 p-3 text-sm font-medium text-green-800">
            Reply sent. The ticket is now Answered.
          </p>
        ) : (
          <>
            <label htmlFor="draft" className="block text-sm font-medium text-gray-700">
              Message to the staff member (you can edit it)
            </label>
            <textarea
              id="draft"
              rows={10}
              value={isGenerating ? "Writing a draft…" : draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={isGenerating}
              className="w-full rounded-md border border-gray-400 p-3 text-base"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSend}
                disabled={isGenerating || isSending || !draft.trim()}
                className="rounded-md bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {isSending ? "Sending…" : "Send reply"}
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}