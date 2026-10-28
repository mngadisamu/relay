import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { BrandMark } from "@/components/BrandMark";
import type { CurrentProfile } from "@/lib/auth";

// Agent top bar (mockup screens 6–8): logo, department, Inbox and Templates only (S1-18),
// who is signed in, and Sign out.
export function AgentHeader({ profile, current }: { profile: CurrentProfile; current: "inbox" | "templates" }) {
  const navClass = (active: boolean) =>
    `rounded-md px-3 py-2 text-sm ${active ? "bg-brand-soft font-semibold text-brand-dark" : "font-medium text-ink-2 hover:bg-page"}`;

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex min-h-[60px] max-w-[1360px] flex-wrap items-center justify-between gap-3 px-6">
        <div className="flex flex-wrap items-center gap-7">
          <div className="flex items-center gap-2.5">
            <BrandMark size="sm" />
            {profile.department && (
              <span className="border-l border-line pl-2.5 text-[13px] text-muted">{profile.department} department</span>
            )}
          </div>
          <nav aria-label="Main" className="flex gap-1">
            <Link href="/agent" aria-current={current === "inbox" ? "page" : undefined} className={navClass(current === "inbox")}>
              Inbox
            </Link>
            <Link href="/agent/templates" aria-current={current === "templates" ? "page" : undefined} className={navClass(current === "templates")}>
              Templates
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3.5">
          <span className="text-sm text-ink-2">
            {profile.fullName} · <span className="capitalize">{profile.role}</span>
          </span>
          <form action={signOut}>
            <button type="submit" className="px-1 py-2 text-sm font-medium text-brand hover:text-brand-dark">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
