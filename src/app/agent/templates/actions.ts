"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

export type SaveResult = { ok: true; updatedAt: string } | { error: string };

// Saves an edited template (S1-27). The next AI draft for that department and
// tone starts from the new wording, because drafts read the templates table.
// Row-level security (migration 0004): agents edit only their own department's
// templates; managers edit any.
export async function saveTemplate(input: { id: number; body: string }): Promise<SaveResult> {
  const profile = await getCurrentProfile();
  if (!profile || !["agent", "manager"].includes(profile.role)) {
    return { error: "Only agents and managers can edit templates." };
  }

  const body = input.body.trim();
  if (!body) return { error: "The template is empty. Write the wording before saving." };

  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("templates")
    .update({ body, updated_by: profile.id, updated_at: now })
    .eq("id", input.id)
    .select("id, department, name");

  if (error) return { error: "Couldn't save the template: " + error.message };
  // If the rules don't allow the change, Supabase updates nothing rather than
  // returning an error, so check that a row really changed.
  if (!data || data.length === 0) {
    return { error: "You can only edit your own department's templates." };
  }

  await supabase.from("audit_log").insert({
    actor: profile.id,
    action: "template_edit",
    details: { template_id: input.id, department: data[0].department, name: data[0].name },
  });

  revalidatePath("/agent/templates");
  return { ok: true, updatedAt: now };
}
