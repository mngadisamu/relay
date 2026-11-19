"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { classify } from "@/lib/classifier";
import { getCurrentProfile } from "@/lib/auth";
import { checkSensitive, departmentFor, priorityFor } from "@/lib/sensitive";
import { notifyTicketEvent } from "@/lib/notify";

export type Field = "subject" | "description" | "depot" | "priority";

// What the person typed, sent back on an error so the form doesn't empty itself.
export type SubmitValues = Record<Field, string>;

export type SubmitState =
  | { status: "idle" }
  // fieldErrors: one message per empty field, shown under that field with a red border.
  // message: a problem that isn't about one field (e.g. the save failed).
  | { status: "error"; fieldErrors: Partial<Record<Field, string>>; message?: string; values: SubmitValues }
  // confidence and routedByRule say how the department was chosen, for the AI note on the confirmation.
  | { status: "sent"; reference: string; department: string; subject: string; sentAt: string; confidence: number; routedByRule: boolean; needsApproval: boolean };

const DEPOTS = ["Head Office", "City Deep depot", "Pomona depot"];
// How urgent the person says it is (S2-11). The inbox puts urgent first (S1-19).
const PRIORITIES = ["low", "medium", "high", "urgent"];

// Submits a staff request (S1-22) and saves how it was classified (S1-21, S1-25).
// Runs as the signed-in staff member, so row-level security applies (migration 0003).
// Request types from migration 0020 (S4-01). The form may not send one yet.
const REQUEST_TYPES = ["purchase", "leave", "system_access", "other"];

export async function submitRequest(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const subject = String(formData.get("subject") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const depot = String(formData.get("depot") ?? "");
  const priority = String(formData.get("priority") ?? "medium");

  const values: SubmitValues = { subject, description, depot, priority };

  // Check every field at once, so the person sees all problems together.
  const fieldErrors: Partial<Record<Field, string>> = {};
  if (!subject) fieldErrors.subject = "Please add a subject";
  // Wording of this message is fixed by the S1-22 acceptance criteria.
  if (!description) fieldErrors.description = "Please describe your request";
  if (!DEPOTS.includes(depot)) fieldErrors.depot = "Please choose your depot";
  if (!PRIORITIES.includes(priority)) fieldErrors.priority = "Please choose how urgent it is";
  if (Object.keys(fieldErrors).length > 0) return { status: "error", fieldErrors, values };

  const profile = await getCurrentProfile();
  if (!profile) return { status: "error", fieldErrors: {}, message: "Please sign in again.", values };
  const supabase = await createClient();

  // 1. Work out the department with the trained model (S1-21). It runs right here
  //    on the server in a few milliseconds; calling our own /api/classify over the
  //    network used to add a second or more to every submit.
  const { department: modelDepartment, confidence, modelVersion, needsReview: modelNeedsReview } = classify(subject, description);

  // 1b. Sensitive requests (harassment, someone at risk, injuries and crime, security,
  //     health) follow fixed rules instead (src/lib/sensitive.ts): each kind decides
  //     its department and lowest priority, e.g. harassment always goes to HR.
  const check = checkSensitive(subject, description);
  const department = check.sensitive ? departmentFor(check.kind, modelDepartment) : modelDepartment;
  const routedByRule = department !== modelDepartment;
  // The rule decided, so there's nothing for an agent to double-check about the department.
  const needsReview = routedByRule ? false : modelNeedsReview;
  const finalPriority = check.sensitive ? priorityFor(check.kind, priority) : priority;

  // Request type and amount (S4-01). Optional: a form without them still works.
  const requestType = String(formData.get("request_type") ?? "");
  const amountText = String(formData.get("amount") ?? "").trim();
  if (requestType && !REQUEST_TYPES.includes(requestType)) {
    return { status: "error", fieldErrors: {}, message: "Choose what kind of request this is.", values };
  }
  const amount = requestType === "purchase" ? Number(amountText) : null;
  if (requestType === "purchase" && (!amountText || !Number.isFinite(amount) || (amount ?? 0) <= 0)) {
    return { status: "error", fieldErrors: {}, message: "Enter the amount of the purchase in rand.", values };
  }

  // 2. Save the ticket. submitted_by must be the signed-in user (RLS requires it).
  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      submitted_by: profile.id,
      subject,
      description,
      depot,
      priority: finalPriority,
      department,
      needs_review: needsReview,
      is_sensitive: check.sensitive,
      sensitive_kind: check.sensitive ? check.kind : null,
      request_type: requestType || null,
      amount,
    })
    .select("id, reference, created_at")
    .single();
  if (error || !ticket) {
    console.error("Could not save the ticket:", error);
    return { status: "error", fieldErrors: {}, message: "Your request couldn't be sent. Please try again.", values };
  }

  
  // 2b. Give it to the least-busy active agent in its department (S4-05). Sensitive
  //     tickets stay unassigned for a manager. If this fails, the ticket is still saved.
  const { error: assignError } = await supabase.rpc("auto_assign_ticket", {
    p_ticket_id: ticket.id,
    p_actor: profile.id,
  });
  if (assignError) console.error("Could not auto-assign the ticket:", assignError);
  

  // 3. Keep the classifier's decision (S1-21) and an audit entry (Sprint 3 compliance),
  //    both saved at the same time. Neither stops the request if it fails.
  const [{ error: classifyError }, { error: auditError }] = await Promise.all([
    supabase.from("classifications").insert({
      ticket_id: ticket.id,
      predicted_department: modelDepartment, // what the model chose, kept even when the rule moved it
      confidence,
      model_version: modelVersion,
    }),
    supabase.from("audit_log").insert({
      actor: profile.id,
      action: "classify",
      ticket_id: ticket.id,
      details: {
        department,
        confidence,
        model_version: modelVersion,
        needs_review: needsReview,
        sensitive: check.sensitive ? check.kind : null,
        routed_by_rule: routedByRule,
      },
    }),
  ]);
  if (classifyError) console.error("Could not save the classification:", classifyError);
  if (auditError) console.error("Could not write the audit entry:", auditError);

  // 4. S4-07: a Finance purchase over R5,000 or any leave request waits for a manager.
  //    request_approval() decides (migration 0020). The ticket is saved first, so an approval
  //    never exists without its ticket.
  const { data: approvalId, error: approvalError } = await supabase.rpc("request_approval", { p_ticket_id: ticket.id });
  if (approvalError) console.error("Could not ask for approval:", approvalError);
  const needsApproval = !approvalError && approvalId !== null;

  // S4-10: tell the person, and the managers who need to decide. Never stops the request.
  await notifyTicketEvent(supabase, ticket.id, "received");
  if (needsApproval) await notifyTicketEvent(supabase, ticket.id, "needs_approval");

  revalidatePath("/staff/requests");
  return { status: "sent", reference: ticket.reference, department, subject, sentAt: ticket.created_at, confidence, routedByRule, needsApproval };
}
