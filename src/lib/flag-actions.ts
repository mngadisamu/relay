"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

// Flag and Resolve (S2-26). Both go through the database functions in
// migration 0011, which check who is calling and write the audit entry.

export type FlagFormState = { error?: string; done?: boolean };

// "Flag" on a sent reply: an agent, manager or compliance officer writes why it
// needs a second look. Used on the agent's ticket view and on Flagged replies.
export async function flagReply(responseId: number, _prev: FlagFormState, formData: FormData): Promise<FlagFormState> {
  const profile = await getCurrentProfile();
  if (!profile || !["agent", "manager", "compliance"].includes(profile.role)) {
    return { error: "Only agents, managers and compliance can flag replies." };
  }
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "Write why this reply needs a second look." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("flag_reply", { p_response_id: responseId, p_kind: "person", p_note: reason });
  if (error) return { error: "Couldn't flag the reply: " + error.message };

  revalidatePath("/compliance/flags");
  revalidatePath("/agent/[id]", "page");
  return { done: true };
}

// "Resolve" on Flagged replies: compliance chooses an outcome and writes a note.
export async function resolveFlag(flagId: number, _prev: FlagFormState, formData: FormData): Promise<FlagFormState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "compliance") return { error: "Only compliance can resolve flags." };

  const outcome = String(formData.get("outcome") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (outcome !== "ok" && outcome !== "needs_change") return { error: "Choose what you found." };
  if (!note) return { error: "Write a note about what you found." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_flag", { p_flag_id: flagId, p_outcome: outcome, p_note: note });
  if (error) return { error: "Couldn't resolve the flag: " + error.message };

  revalidatePath("/compliance/flags");
  revalidatePath("/agent/[id]", "page");
  return { done: true };
}
