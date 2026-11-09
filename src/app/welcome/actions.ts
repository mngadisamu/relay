"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HOME_FOR_ROLE, getCurrentProfile } from "@/lib/auth";

export type PasswordState = { error?: string; field?: "password" | "confirm" };

// A new person chooses their password (S2-25), then goes straight to their home.
export async function setPassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters", field: "password" };
  if (password !== confirm) return { error: "The two passwords don't match", field: "confirm" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Couldn't save the password: " + error.message, field: "password" };

  // Straight to the final page (no redirect chains, S1-09).
  redirect(HOME_FOR_ROLE[profile.role]);
}
