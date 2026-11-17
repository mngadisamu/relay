import { RoleHeader } from "@/components/RoleHeader";
import { AgentHeader } from "@/components/AgentHeader";
import { MANAGER_MENU } from "@/lib/menus";
import type { CurrentProfile } from "@/lib/auth";
import { StaffNav } from "./StaffNav";

// The header for Submit request and My requests. Staff see their own two-tab bar. Agents
// and managers see the header they use everywhere else, with the same two tabs added, so
// the page doesn't look like a different site when they open it.
export function RequestsHeader({ profile, current }: { profile: CurrentProfile; current: "submit" | "requests" }) {
  if (profile.role === "manager") {
    return (
      <RoleHeader
        profile={profile}
        home="/manager"
        menu={MANAGER_MENU}
        current={current === "submit" ? "/staff" : "/staff/requests"}
      />
    );
  }
  if (profile.role === "agent") {
    return <AgentHeader profile={profile} current={current} />;
  }
  return <StaffNav current={current} />;
}
