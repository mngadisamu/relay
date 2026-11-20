"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Creates a company (story P3). Only platform admins may do this: the database checks it
// (create_company, migration 0031), and this page checks it again before showing the form.
export async function createCompany(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const twoStep = formData.get("two_step") === "on";

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_company", {
    p_slug: slug,
    p_name: name,
    p_two_step: twoStep,
  });

  // Show the database's own message only for our validation errors; anything else gets a plain one.
  if (error) {
    const friendly = error.message.includes("Use 2 to 40") || error.message.includes("must be 2 to 120")
      ? error.message
      : "The company could not be created. Check the code is new and try again.";
    redirect(`/system?error=${encodeURIComponent(friendly)}`);
  }
  redirect(`/system?created=${encodeURIComponent(name)}`);
}
