import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { departmentTemplates } from "@/lib/templates";
import { AgentHeader } from "@/components/AgentHeader";
import TicketReply, { type Classification, type Draft, type SentReply, type Submitter, type TicketForReply } from "./TicketReply";

// Ticket view for agents (S1-13, S1-14, S1-23, S1-25, mockup screen 7).
// Loads the ticket on the server as the signed-in agent, so row-level security
// only returns it if it's in the agent's department (S1-15).
export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Staff are sent back to their own home; signed-out users go to /login.
  const profile = await requireRole(["agent", "manager"]);

  const supabase = await createClient();
  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, reference, subject, description, depot, department, priority, status, needs_review, created_at")
    .eq("id", id)
    .maybeSingle<TicketForReply>();

  // Not found, or in another department: show the 404 page.
  if (!ticket) notFound();

  // Everything else about the ticket, fetched at the same time rather than one after another.
  const [{ data: classification }, { data: submitter }, { data: draft }, { data: sentReply }] = await Promise.all([
    // The latest routing decision, for the Routing panel.
    supabase
      .from("classifications")
      .select("predicted_department, confidence, model_version, overridden_department")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<Classification>(),
    // Who sent it (migration 0005: name, email and depot only).
    supabase.rpc("ticket_submitter", { p_ticket_id: ticket.id }).maybeSingle<Submitter>(),
    // The latest unsent draft, so opening the ticket again doesn't wait for a new AI draft.
    supabase
      .from("responses")
      .select("id, ai_draft, tone, ai_generated")
      .eq("ticket_id", ticket.id)
      .is("sent_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<Draft>(),
    // The reply that went out, if the ticket has been answered.
    supabase
      .from("responses")
      .select("final_text, sent_at, ai_generated")
      .eq("ticket_id", ticket.id)
      .not("sent_at", "is", null)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle<SentReply>(),
  ]);

  // Templates for this department (moving into the templates table is S1-27).
  const all = departmentTemplates as Record<string, string[]>;
  const templates = all[ticket.department ?? "IT"] ?? all.IT;

  return (
    <div className="min-h-screen bg-page">
      <AgentHeader profile={profile} current="inbox" />
      <TicketReply
        ticket={ticket}
        templates={templates}
        classification={classification ?? null}
        submitter={submitter ?? null}
        initialDraft={draft ?? null}
        sentReply={sentReply ?? null}
      />
    </div>
  );
}
