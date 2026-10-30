"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

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
}): Promise<{ ok: true } | { error: string }> {
  const profile = await getCurrentProfile();
  if (!profile || !["agent", "manager"].includes(profile.role)) {
    return { error: "Only agents can send replies." };
  }

  const text = input.finalText.trim();
  if (!text) return { error: "The reply is empty. Write a message before sending." };

  const supabase = await createClient();
  const now = new Date().toISOString();

  // 1. Save the reply. If there's an AI draft, update it so the draft and the
  //    final text sit side by side (needed for the Sprint 3 audit).
  if (input.responseId) {
    const { error } = await supabase
      .from("responses")
      .update({ final_text: text, tone: input.tone, sent_by: profile.id, sent_at: now })
      .eq("id", input.responseId);
    if (error) return { error: "Could not save the reply: " + error.message };
  } else {
    // No AI draft was saved (for example, Gemini was down), so store the reply on its own.
    const { error } = await supabase.from("responses").insert({
      ticket_id: input.ticketId,
      tone: input.tone,
      final_text: text,
      ai_generated: false,
      sent_by: profile.id,
      sent_at: now,
    });
    if (error) return { error: "Could not save the reply: " + error.message };
  }

  // 2. Mark the ticket Answered, with the time (the dashboard uses it in Sprint 2),
  //    and record who sent it in the audit log (Sprint 3 compliance).
  const [{ error: ticketError }] = await Promise.all([
    supabase.from("tickets").update({ status: "answered", answered_at: now }).eq("id", input.ticketId),
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
  return { ok: true };
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
