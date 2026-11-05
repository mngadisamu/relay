import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TONES, loadTemplates, templateForTone } from "@/lib/reply-templates";
import { AgentHeader } from "@/components/AgentHeader";
import { RoleHeader } from "@/components/RoleHeader";
import { MANAGER_MENU } from "@/lib/menus";
import TicketReply, { type Agent, type Classification, type Draft, type FollowUp, type SentReply, type Submitter, type TicketForReply } from "./TicketReply";

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
    .select("id, reference, subject, description, depot, department, priority, status, needs_review, is_sensitive, sensitive_kind, assigned_to, created_at")
    .eq("id", id)
    .maybeSingle<TicketForReply>();

  // Not found, or in another department: show the 404 page.
  if (!ticket) notFound();

  // Everything else about the ticket, fetched at the same time rather than one after another.
  const [{ data: classification }, { data: submitter }, { data: draft }, { data: sentReply }, { data: followUpRows }] = await Promise.all([
    // The latest routing decision, for the Routing panel.
    supabase
      .from("classifications")
      .select("predicted_department, confidence, model_version, overridden_department, confirmed_by, confirmed_at")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<Classification>(),
    // Who sent it (migration 0005: name, email and depot only).
    supabase.rpc("ticket_submitter", { p_ticket_id: ticket.id }).maybeSingle<Submitter>(),
    // The latest unsent draft, so opening the ticket again doesn't wait for a new AI draft.
    // Its template's department comes too, so a draft written before the ticket
    // was moved to another department can be left out below.
    supabase
      .from("responses")
      .select("id, ai_draft, tone, ai_generated, templates(department)")
      .eq("ticket_id", ticket.id)
      .is("sent_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<Draft & { templates: { department: string } | null }>(),
    // The reply that went out, if the ticket has been answered.
    supabase
      .from("responses")
      .select("final_text, sent_at, ai_generated")
      .eq("ticket_id", ticket.id)
      .not("sent_at", "is", null)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle<SentReply>(),
    // "I still need help" messages from the staff member (S2-20), oldest first.
    supabase.from("ticket_messages").select("body, created_at").eq("ticket_id", ticket.id).order("created_at", { ascending: true }),
  ]);

  // Who confirmed the department (S2-11). Agents can read the names of people in
  // their own department (migration 0006); a general manager's name isn't visible
  // to them, so the panel then just says "a manager".
  let confirmedByName: string | null = null;
  if (classification?.confirmed_by) {
    const { data: person } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", classification.confirmed_by)
      .maybeSingle<{ full_name: string }>();
    confirmedByName = person?.full_name ?? null;
  }

  // A draft from another department (the ticket was moved after it was written)
  // would greet the person on behalf of the wrong team, so start a fresh one instead.
  const currentDraft: Draft | null =
    draft && (!draft.templates || draft.templates.department === ticket.department)
      ? { id: draft.id, ai_draft: draft.ai_draft, tone: draft.tone, ai_generated: draft.ai_generated }
      : null;

  // Who it's assigned to (S2-16), and for managers the agents they can assign it to.
  // Agents can read their own department's names, managers everyone's (0006).
  let assigneeName: string | null = null;
  if (ticket.assigned_to) {
    const { data: person } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", ticket.assigned_to)
      .maybeSingle<{ full_name: string }>();
    assigneeName = person?.full_name ?? null;
  }
  let agents: Agent[] = [];
  if (profile.role === "manager" && ticket.department) {
    const { data: people } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "agent")
      .eq("department", ticket.department)
      .order("full_name");
    agents = (people ?? []) as Agent[];
  }

  // This department's templates from the database (S1-27), in tone order
  // (formal, friendly, urgent). The draft route reads them itself; the page only
  // needs them to show a template if the AI route can't be reached at all.
  const departmentTemplates = await loadTemplates(supabase, ticket.department ?? "IT");
  const templates = TONES.map((tone) => templateForTone(departmentTemplates, tone)?.body ?? "");

  return (
    <div className="min-h-screen bg-page">
      {profile.role === "manager" ? (
        <RoleHeader profile={profile} home="/manager" menu={MANAGER_MENU} current="/agent" />
      ) : (
        <AgentHeader profile={profile} current="inbox" />
      )}
      <TicketReply
        ticket={ticket}
        templates={templates}
        classification={classification ?? null}
        confirmedByName={confirmedByName}
        viewer={{ id: profile.id, role: profile.role }}
        assigneeName={assigneeName}
        agents={agents}
        submitter={submitter ?? null}
        initialDraft={currentDraft}
        // A reopened ticket (S2-20) needs a new reply, so the reply box opens again;
        // the earlier reply and the staff member's message are shown above it.
        sentReply={ticket.status === "answered" || ticket.status === "closed" ? (sentReply ?? null) : null}
        earlierReply={sentReply ?? null}
        followUps={(followUpRows ?? []) as FollowUp[]}
      />
    </div>
  );
}
