"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

// Manage users (S2-25). Adding a person goes through the invite-user Edge
// Function (it holds the secret key, inside Supabase); changing a role goes
// through set_user_role() (migration 0012). Both check the caller is a manager.

const ROLES = ["staff", "agent", "manager", "compliance"] as const;
const DEPARTMENTS = ["HR", "IT", "Finance", "Operations"] as const;

type Field = "fullName" | "email" | "role" | "department";
export type PeopleFormState = {
  error?: string; // shown above the button
  fieldErrors?: Partial<Record<Field, string>>; // shown under each field
  done?: string; // "Ayanda Zulu was added…"
  // What was typed, so a form with an error keeps it (React empties a form
  // after its action runs), and a stamp to redraw the form with it.
  values?: Record<string, string>;
  stamp?: number;
};

// Reads and checks the role and department fields shared by both forms.
function readRole(formData: FormData) {
  const role = String(formData.get("role") ?? "");
  const department = String(formData.get("department") ?? "") || null;
  const fieldErrors: PeopleFormState["fieldErrors"] = {};
  if (!ROLES.includes(role as (typeof ROLES)[number])) fieldErrors.role = "Choose a role";
  if (department && !DEPARTMENTS.includes(department as (typeof DEPARTMENTS)[number])) fieldErrors.department = "Choose a department";
  if (role === "agent" && !department) fieldErrors.department = "Choose a department for this agent";
  return { role, department, fieldErrors, values: { role, department: department ?? "" } };
}

// "Add and send invite"
export async function addPerson(_prev: PeopleFormState, formData: FormData): Promise<PeopleFormState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "manager") return { error: "Only managers can add people." };

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const { role, department, fieldErrors, values: roleValues } = readRole(formData);
  const values = { ...roleValues, fullName, email };
  const failed = (rest: PeopleFormState): PeopleFormState => ({ ...rest, values, stamp: Date.now() });
  if (!fullName) fieldErrors.fullName = "Enter their full name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "Enter a valid email address";
  // Nothing is saved or sent while a field is wrong.
  if (Object.keys(fieldErrors).length) return failed({ fieldErrors });

  // The email's link must come back to this same site (live, preview or local),
  // so the invite is accepted on the version being tested.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const redirectTo = `${proto}://${host}/auth/confirm`;

  const supabase = await createClient();
  const { error } = await supabase.functions.invoke("invite-user", {
    body: { fullName, email, role, department: role === "staff" || role === "compliance" ? null : department, redirectTo },
  });
  if (error) {
    // The function says what was wrong (and which field) in its reply.
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      const message = body?.error ?? "The invite couldn't be sent.";
      return failed(body?.field ? { fieldErrors: { [body.field as Field]: message } } : { error: message });
    }
    return failed({ error: "The invite service couldn't be reached. Check that the invite-user function is deployed in Supabase." });
  }

  revalidatePath("/manager/users");
  return { done: `${fullName} was added and an invite email is on its way to ${email}.`, stamp: Date.now() };
}

// "Save" on one person in the list.
export async function changeRole(userId: string, _prev: PeopleFormState, formData: FormData): Promise<PeopleFormState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "manager") return { error: "Only managers can change roles." };

  const { role, department, fieldErrors, values } = readRole(formData);
  const failed = (rest: PeopleFormState): PeopleFormState => ({ ...rest, values, stamp: Date.now() });
  // Nothing is saved while a field is wrong.
  if (Object.keys(fieldErrors).length) return failed({ fieldErrors });

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_role", { p_user_id: userId, p_role: role, p_department: department });
  if (error) {
    return /department/i.test(error.message) && /choose/i.test(error.message)
      ? failed({ fieldErrors: { department: error.message } })
      : failed({ error: error.message });
  }

  revalidatePath("/manager/users");
  return { done: "Saved. It applies from their next page or sign-in.", stamp: Date.now() };
}
