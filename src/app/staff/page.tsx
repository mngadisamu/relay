import { requireRole } from "@/lib/auth";
import { RoleHome } from "@/components/RoleHome";

export default async function StaffHome() {
  // Only staff users may open this page; everyone else goes to their own home.
  const profile = await requireRole(["staff"]);

  return (
    <RoleHome
      title="Staff home"
      description="Submit a request and track its progress. (Coming in S1-22 and S1-26.)"
      profile={profile}
    />
  );
}