import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Platform admins only (P3, P5). Signed out goes to /login, without two-step to /mfa/verify,
// and anyone who is not a platform admin goes to the home page.
export async function requirePlatformAdmin() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: level } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (level?.currentLevel !== "aal2") redirect("/mfa/verify");

  const { data: isAdmin } = await supabase.rpc("is_platform_admin");
  if (!isAdmin) redirect("/");

  return supabase;
}

// The four groups on a company's page, and the role and admin rule for each.
export const PEOPLE_TABS = [
  { key: "staff", label: "Staff" },
  { key: "agents", label: "Agents" },
  { key: "managers", label: "Managers" },
  { key: "admins", label: "Company admins" },
  { key: "compliance", label: "Compliance" },
] as const;
export type PeopleTab = (typeof PEOPLE_TABS)[number]["key"];

export type PlatformPerson = {
  person_id: string;
  person_name: string;
  person_email: string;
  person_role: string;
  person_department: string | null;
  person_depot: string | null;
  person_active: boolean;
};

// Which tab a person belongs to. A general manager (manager, no department) is a company admin.
export function tabFor(p: PlatformPerson): PeopleTab {
  if (p.person_role === "staff") return "staff";
  if (p.person_role === "agent") return "agents";
  if (p.person_role === "compliance") return "compliance";
  return p.person_department ? "managers" : "admins";
}
