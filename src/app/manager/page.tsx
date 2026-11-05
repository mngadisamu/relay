import { requireRole } from "@/lib/auth";
import { RoleHome } from "@/components/RoleHome";
import { MANAGER_MENU } from "@/lib/menus";

export default async function ManagerHome() {
  // Only manager users may open this page; everyone else goes to their own home.
  const profile = await requireRole(["manager"]);

  return (
    <RoleHome
      title="Manager home"
      description="See how each department is doing, read the weekly reports and plan for busy weeks."
      profile={profile}
      home="/manager"
      menu={MANAGER_MENU}
    />
  );
}