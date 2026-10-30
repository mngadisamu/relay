import { cache } from "react";
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
  id: string; // the user's id (same as auth.uid() in the database)
  email: string;
  fullName: string;
  role: Role;
  department: string | null;
};

// Returns the signed-in user's profile, or null if nobody is signed in.
// cache(): a page and its layout often both ask; this way it's looked up once per request.
export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const supabase = await createClient();

  // getClaims() checks the sign-in token on our own server where it can,
  // instead of calling Supabase Auth over the internet on every page (much faster).
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, department")
    .eq("id", claims.sub)
    .single();
  if (!profile) return null;

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    fullName: profile.full_name,
    role: profile.role,
    department: profile.department,
  };
});

// Lets only the listed roles see a page. Signed-out users go to /login;
// anyone with a different role goes back to their own home page.
export async function requireRole(allowed: Role[]): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!allowed.includes(profile.role)) redirect(HOME_FOR_ROLE[profile.role]);
  return profile;
}