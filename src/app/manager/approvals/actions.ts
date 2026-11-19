"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { notifyTicketEvent } from "@/lib/notify";

export type DecideState = { error?: string; done?: string };

// Approve or decline (S4-09). decide_approval() (migration 0020) checks the caller is the
// department's manager (or a general manager), is not the person who asked, and needs a
// reason when declining. The screen checks the reason too, so the message is clear.
export async function decideApproval(_prev: DecideState, formData: FormData): Promise<DecideState> {
  await requireRole(["manager"]);

  const approvalId = Number(formData.get("approval_id"));
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!Number.isInteger(approvalId) || approvalId <= 0) return { error: "This request couldn't be found. Refresh the page." };
  if (decision !== "approved" && decision !== "rejected") return { error: "Choose Approve or Decline." };
  if (decision === "rejected" && !note) return { error: "Add a reason for declining, so the person knows why." };

  const supabase = await createClient();

  // The ticket this decision is about, for the notice to the person who sent it (S4-10).
  const { data: approval } = await supabase
    .from("approvals")
    .select("ticket_id")
    .eq("id", approvalId)
    .maybeSingle<{ ticket_id: number }>();

  const { error } = await supabase.rpc("decide_approval", {
    p_approval_id: approvalId,
    p_decision: decision,
    p_note: note || null,
  });
  if (error) return { error: error.message };

  if (approval) await notifyTicketEvent(supabase, approval.ticket_id, "decided");

  // The list isn't refreshed here, so the message stays on screen. The request leaves the list on the next visit.
  revalidatePath("/agent");
  return {
    done: decision === "approved"
      ? "Approved. The request goes back to the team."
      : "Declined. The person who sent it can see your reason.",
  };
}
