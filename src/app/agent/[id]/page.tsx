import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { departmentTemplates } from "@/lib/templates";
import { AgentHeader } from "@/components/AgentHeader";
import TicketReply, { type TicketForReply } from "./TicketReply";

type Classification = { predicted_department: string; confidence: number; model_version: string; created_at: string };

// Ticket view for agents (S1-13, S1-14, S1-23, mockup screen 7).
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

  // The latest routing decision, shown in the Routing panel.
  const { data: classification } = await supabase
    .from("classifications")
    .select("predicted_department, confidence, model_version, created_at")
    .eq("ticket_id", ticket.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Classification>();

  // Templates for this department (moving into the templates table is S1-04 / S1-27).
  const all = departmentTemplates as Record<string, string[]>;
  const templates = all[ticket.department ?? "IT"] ?? all.IT;

  return (
    <div className="min-h-screen bg-page">
      <AgentHeader profile={profile} current="inbox" />
      <TicketReply ticket={ticket} templates={templates} classification={classification ?? null} />
    </div>
  );
}
