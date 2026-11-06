import { redirect } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
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
    <main className="flex min-h-screen items-center justify-center bg-page px-4 py-10">
      <div className="w-full max-w-[420px] space-y-5 rounded-[10px] border border-line bg-white p-6">
        <BrandMark />
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-ink">Welcome to Relay, {profile.fullName.split(" ")[0]}</h1>
          <p className="text-[15px] text-ink-2">
            You can {ROLE_WORDS[profile.role]}
            {profile.department ? ` (${profile.department})` : ""}. Choose a password to sign in with next time.
          </p>
        </div>
        <SetPasswordForm />
      </div>
    </main>
  );
}
