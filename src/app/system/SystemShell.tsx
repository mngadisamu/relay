import type { ReactNode } from "react";
import { RoleHeader } from "@/components/RoleHeader";
import { getCurrentProfile } from "@/lib/auth";
import { SYSTEM_MENU } from "@/lib/platform";

// The Relay frame for every system admin page: the same top bar and content width as the
// manager and compliance pages. requirePlatformAdmin() on each page has already run by now.
export async function SystemShell({ current, children }: { current?: string; children: ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  return (
    <div className="min-h-screen bg-page">
      <RoleHeader profile={profile} home="/system" menu={SYSTEM_MENU} current={current} label="Platform admin" />
      <main className="mx-auto max-w-[1100px] space-y-6 px-4 pb-12 pt-7 text-ink sm:px-6">{children}</main>
    </div>
  );
}
