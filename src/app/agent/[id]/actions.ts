"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { autoFlagReply, type Flag } from "@/lib/flags";

type Tone = "formal" | "friendly" | "urgent";
const DEPARTMENTS = ["HR", "IT", "Finance", "Operations"] as const;
type Department = (typeof DEPARTMENTS)[number];

// Sends the agent's reply (S1-23).
// Saves what the agent actually sent, then marks the ticket Answered.
// Runs as the signed-in agent, so the database rules in migration 0004 apply.
export async function sendReply(input: {
  ticketId: number;
  responseId: number | null;
  finalText: string;
  tone: Tone;
}): Promise<{ ok: true; responseId: number; flags: Flag[] } | { error: string }> {
  const profile = await getCurrentProfile();
  if (!profile || !["agent", "manager"].includes(profile.role)) {
    return { error: "Only agents can send replies." };
  }

  const text = input.finalText.trim();
  if (!text) return { error: "The reply is empty. Write a message before sending." };

  const supabase = await createClient();
  const now = new Date().toISOString();

  // 0. Only the person working on the ticket replies: an agent needs it assigned
  //    to them, a manager needs it assigned to someone. The button is greyed out
  //    in the same cases; this check makes sure it can't be skipped.
  const { data: current } = await supabase
    .from("tickets")
    .select("assigned_to, is_sensitive, answered_at")
    .eq("id", input.ticketId)
    // Past (seeded) tickets can't be replied to.
    .eq("is_historical", false)
    .maybeSingle<{ assigned_to: string | null; is_sensitive: boolean; answered_at: string | null }>();
  if (!current) return { error: "Ticket not found." };
  if (profile.role === "agent" && current.assigned_to !== profile.id) {
    return { error: current.assigned_to ? "This ticket is assigned to someone else." : "Take this ticket before you reply." };
  }
  if (profile.role === "manager" && !current.assigned_to) {
    return { error: "Assign this ticket to an agent before replying." };
  }

  // 0b. A sensitive request (migration 0009) needs a personal reply, so the
  //     starting text can't be sent exactly as it was given.
  if (current.is_sensitive && input.responseId) {
    const { data: start } = await supabase
      .from("responses")
      .select("ai_draft")
      .eq("id", input.responseId)
      .maybeSingle<{ ai_draft: string | null }>();
    if (start?.ai_draft && start.ai_draft.trim() === text) {
      return { error: "This is a sensitive request: change the starting text into a personal reply before sending." };
    }
  }

  // 1. Save the reply. If there's an AI draft, update it so the draft and the
  //    final text sit side by side (needed for the Sprint 3 audit).
  let responseId = input.responseId;
  if (input.responseId) {
    const { error } = await supabase
      .from("responses")
      .update({ final_text: text, tone: input.tone, sent_by: profile.id, sent_at: now })
      .eq("id", input.responseId);
    if (error) return { error: "Could not save the reply: " + error.message };
  } else {
    // No AI draft was saved (for example, Gemini was down), so store the reply on its own.
    const { data: saved, error } = await supabase
      .from("responses")
      .insert({
        ticket_id: input.ticketId,
        tone: input.tone,
        final_text: text,
        ai_generated: false,
        sent_by: profile.id,
        sent_at: now,
      })
      .select("id")
      .single<{ id: number }>();
    if (error) return { error: "Could not save the reply: " + error.message };
    responseId = saved.id;
  }

  // 1b. The automatic flags for compliance (S2-26, src/lib/flags.ts): an AI draft
  //     sent without edits, or an amount or date nobody gave the AI. It never
  //     stops the send.
  const flags = input.responseId ? await autoFlagReply(supabase, input.responseId) : [];

  // 2. Mark the ticket Answered, with the time (the dashboard uses it in Sprint 2),
  //    and record who sent it in the audit log (Sprint 3 compliance).
  const [{ error: ticketError }] = await Promise.all([
    // answered_at keeps the FIRST reply's time, so a second reply after "I still need
    // help" (S2-20) doesn't change the dashboard's time to first reply.
    supabase
      .from("tickets")
      .update({ status: "answered", ...(current.answered_at ? {} : { answered_at: now }) })
      .eq("id", input.ticketId),
    supabase.from("audit_log").insert({
      actor: profile.id,
      action: "send",
      ticket_id: input.ticketId,
      details: { tone: input.tone, response_id: input.responseId, edited_ai_draft: Boolean(input.responseId) },
    }),
  ]);
  if (ticketError) return { error: "Reply saved, but the status didn't update: " + ticketError.message };

  // Refresh the inbox and this ticket so they show the new status.
  revalidatePath("/agent");
  revalidatePath(`/agent/${input.ticketId}`);
  revalidatePath("/compliance/flags");
  return { ok: true, responseId: responseId!, flags };
}

