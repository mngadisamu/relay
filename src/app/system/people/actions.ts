"use server";

import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/platform";

// Saves one person's details (story P5). Name, department and depot go through
// platform_update_person (migration 0035). A new email goes through the invite-user function,
// which holds the secret key. A platform admin never reads tickets here.
export async function updatePerson(formData: FormData) {
  const supabase = await requirePlatformAdmin();

  const userId = String(formData.get("userId") ?? "");
  const companyId = String(formData.get("companyId") ?? "");
  const tab = String(formData.get("tab") ?? "staff");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const department = String(formData.get("department") ?? "");
  const depot = String(formData.get("depot") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const currentEmail = String(formData.get("currentEmail") ?? "").trim().toLowerCase();
  const back = `/system/companies/${companyId}?tab=${encodeURIComponent(tab)}`;

  const { error } = await supabase.rpc("platform_update_person", {
    p_user_id: userId,
    p_full_name: fullName,
    p_department: department || null,
    p_depot: depot || null,
  });
  if (error) {
    const ours = /name must|Choose a department|agent needs|depot is not|Person not found/i.test(error.message);
    redirect(`/system/people/${userId}?company=${companyId}&tab=${encodeURIComponent(tab)}&error=${encodeURIComponent(ours ? error.message : "The details could not be saved. Try again.")}`);
  }

  if (email && email !== currentEmail) {
    const { data, error: emailError } = await supabase.functions.invoke("invite-user", {
      body: { action: "platform_update_email", userId, email },
    });
    const message = emailError ? "The email could not be changed." : (data as { error?: string } | null)?.error;
    if (emailError || message) {
      redirect(`/system/people/${userId}?company=${companyId}&tab=${encodeURIComponent(tab)}&error=${encodeURIComponent(message ?? "The email could not be changed.")}`);
    }
  }

  redirect(`${back}&saved=1`);
}
