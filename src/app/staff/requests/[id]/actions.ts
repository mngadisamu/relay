"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

// S2-20: the staff member answers the reply. Both steps go through the database
// functions from migration 0006, which check it's their own Answered request and
// write the audit entry (close, reopen).

export type ResolveState = { error?: string; messageError?: string; message?: string };

function refresh(ticketId: number) {
  revalidatePath(`/staff/requests/${ticketId}`);
  revalidatePath("/staff/requests");
  revalidatePath("/agent");
  revalidatePath(`/agent/${ticketId}`);
}

// "This solved it": the ticket is Closed, with the time.
export async function confirmSolved(ticketId: number): Promise<ResolveState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Please sign in again." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("close_ticket", { p_ticket_id: ticketId });
  if (error) return { error: "Couldn't close your request: " + error.message };

  refresh(ticketId);
  return {};
}

// "I still need help": saves what's still wrong (ticket_messages) and sends the
// ticket back to the team (Assigned, or Received if nobody had taken it).
export async function stillNeedHelp(ticketId: number, _prev: ResolveState, formData: FormData): Promise<ResolveState> {
  const message = String(formData.get("message") ?? "").trim();
  if (!message) return { messageError: "Please say what still isn't working", message };

  const profile = await getCurrentProfile();
  if (!profile) return { error: "Please sign in again.", message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("reopen_ticket", { p_ticket_id: ticketId, p_message: message });
  if (error) return { error: "Couldn't send your message: " + error.message, message };

  refresh(ticketId);
  return {};
}