// Moves a wrongly routed ticket to another department (S1-25).
// reroute_ticket() (migration 0004) does it in one safe step: moves the ticket,
// clears "Needs review", records who overrode the AI on the classification,
// and writes an audit entry with the time.
export async function rerouteTicket(input: {
  ticketId: number;
  reference: string;
  department: string;
}): Promise<{ error: string }> {
  const profile = await getCurrentProfile();
  if (!profile || !["agent", "manager"].includes(profile.role)) {
    return { error: "Only agents and managers can move tickets." };
  }
  if (!DEPARTMENTS.includes(input.department as Department)) {
    return { error: "Choose a department." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("reroute_ticket", {
    p_ticket_id: input.ticketId,
    p_department: input.department,
  });
  if (error) return { error: "Couldn't move the ticket: " + error.message };

  // The agent can't see the ticket any more, so go straight back to the inbox
  // and say where it went.
  revalidatePath("/agent");
  redirect(`/agent?moved=${encodeURIComponent(input.reference)}&to=${encodeURIComponent(input.department)}`);
}

// "Department is correct" on a Needs review ticket (S2-11).
// confirm_department() (migration 0006) clears "Needs review", records who
// confirmed it on the classification, and writes an audit entry.
export async function confirmDepartment(ticketId: number): Promise<{ error: string } | { ok: true }> {
  const profile = await getCurrentProfile();
  if (!profile || !["agent", "manager"].includes(profile.role)) {
    return { error: "Only agents and managers can confirm a department." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_department", { p_ticket_id: ticketId });
  if (error) return { error: "Couldn't confirm the department: " + error.message };

  // Reload this ticket (tag gone, "Confirmed by" shown) and the inbox.
  revalidatePath("/agent");
  revalidatePath(`/agent/${ticketId}`);
  return { ok: true };
}

// Take ticket (agent) or Assign (manager) (S2-16).
// assign_ticket() (migration 0006) checks who may do it, sets assigned_to,
// moves Received to Assigned with the time, and writes an audit entry.
// agentId is left out when an agent takes a ticket for themselves.
export async function assignTicket(ticketId: number, agentId?: string): Promise<{ error: string } | { ok: true }> {
  const profile = await getCurrentProfile();
  if (!profile || !["agent", "manager"].includes(profile.role)) {
    return { error: "Only agents and managers can assign tickets." };
  }
  if (profile.role === "manager" && !agentId) return { error: "Choose an agent to assign it to." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_ticket", {
    p_ticket_id: ticketId,
    ...(agentId ? { p_agent: agentId } : {}),
  });
  if (error) return { error: "Couldn't assign the ticket: " + error.message };

  // The ticket, the inboxes and the staff member's status history all change.
  revalidatePath("/agent");
  revalidatePath(`/agent/${ticketId}`);
  revalidatePath(`/staff/requests/${ticketId}`);
  revalidatePath("/staff/requests");
  return { ok: true };
}

// "Close ticket" on an Answered ticket (S2-20), when the staff member hasn't
// confirmed it themselves. close_ticket() (migration 0006) checks the agent is
// in the ticket's department (or a manager) and writes the audit entry.
export async function closeTicket(ticketId: number): Promise<{ error: string } | { ok: true }> {
  const profile = await getCurrentProfile();
  if (!profile || !["agent", "manager"].includes(profile.role)) {
    return { error: "Only agents and managers can close tickets." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("close_ticket", { p_ticket_id: ticketId });
  if (error) return { error: "Couldn't close the ticket: " + error.message };

  revalidatePath("/agent");
  revalidatePath(`/agent/${ticketId}`);
  revalidatePath(`/staff/requests/${ticketId}`);
  revalidatePath("/staff/requests");
  return { ok: true };
}
