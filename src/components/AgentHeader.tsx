// prefetch on links: Next.js fetches the page in the background before the click,
// so it opens instantly instead of showing a loading screen.
import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { BrandMark } from "@/components/BrandMark";
import type { CurrentProfile } from "@/lib/auth";

// Agent top bar (mockup screens 6–8): logo, department, Inbox and Templates only (S1-18),
// who is signed in, and Sign out. It lays out the same way as RoleHeader on a phone.
export function AgentHeader({ profile, current }: { profile: CurrentProfile; current: "inbox" | "templates" }) {
  const navClass = (active: boolean) =>
    `shrink-0 rounded-md px-3 py-2 text-sm ${active ? "bg-brand-soft font-semibold text-brand-dark" : "font-medium text-ink-2 hover:bg-page"}`;

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-[1360px] flex-col gap-2 px-4 py-3 sm:min-h-[60px] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:py-0">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-7">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="shrink-0">
              <BrandMark size="sm" />
            </div>
            {profile.department && (
              <span className="min-w-0 truncate border-l border-line pl-2.5 text-[13px] text-muted">{profile.department} department</span>
            )}
          </div>
          <nav aria-label="Main" className="-mx-1 flex min-w-0 gap-1 overflow-x-auto whitespace-nowrap px-1">
            <Link prefetch href="/agent" aria-current={current === "inbox" ? "page" : undefined} className={navClass(current === "inbox")}>
              Inbox
            </Link>
            <Link prefetch href="/agent/templates" aria-current={current === "templates" ? "page" : undefined} className={navClass(current === "templates")}>
              Templates
            </Link>
          </nav>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm sm:justify-end sm:gap-3.5">
          <span className="min-w-0 text-ink-2">
            {profile.fullName} · <span className="capitalize">{profile.role}</span>
          </span>
          <form action={signOut} className="shrink-0">
            <button type="submit" className="px-1 py-2 text-sm font-medium text-brand hover:text-brand-dark">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
