"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HOME_FOR_ROLE, type Role } from "@/lib/auth";

export type LoginState = { error: string | null };

// Runs on the server when the login form is submitted.
export async function signIn(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Same message whether the email or the password is wrong,
    // so nobody can use this form to find out which emails exist.
    return { error: "That email or password is incorrect. Please try again." };
  }

  // Look up the role now, so we can go straight to the right home page.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const role: Role = profile?.role ?? "staff";
  redirect(HOME_FOR_ROLE[role]);
}

// Signs the user out and sends them back to the login page.
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}