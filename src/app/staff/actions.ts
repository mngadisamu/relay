"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Field = "subject" | "description" | "depot";

// What the person typed, sent back on an error so the form doesn't empty itself.
export type SubmitValues = Record<Field, string>;

export type SubmitState =
  | { status: "idle" }
  // fieldErrors: one message per empty field, shown under that field with a red border.
  // message: a problem that isn't about one field (e.g. the save failed).
  | { status: "error"; fieldErrors: Partial<Record<Field, string>>; message?: string; values: SubmitValues }
  | { status: "sent"; reference: string; department: string };

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", fieldErrors: {}, message: "Please sign in again.", values };

  // 1. Ask the classify API which department this belongs to (stub now, Elzel's model later).
  const h = await headers();
  const host = h.get("host");
  const protocol = h.get("x-forwarded-proto") ?? "http";
  let department = "Operations";
  let confidence = 0;
  let modelVersion = "unavailable";
  try {
    const res = await fetch(`${protocol}://${host}/api/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, description }),
      cache: "no-store",
    });
    if (res.ok) {
      const result = await res.json();
      department = result.department;
      confidence = result.confidence;
      modelVersion = result.modelVersion;
    }
  } catch (error) {
    // If classifying fails, the ticket is still saved and marked for a person to check.
    console.error("Classify failed:", error);
  }
  const needsReview = confidence < 0.6;

  // 2. Save the ticket. submitted_by must be the signed-in user (RLS requires it).
  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({ submitted_by: user.id, subject, description, depot, department, needs_review: needsReview })
    .select("id, reference")
    .single();
  if (error || !ticket) {
    console.error("Could not save the ticket:", error);
    return { status: "error", fieldErrors: {}, message: "Your request couldn't be sent. Please try again.", values };
  }

  // 3. Keep the classifier's decision for the Sprint 3 audit.
  const { error: classifyError } = await supabase.from("classifications").insert({
    ticket_id: ticket.id,
    predicted_department: department,
    confidence,
    model_version: modelVersion,
  });
  if (classifyError) console.error("Could not save the classification:", classifyError);

  revalidatePath("/staff/requests");
  return { status: "sent", reference: ticket.reference, department };
}
