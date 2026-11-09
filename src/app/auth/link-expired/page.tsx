import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";

// Shown when an invite or password link has been used already or has expired
// (S2-25, S2-36).
export default function LinkExpiredPage() {
  return (
    <AuthShell
      icon="clock"
      heading="That link has done its job."
      blurb="Links in Relay's emails work once, for a limited time, to keep your account safe."
    >
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold text-ink lg:text-2xl">This link has expired</h1>
        <p className="text-sm leading-6 text-ink-2">
          It may have been used already, or it&apos;s more than an hour old. If you already have a password, sign in.
          If not, ask for a new link.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/login" className="inline-flex h-11 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark">
          Go to sign in
        </Link>
        <Link href="/forgot-password" className="inline-flex h-11 items-center rounded-md border border-field bg-white px-4 text-sm font-semibold text-ink hover:bg-page">
          Send me a new link
        </Link>
      </div>
    </AuthShell>
  );
}
