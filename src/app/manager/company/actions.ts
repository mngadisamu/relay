"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Saves the company's depots and allowed domains (story P4). The database checks the caller
// is a general manager (save_company_settings, migration 0032). Lines are split here, not trusted.
export async function saveCompanySettings(formData: FormData) {
  const depots = String(formData.get("depots") ?? "")
    .split("\n")
    .map((d) => d.trim())
    .filter(Boolean);
  const domains = String(formData.get("domains") ?? "")
    .split(/[\n,]/)
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_company_settings", {
    p_depots: depots,
    p_domains: domains,
  });

  if (error) {
    // Show our own validation messages; anything else gets a plain one.
    const ours = /depots|Domain|domains|general manager|same name/i.test(error.message);
    redirect(`/manager/company?error=${encodeURIComponent(ours ? error.message : "The settings could not be saved. Try again.")}`);
  }
  redirect("/manager/company?saved=1");
}
