import { requireRole } from "@/lib/auth";
import { RoleHome } from "@/components/RoleHome";
import { COMPLIANCE_MENU } from "@/lib/menus";

export default async function ComplianceHome() {
  // Only compliance users may open this page; everyone else goes to their own home.
  const profile = await requireRole(["compliance"]);

  return (
    <RoleHome
      title="Compliance home"
      description="Check what the AI decided, review flagged replies and report on risk."
      profile={profile}
      home="/compliance"
      menu={COMPLIANCE_MENU}
    />
  );
}