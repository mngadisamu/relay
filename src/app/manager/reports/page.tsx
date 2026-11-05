import { requireRole } from "@/lib/auth";
import { RoleHeader } from "@/components/RoleHeader";
import { MANAGER_MENU } from "@/lib/menus";
import ReportsForm from "./ReportsForm";

// Weekly report preview (S2-15). Managers only: everyone else goes to their own home.
export default async function ManagerReportsPage() {
  const profile = await requireRole(["manager"]);

  return (
    <div className="min-h-screen bg-page">
      <RoleHeader profile={profile} home="/manager" menu={MANAGER_MENU} current="/manager/reports" />
      <ReportsForm />
    </div>
  );
}
