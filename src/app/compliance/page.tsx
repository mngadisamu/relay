import { requireRole } from "@/lib/auth";
import { RoleHome } from "@/components/RoleHome";

export default async function ComplianceHome() {
  // Only compliance users may open this page; everyone else goes to their own home.
  const profile = await requireRole(["compliance"]);

  return (
    <RoleHome
      title="Compliance home"
      description="The AI audit log and risk reports. (Coming in Sprint 3.)"
      profile={profile}
    />
  );
}