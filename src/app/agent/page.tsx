import { requireRole } from "@/lib/auth";
import { RoleHome } from "@/components/RoleHome";

export default async function AgentHome() {
  // Only agent users may open this page; everyone else goes to their own home.
  const profile = await requireRole(["agent"]);

  return (
    <RoleHome
      title="Agent home"
      description="Your department's inbox of requests. (Coming in S1-19.)"
      profile={profile}
    />
  );
}