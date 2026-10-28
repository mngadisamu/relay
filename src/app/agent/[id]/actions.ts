"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

type Tone = "formal" | "friendly" | "urgent";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const now = new Date().toISOString();

  // 1. Save the reply. If there's an AI draft, update it so the draft and the
  //    final text sit side by side (needed for the Sprint 3 audit).
  if (input.responseId) {
    const { error } = await supabase
      .from("responses")
      .update({ final_text: text, tone: input.tone, sent_by: user.id, sent_at: now })
      .eq("id", input.responseId);
    if (error) return { error: "Could not save the reply: " + error.message };
  } else {
    // No AI draft was saved (for example, Gemini was down), so store the reply on its own.
    const { error } = await supabase.from("responses").insert({
      ticket_id: input.ticketId,
      tone: input.tone,
      final_text: text,
      ai_generated: false,
      sent_by: user.id,
      sent_at: now,
    });
    if (error) return { error: "Could not save the reply: " + error.message };
  }

  // 2. Mark the ticket Answered, with the time (the dashboard uses it in Sprint 2).
  const { error: ticketError } = await supabase
    .from("tickets")
    .update({ status: "answered", answered_at: now })
    .eq("id", input.ticketId);
  if (ticketError) return { error: "Reply saved, but the status didn't update: " + ticketError.message };

  // Refresh the inbox and this ticket so they show the new status.
  revalidatePath("/agent");
  revalidatePath(`/agent/${input.ticketId}`);
  return { ok: true };
}