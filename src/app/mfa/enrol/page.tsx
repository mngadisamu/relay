import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { HOME_FOR_ROLE, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EnrolForm } from "../MfaForms";

// Set-up of the authenticator app (S4-17). Only managers and compliance officers reach it.
// If they have already given a code this session, or have an app set up, they go to the right step.
export default async function EnrolPage() {
  const profile = await requireRole(["manager", "compliance"]);

  const supabase = await createClient();
  const { data: level } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (level?.currentLevel === "aal2") redirect(HOME_FOR_ROLE[profile.role]);
  if (level?.nextLevel === "aal2") redirect("/mfa/verify");

  return (
    <AuthShell
      heading="Two steps to keep Relay's management data safe."
      blurb="Your password, then a code from your phone. It takes about a minute to set up once."
    >
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold text-ink lg:text-2xl">Set up two-step sign-in</h1>
        <p className="text-sm text-ink-2">Signed in as {profile.fullName}.</p>
      </div>
      <EnrolForm />
    </AuthShell>
  );
}
