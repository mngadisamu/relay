// prefetch on links: Next.js fetches the page in the background before the click,
// so it opens instantly instead of showing a loading screen.
import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { BrandMark } from "@/components/BrandMark";
import type { CurrentProfile } from "@/lib/auth";

// One page in a role's menu. ready stays false until that page is merged.
export type MenuItem = {
  label: string;
  href: string;
  description: string;
  ready: boolean;
};

type Props = {
  profile: CurrentProfile;
  home: string; // the role's home page, e.g. "/manager"
  menu: MenuItem[];
  current?: string; // href of the page being shown; leave out on the home page
};

// Top bar for managers and compliance (S2-02), in the same style as the agent bar:
// logo (back to home), only this role's pages, who is signed in, and Sign out.
export function RoleHeader({ profile, home, menu, current }: Props) {
  const navClass = (active: boolean) =>
    `rounded-md px-3 py-2 text-sm ${active ? "bg-brand-soft font-semibold text-brand-dark" : "font-medium text-ink-2 hover:bg-page"}`;

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex min-h-[60px] max-w-[1360px] flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-7 gap-y-2">
          <Link prefetch href={home} aria-label="Relay home">
            <BrandMark size="sm" />
          </Link>
          <nav aria-label="Main" className="flex flex-wrap gap-1">
            {menu.map((item) =>
              item.ready ? (
                <Link
                  key={item.href}
                  prefetch
                  href={item.href}
                  aria-current={current === item.href ? "page" : undefined}
                  className={navClass(current === item.href)}
                >
                  {item.label}
                </Link>
              ) : (
                // Not built yet: shown so people know it's coming, but not a link.
                <span key={item.href} aria-disabled="true" className="px-3 py-2 text-sm font-medium text-muted">
                  {item.label} <span className="text-xs">(soon)</span>
                </span>
              ),
            )}
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