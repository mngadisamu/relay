import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { getCurrentProfile } from "@/lib/auth";
import { SetPasswordForm } from "../welcome/SetPasswordForm";

// Choose a new password (S2-36). The email's link signed the person in
// (/auth/confirm), so this page only needs the new password.
export default async function ResetPasswordPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/link-expired");

  return (
    <AuthShell
      icon="key"
      heading="A fresh start, same Relay."
      blurb="Choose a new password. Your requests, replies and history are exactly where you left them."
    >
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold text-ink lg:text-2xl">Choose a new password</h1>
        <p className="text-sm leading-6 text-ink-2">
          For {profile.email}. Use one you don&apos;t use anywhere else.
        </p>
      </div>
      <SetPasswordForm submitLabel="Save new password" />
    </AuthShell>
  );
}
