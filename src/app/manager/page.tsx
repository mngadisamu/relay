import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { RoleHome } from "@/components/RoleHome";

export default async function ManagerHome() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <RoleHome
      title="Manager home"
      description="Dashboards and approvals. (Coming in Sprints 2 and 4.)"
      profile={profile}
    />
  );
}