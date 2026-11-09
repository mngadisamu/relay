"use server";

import { sendPasswordResetEmail } from "@/lib/password-reset";

export type ForgotState = { error?: string; sent?: boolean };

// Forgot your password (S2-36). The answer is the same whether or not the
// email is in Relay, so nobody can use this page to find out who works here.
export async function requestReset(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter your work email address" };

  const { error } = await sendPasswordResetEmail(email);
  // Too many tries: Supabase limits how often emails are sent. Saying so gives
  // nothing away about the account.
  if (error && /rate|too many|seconds/i.test(error.message)) {
    return { error: "Too many tries. Wait a minute, then try again." };
  }
  return { sent: true };
}
