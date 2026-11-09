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

  // Removed from Relay (S2-35): Supabase Auth refuses them. Saying so is safe,
  // because it only shows after the right email and password.
  if (error?.code === "user_banned") {
    return { error: "Your Relay account has been switched off. Ask your manager if this is a mistake." };
  }

  if (error) {
    // Same message whether the email or the password is wrong,
    // so nobody can use this form to find out which emails exist.
    return { error: "That email or password is incorrect. Please try again." };
  }

  // Look up the role now, so we can go straight to the right home page.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", data.user.id)
    .single();

  // A second check, in case the account was switched off a moment ago.
  if (profile && !profile.active) {
    await supabase.auth.signOut();
    return { error: "Your Relay account has been switched off. Ask your manager if this is a mistake." };
  }

  const role: Role = profile?.role ?? "staff";
  redirect(HOME_FOR_ROLE[role]);
}

// Signs the user out and sends them back to the login page.
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}