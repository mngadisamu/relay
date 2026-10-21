import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { RoleHome } from "@/components/RoleHome";

export default async function AgentHome() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <RoleHome
      title="Agent home"
      description="Your department's inbox of requests. (Coming in S1-19.)"
      profile={profile}
    />
  );
}