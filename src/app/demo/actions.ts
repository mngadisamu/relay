"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HOME_FOR_ROLE, getCurrentProfile } from "@/lib/auth";
import { demoCredentials, demoEnabled } from "@/lib/demo";

// Signs in as a demo role on the server. The browser sends only the role name.
export async function signInAsDemo(formData: FormData) {
  if (!demoEnabled()) redirect("/login");

  const key = String(formData.get("role") ?? "");
  const credentials = demoCredentials(key);
  if (!credentials) redirect("/demo?error=not-ready");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);
  if (error) redirect("/demo?error=sign-in");

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  redirect(HOME_FOR_ROLE[profile.role]);
}
