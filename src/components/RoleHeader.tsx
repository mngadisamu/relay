// prefetch on links: Next.js fetches the page in the background before the click,
// so it opens instantly instead of showing a loading screen.
import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { BrandMark } from "@/components/BrandMark";
import type { CurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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
  label?: string; // shown instead of the company name (the system pages use "Platform admin")
};

// Top bar for managers and compliance (S2-02), in the same style as the agent bar:
// logo (back to home), only this role's pages, who is signed in, and Sign out.
// On a phone the logo and the tabs sit on one row, the tabs scroll sideways instead
// of wrapping into clusters, and the person's name and Sign out get a row of their own.
export async function RoleHeader({ profile, home, menu, current, label }: Props) {
  // The company's name, from the signed-in person's own company (RLS lets members read it).
  let companyName = label;
  if (!companyName) {
    const supabase = await createClient();
    const { data } = await supabase.from("companies").select("name").maybeSingle();
    companyName = data?.name ?? undefined;
  }

  const navClass = (active: boolean) =>
    `shrink-0 rounded-md px-3 py-2 text-sm ${active ? "bg-brand-soft font-semibold text-brand-dark" : "font-medium text-ink-2 hover:bg-page"}`;

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-[1360px] flex-col gap-2 px-4 py-3 sm:min-h-[60px] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:py-0">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-7">
          <div className="flex min-w-0 items-center gap-3">
            <Link prefetch href={home} aria-label="Relay home" className="shrink-0">
              <BrandMark size="sm" />
            </Link>
            {companyName && (
              <span className="min-w-0 truncate border-l border-line pl-3 text-sm font-medium text-ink-2" title={companyName}>
                {companyName}
              </span>
            )}
          </div>
          <nav aria-label="Main" className="-mx-1 flex min-w-0 gap-1 overflow-x-auto whitespace-nowrap px-1">
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
                <span key={item.href} aria-disabled="true" className="shrink-0 px-3 py-2 text-sm font-medium text-muted">
                  {item.label} <span className="text-xs">(soon)</span>
                </span>
              ),
            )}
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
