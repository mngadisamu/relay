import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusPill } from "@/components/StatusPill";
import { StaffNav } from "../../StaffNav";
import { formatWhen, type TicketStatus } from "../../status";

type Ticket = {
  id: number;
  reference: string;
  subject: string;
  description: string;
  depot: string | null;
  department: string | null;
  status: TicketStatus;
  created_at: string;
  assigned_at: string | null;
  answered_at: string | null;
  closed_at: string | null;
};

// Request detail (S1-26, mockup screen 5) with the agent's reply once sent (S1-28).
export default async function RequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole(["staff"]);

  const supabase = await createClient();
  // RLS only returns the ticket if this user submitted it.
  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, reference, subject, description, depot, department, status, created_at, assigned_at, answered_at, closed_at")
    .eq("id", id)
    .maybeSingle<Ticket>();
  if (!ticket) notFound();

  // RLS only lets staff see replies that have been sent, never unsent AI drafts.
  const { data: reply } = await supabase
    .from("responses")
    .select("final_text, sent_at, ai_generated")
    .eq("ticket_id", ticket.id)
    .not("sent_at", "is", null)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ final_text: string; sent_at: string; ai_generated: boolean }>();

  // Status history from the ticket's timestamps.
  const history = [
    { label: "Received", at: ticket.created_at, dot: "bg-[#3d4651]" },
    { label: "Assigned", at: ticket.assigned_at, dot: "bg-[#0b4c94]" },
    { label: "Answered", at: ticket.answered_at, dot: "bg-[#1b6b36]" },
    { label: "Closed", at: ticket.closed_at, dot: "bg-[#4a4f57]" },
  ].filter((step): step is { label: string; at: string; dot: string } => Boolean(step.at));

  const team = ticket.department ?? "the support team";

  return (
    <div className="min-h-screen bg-page">
      <StaffNav current="requests" />
      <main className="mx-auto max-w-3xl space-y-3.5 px-4 pb-8 pt-4">
        <Link href="/staff/requests" className="inline-flex items-center gap-1 py-1.5 text-sm font-medium text-brand hover:text-brand-dark">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          All requests
        </Link>

        <section className="space-y-3.5 rounded-[10px] border border-line bg-white px-4 py-[18px]">
          <div className="space-y-2">
            <p className="text-[13px] tabular-nums text-muted">{ticket.reference}</p>
            <h1 className="text-[19px] font-semibold leading-[25px] text-ink">{ticket.subject}</h1>
            <StatusPill status={ticket.status} />
          </div>
          <dl className="grid grid-cols-2 gap-3 border-t border-line-soft pt-3.5">
            <div className="space-y-0.5">
              <dt className="text-[13px] text-muted">Department</dt>
              <dd className="text-[15px] font-medium text-ink">{ticket.department ?? "Not routed yet"}</dd>
            </div>
            <div className="space-y-0.5">
              <dt className="text-[13px] text-muted">Depot</dt>
              <dd className="text-[15px] font-medium text-ink">{ticket.depot ?? "Not given"}</dd>
            </div>
          </dl>
          <div className="space-y-1">
            <p className="text-[13px] text-muted">Your request</p>
            <p className="text-[15px] leading-[22px] text-ink">{ticket.description}</p>
          </div>
        </section>

        <section aria-labelledby="reply-heading" className="space-y-3 rounded-[10px] border border-line bg-white px-4 py-[18px]">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="reply-heading" className="text-base font-semibold text-ink">
              Reply from {ticket.department ?? "the team"}
            </h2>
            {reply && <span className="text-[13px] text-muted">{formatWhen(reply.sent_at)}</span>}
          </div>
          {reply ? (
            <>
              <p className="whitespace-pre-line text-[15px] leading-[22px] text-ink">{reply.final_text}</p>
              {reply.ai_generated && (
                <p className="flex items-start gap-1.5 border-t border-line-soft pt-3 text-[13px] leading-[18px] text-muted">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 11v5" />
                    <path d="M12 7.5v.5" />
                  </svg>
                  <span>Drafted with AI, then checked and sent by the {team} team.</span>
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-ink-2">No reply yet. The {team} team will reply here.</p>
          )}
        </section>

        <section aria-labelledby="history-heading" className="space-y-3 rounded-[10px] border border-line bg-white px-4 py-[18px]">
          <h2 id="history-heading" className="text-base font-semibold text-ink">
            Status history
          </h2>
          <ol>
            {history.map((step, i) => (
              <li key={step.label} className="flex gap-3">
                <div className="flex w-3 flex-col items-center">
                  <span aria-hidden="true" className={`mt-[5px] h-2.5 w-2.5 rounded-full ${step.dot}`} />
                  {i < history.length - 1 && <span aria-hidden="true" className="my-1 w-0.5 flex-1 bg-line" />}
                </div>
                <div className={`flex flex-col gap-0.5 ${i < history.length - 1 ? "pb-3.5" : ""}`}>
                  <span className="text-[15px] font-medium text-ink">{step.label}</span>
                  <span className="text-[13px] text-muted">{formatWhen(step.at)}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
