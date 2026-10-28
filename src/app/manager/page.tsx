import { requireRole } from "@/lib/auth";
import { RoleHome } from "@/components/RoleHome";

export default async function ManagerHome() {
  // Only manager users may open this page; everyone else goes to their own home.
  const profile = await requireRole(["manager"]);

  return (
    <RoleHome
      title="Manager home"
      description="Dashboards and approvals. (Coming in Sprints 2 and 4.)"
      profile={profile}
    />
  );
}