import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "staff" | "agent" | "manager" | "compliance";

// Where each role lands after signing in.
export const HOME_FOR_ROLE: Record<Role, string> = {
  staff: "/staff",
  agent: "/agent",
  manager: "/manager",
  compliance: "/compliance",
};

export type CurrentProfile = {
  email: string;
  fullName: string;
  role: Role;
  department: string | null;
};

// Returns the signed-in user's profile, or null if nobody is signed in.
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, department")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  return {
    email: user.email ?? "",
    fullName: profile.full_name,
    role: profile.role,
    department: profile.department,
  };
}

// Lets only the listed roles see a page. Signed-out users go to /login;
// anyone with a different role goes back to their own home page.
export async function requireRole(allowed: Role[]): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!allowed.includes(profile.role)) redirect(HOME_FOR_ROLE[profile.role]);
  return profile;
}