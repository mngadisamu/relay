import { redirect } from "next/navigation";
import { getCurrentProfile, HOME_FOR_ROLE } from "@/lib/auth";

// Not a real page: it looks up your role and sends you to your home screen.
export default async function HomeRedirect() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  redirect(HOME_FOR_ROLE[profile.role]);
}