import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { RoleHome } from "@/components/RoleHome";

export default async function ComplianceHome() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <RoleHome
      title="Compliance home"
      description="The AI audit log and risk reports. (Coming in Sprint 3.)"
      profile={profile}
    />
  );
}