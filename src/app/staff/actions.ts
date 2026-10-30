"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { classify } from "@/lib/classifier";
import { getCurrentProfile } from "@/lib/auth";

export type Field = "subject" | "description" | "depot";

// What the person typed, sent back on an error so the form doesn't empty itself.
export type SubmitValues = Record<Field, string>;

export type SubmitState =
  | { status: "idle" }
  // fieldErrors: one message per empty field, shown under that field with a red border.
  // message: a problem that isn't about one field (e.g. the save failed).
  | { status: "error"; fieldErrors: Partial<Record<Field, string>>; message?: string; values: SubmitValues }
  | { status: "sent"; reference: string; department: string; subject: string; sentAt: string };

const DEPOTS = ["Head Office", "City Deep depot", "Pomona depot"];

// Submits a staff request (S1-22) and saves how it was classified (S1-21, S1-25).
// Runs as the signed-in staff member, so row-level security applies (migration 0003).
export async function submitRequest(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const subject = String(formData.get("subject") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const depot = String(formData.get("depot") ?? "");

  const values: SubmitValues = { subject, description, depot };

  // Check every field at once, so the person sees all problems together.
  const fieldErrors: Partial<Record<Field, string>> = {};
  if (!subject) fieldErrors.subject = "Please add a subject";
  // Wording of this message is fixed by the S1-22 acceptance criteria.
  if (!description) fieldErrors.description = "Please describe your request";
  if (!DEPOTS.includes(depot)) fieldErrors.depot = "Please choose your depot";
  if (Object.keys(fieldErrors).length > 0) return { status: "error", fieldErrors, values };

  const profile = await getCurrentProfile();
  if (!profile) return { status: "error", fieldErrors: {}, message: "Please sign in again.", values };
  const supabase = await createClient();

  // 1. Work out the department with the trained model (S1-21). It runs right here
  //    on the server in a few milliseconds; calling our own /api/classify over the
  //    network used to add a second or more to every submit.
  const { department, confidence, modelVersion, needsReview } = classify(subject, description);

  // 2. Save the ticket. submitted_by must be the signed-in user (RLS requires it).
  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({ submitted_by: profile.id, subject, description, depot, department, needs_review: needsReview })
    .select("id, reference, created_at")
    .single();
  if (error || !ticket) {
    console.error("Could not save the ticket:", error);
    return { status: "error", fieldErrors: {}, message: "Your request couldn't be sent. Please try again.", values };
  }

  // 3. Keep the classifier's decision (S1-21) and an audit entry (Sprint 3 compliance),
  //    both saved at the same time. Neither stops the request if it fails.
  const [{ error: classifyError }, { error: auditError }] = await Promise.all([
    supabase.from("classifications").insert({
      ticket_id: ticket.id,
      predicted_department: department,
      confidence,
      model_version: modelVersion,
    }),
    supabase.from("audit_log").insert({
      actor: profile.id,
      action: "classify",
      ticket_id: ticket.id,
      details: { department, confidence, model_version: modelVersion, needs_review: needsReview },
    }),
  ]);
  if (classifyError) console.error("Could not save the classification:", classifyError);
  if (auditError) console.error("Could not write the audit entry:", auditError);

  revalidatePath("/staff/requests");
  return { status: "sent", reference: ticket.reference, department, subject, sentAt: ticket.created_at };
}
