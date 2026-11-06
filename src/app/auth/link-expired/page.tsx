import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

// Shown when an invite link has been used already or has expired (S2-25).
export default function LinkExpiredPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-[420px] space-y-4 rounded-[10px] border border-line bg-white p-6">
        <BrandMark />
        <h1 className="text-xl font-semibold text-ink">This link has expired</h1>
        <p className="text-[15px] text-ink-2">
          Invite links work once, for a limited time. Ask your manager to send you a new invite, or sign in if you
          have already chosen a password.
        </p>
        <Link href="/login" className="inline-flex h-11 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark">
          Go to sign in
        </Link>
      </div>
    </main>
  );
}
