import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { getCurrentProfile } from "@/lib/auth";
import { SetPasswordForm } from "./SetPasswordForm";

const ROLE_WORDS: Record<string, string> = {
  staff: "send requests to HR, IT, Finance and Operations",
  agent: "answer your department's requests",
  manager: "see how the departments are doing",
  compliance: "check how Relay's AI is behaving",
};

// The first page a new person sees after the invite link (S2-25): they are
// signed in, and choose a password for next time.
export default async function WelcomePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <AuthShell
      icon="hello"
      heading="You're in. Welcome to the team's help desk."
      blurb="One place to ask HR, IT, Finance and Operations for help, and to follow every request until it's sorted."
    >
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold text-ink lg:text-2xl">Welcome to Relay, {profile.fullName.split(" ")[0]}</h1>
        <p className="text-sm leading-6 text-ink-2">
          You can {ROLE_WORDS[profile.role]}
          {profile.department ? ` (${profile.department})` : ""}. Choose a password to sign in with next time.
        </p>
      </div>
      <SetPasswordForm />
    </AuthShell>
  );
}
