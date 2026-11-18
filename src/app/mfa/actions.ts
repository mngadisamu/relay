"use server";

import { redirect } from "next/navigation";
import { HOME_FOR_ROLE, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Two-step sign-in for managers and compliance (S4-17). Supabase MFA uses a six-digit code
// from an authenticator app. Only these two roles reach these actions; requireRole() sends others home.

export type EnrolState = {
  error?: string;
  qr?: string; // an SVG image, as a data address, to show as the QR code
  secret?: string; // the same secret as text, for typing into the app by hand
  factorId?: string; // the set-up in progress, passed to the code form
};

export type VerifyState = { error?: string };

// Starts a new set-up. Earlier unfinished set-ups are removed first, so only one is ever pending.
export async function startEnrolment(): Promise<EnrolState> {
  await requireRole(["manager", "compliance"]);
  const supabase = await createClient();

  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) return { error: "We couldn't start the set-up. Try again in a moment." };

  for (const factor of factors.all) {
    if (factor.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Relay" });
  if (error || !data) return { error: "We couldn't start the set-up. Try again in a moment." };

  return { qr: data.totp.qr_code, secret: data.totp.secret, factorId: data.id };
}

// Checks the six-digit code. On success the session is upgraded and the person goes to their home page.
export async function verifyCode(_previous: VerifyState, formData: FormData): Promise<VerifyState> {
  const profile = await requireRole(["manager", "compliance"]);

  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) {
    return { error: "Enter the 6-digit code from your authenticator app." };
  }

  const supabase = await createClient();

  // A set-up in progress passes its id. Otherwise use the app already set up for this account.
  let factorId = String(formData.get("factor_id") ?? "");
  if (!factorId) {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    factorId = factors?.totp.find((f) => f.status === "verified")?.id ?? "";
  }
  if (!factorId) {
    return { error: "Set up your authenticator app first." };
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) {
    // Codes change every 30 seconds, so the message suggests the next one.
    return { error: "That code didn't work. Check the time on your phone, then try the next code." };
  }

  redirect(HOME_FOR_ROLE[profile.role]);
}
