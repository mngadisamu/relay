// prefetch on links: Next.js fetches the page in the background before the click,
// so it opens instantly instead of showing a loading screen.
import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { BrandMark } from "@/components/BrandMark";

// Staff top bar (mockup screens 2–5): logo, Sign out, and only the two
// pages staff can use (S1-18).
export function StaffNav({ current }: { current: "submit" | "requests" }) {
  const tab = (active: boolean) =>
    `border-b-2 py-3 text-[15px] ${
      active ? "border-brand font-semibold text-brand" : "border-transparent font-medium text-muted hover:text-ink"
    }`;

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <BrandMark size="sm" />
        <form action={signOut}>
          <button type="submit" className="px-1 py-3 text-sm font-medium text-brand hover:text-brand-dark">
            Sign out
          </button>
        </form>
      </div>
      <nav aria-label="Main" className="mx-auto flex max-w-3xl gap-6 px-4">
        <Link prefetch href="/staff" aria-current={current === "submit" ? "page" : undefined} className={tab(current === "submit")}>
          Submit request
        </Link>
        <Link prefetch href="/staff/requests" aria-current={current === "requests" ? "page" : undefined} className={tab(current === "requests")}>
          My requests
        </Link>
      </nav>
    </header>
  );
}
