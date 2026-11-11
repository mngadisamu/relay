import Link from "next/link";
import { AiNote } from "@/components/AiNote";
import { formatExact } from "../audit/audit";

// Parts of a flagged reply card on Flagged replies (S2-26).

export type TicketBits = { reference: string; subject: string; department: string | null };
export type ResponseBits = {
  id: number;
  ai_draft: string | null;
  final_text: string | null;
  sent_at: string;
  sent_by: string | null;
  tickets: TicketBits | null;
};

// "KF-261105-0042 · IT · VPN not connecting · History"
export function TicketLine({ ticket }: { ticket: TicketBits | null }) {
  if (!ticket) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <span className="font-semibold text-ink">{ticket.reference}</span>
      <span className="text-muted">·</span>
      <span className="text-ink-2">{ticket.department ?? "No department"}</span>
      <span className="text-muted">·</span>
      <span className="text-ink-2">{ticket.subject}</span>
      <Link href={`/compliance/audit?ref=${encodeURIComponent(ticket.reference)}`} className="font-medium text-brand hover:text-brand-dark">
        Ticket history
      </Link>
    </p>
  );
}

// The AI draft and what was sent, side by side (one box if they're the same).
export function ReplyCompare({ response, sentBy, highlight }: { response: ResponseBits; sentBy: string; highlight: string | null }) {
  const same = (response.ai_draft ?? "").trim() === (response.final_text ?? "").trim();
  const box = "whitespace-pre-line rounded-md border border-line-soft bg-page px-3.5 py-3 text-sm leading-[22px] text-ink sm:text-[15px] sm:leading-[23px]";
  return (
    <div className={`grid gap-3 ${same || !response.ai_draft ? "" : "md:grid-cols-2"}`}>
      {!same && response.ai_draft && (
        <div className="space-y-1.5">
          <AiNote kind="draft" />
          <p className={box}>{response.ai_draft}</p>
        </div>
      )}
      <div className="space-y-1.5">
        {same && response.ai_draft && <AiNote kind="draft" />}
        <p className="text-[13px] text-muted">
          {same ? "Sent exactly as the AI wrote it" : "What was sent"} · by {sentBy}, {formatExact(response.sent_at)}
        </p>
        <p className={box}>
          <Highlighted text={response.final_text ?? ""} details={highlight} />
        </p>
      </div>
    </div>
  );
}

// Marks the details the automatic check found, so the reviewer sees them at once.
function Highlighted({ text, details }: { text: string; details: string | null }) {
  const words = (details ?? "").split(", ").filter(Boolean);
  if (!words.length) return <>{text}</>;
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(${escaped.join("|")})`, "g"));
  return (
    <>
      {parts.map((part, i) =>
        words.includes(part) ? (
          <mark key={i} className="rounded bg-[#ffe7a3] px-0.5 text-ink">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}
