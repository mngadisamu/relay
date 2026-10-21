import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { RoleHome } from "@/components/RoleHome";

export default async function StaffHome() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <RoleHome
      title="Staff home"
      description="Submit a request and track its progress. (Coming in S1-22 and S1-26.)"
      profile={profile}
    />
  );
}