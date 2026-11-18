import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { HOME_FOR_ROLE, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { VerifyForm } from "../MfaForms";

// Second step at each sign-in (S4-17). Only managers and compliance officers reach it.
// If they have no app set up yet, they go to set-up instead.
export default async function VerifyPage() {
  const profile = await requireRole(["manager", "compliance"]);

  const supabase = await createClient();
  const { data: level } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (level?.currentLevel === "aal2") redirect(HOME_FOR_ROLE[profile.role]);
  if (level?.nextLevel !== "aal2") redirect("/mfa/enrol");

  return (
    <AuthShell
      heading="Almost there. Enter the code from your phone."
      blurb="This keeps managers' and compliance officers' accounts safe, even if a password is ever guessed."
    >
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold text-ink lg:text-2xl">Enter your code</h1>
        <p className="text-sm text-ink-2">Open your authenticator app and enter the six-digit code for Relay.</p>
      </div>
      <VerifyForm />
    </AuthShell>
  );
}
