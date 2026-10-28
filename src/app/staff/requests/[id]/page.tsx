import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StaffNav } from "../../StaffNav";
import { STATUS_LABEL, STATUS_STYLE, formatWhen, type TicketStatus } from "../../status";

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

// Request detail (S1-26) with the agent's reply once sent (S1-28).
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
    { label: "Received", at: ticket.created_at },
    { label: "Assigned", at: ticket.assigned_at },
    { label: "Answered", at: ticket.answered_at },
    { label: "Closed", at: ticket.closed_at },
  ].filter((step): step is { label: string; at: string } => Boolean(step.at));

  return (
    <div className="min-h-screen bg-gray-50">
      <StaffNav current="requests" />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <Link href="/staff/requests" className="text-sm font-medium text-blue-700 hover:underline">
          ← All requests
        </Link>

        <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm tabular-nums text-gray-600">{ticket.reference}</p>
          <h1 className="text-xl font-semibold text-gray-900">{ticket.subject}</h1>
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[ticket.status]}`}>
            {STATUS_LABEL[ticket.status]}
          </span>
          <dl className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 text-sm">
            <div>
              <dt className="text-gray-600">Department</dt>
              <dd className="font-medium text-gray-900">{ticket.department ?? "Not routed yet"}</dd>
            </div>
            <div>
              <dt className="text-gray-600">Depot</dt>
              <dd className="font-medium text-gray-900">{ticket.depot ?? "Not given"}</dd>
            </div>
          </dl>
          <div>
            <p className="text-sm text-gray-600">Your request</p>
            <p className="text-base text-gray-900">{ticket.description}</p>
          </div>
        </section>

        <section aria-labelledby="reply-heading" className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="reply-heading" className="text-base font-semibold text-gray-900">
              Reply from {ticket.department ?? "the team"}
            </h2>
            {reply && <span className="text-sm text-gray-600">{formatWhen(reply.sent_at)}</span>}
          </div>
          {reply ? (
            <>
              <p className="whitespace-pre-line text-base text-gray-900">{reply.final_text}</p>
              {reply.ai_generated && (
                <p className="border-t border-gray-100 pt-3 text-sm text-gray-600">
                  Drafted with AI, then checked and sent by the {ticket.department} team.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-700">No reply yet. The {ticket.department ?? "support"} team will reply here.</p>
          )}
        </section>

        <section aria-labelledby="history-heading" className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
          <h2 id="history-heading" className="text-base font-semibold text-gray-900">
            Status history
          </h2>
          <ol className="space-y-2">
            {history.map((step) => (
              <li key={step.label} className="flex justify-between gap-3 text-sm">
                <span className="font-medium text-gray-900">{step.label}</span>
                <span className="text-gray-600">{formatWhen(step.at)}</span>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
