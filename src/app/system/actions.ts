"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { requirePlatformAdmin } from "@/lib/platform";

// Creates a company and invites its first system admin (P3), and invites a system admin into
// a company that already exists. Only platform admins can do this. The admin is invited by the
// invite-user function, which makes them the company's general manager.

export type CompanyFormState = {
  error?: string; // shown above the form
  fieldErrors?: Partial<Record<"name" | "slug" | "adminName" | "adminEmail", string>>;
  values?: Record<string, string>; // what was typed, so an error keeps it
  done?: string; // shown after success
  stamp?: number; // changes on every result, so the form redraws with its values
};

type PlatformSupabase = Awaited<ReturnType<typeof requirePlatformAdmin>>;

// The invite step, shared by both forms. Returns the message and the field it belongs to.
async function inviteAdmin(
  supabase: PlatformSupabase,
  companyId: number,
  adminName: string,
  adminEmail: string,
): Promise<{ ok: true } | { ok: false; message: string; field?: "adminName" | "adminEmail" }> {
  // The invite's link must come back to this same site, as for Manage users.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const redirectTo = `${proto}://${host}/auth/confirm`;

  const { error } = await supabase.functions.invoke("invite-user", {
    body: { action: "platform_create_company_admin", companyId, fullName: adminName, email: adminEmail, redirectTo },
  });
  if (!error) return { ok: true };

  let message = "The invite could not be sent.";
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null);
    message = body?.error ?? message;
    if (body?.field === "adminEmail") return { ok: false, message, field: "adminEmail" };
    if (body?.field === "adminName") return { ok: false, message, field: "adminName" };
  }
  return { ok: false, message };
}

// Reads and checks the name and email shared by both forms.
function readAdmin(formData: FormData) {
  const adminName = String(formData.get("adminName") ?? "").trim();
  const adminEmail = String(formData.get("adminEmail") ?? "").trim().toLowerCase();
  const errors: NonNullable<CompanyFormState["fieldErrors"]> = {};
  if (adminName.length < 2 || adminName.length > 120) errors.adminName = "Enter the system admin's full name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) errors.adminEmail = "Enter a valid email address";
  return { adminName, adminEmail, errors };
}

export async function createCompany(_prev: CompanyFormState, formData: FormData): Promise<CompanyFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const twoStep = formData.get("two_step") === "on";
  const admin = readAdmin(formData);
  const values = { name, slug, adminName: admin.adminName, adminEmail: admin.adminEmail, two_step: twoStep ? "on" : "" };
  const failed = (rest: CompanyFormState): CompanyFormState => ({ ...rest, values, stamp: Date.now() });

  // Checked before anything is created.
  const fieldErrors: NonNullable<CompanyFormState["fieldErrors"]> = { ...admin.errors };
  if (name.length < 2 || name.length > 120) fieldErrors.name = "Enter the company name (2 to 120 characters)";
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) fieldErrors.slug = "Use 2 to 40 lower-case letters, numbers or hyphens";
  if (Object.keys(fieldErrors).length) return failed({ fieldErrors });

  const supabase = await requirePlatformAdmin();
  const { data: companyId, error } = await supabase.rpc("create_company", {
    p_slug: slug,
    p_name: name,
    p_two_step: twoStep,
  });
  if (error || companyId == null) {
    // Show the database's own message only for our validation errors.
    const ours = error?.message.includes("Use 2 to 40") || error?.message.includes("must be 2 to 120");
    return failed({ error: ours ? error?.message : "The company could not be created. Check the company code is new and try again." });
  }

  const result = await inviteAdmin(supabase, Number(companyId), admin.adminName, admin.adminEmail);
  revalidatePath("/system");
  if (!result.ok) {
    // The company now exists, so it must not be created again. Its admin can be invited from its page.
    if (result.field) return failed({ fieldErrors: { [result.field]: result.message } });
    return failed({
      error: `${name} was created, but its system admin was not invited: ${result.message} Do not create the company again. Invite the admin from the company's page.`,
    });
  }

  return {
    done: `${name} was created. An invite email is on its way to ${admin.adminEmail} for ${admin.adminName}, who will be its system admin.`,
    stamp: Date.now(),
  };
}

// Invites a system admin into a company that already exists (for example one with no admin yet).
export async function inviteCompanyAdmin(_prev: CompanyFormState, formData: FormData): Promise<CompanyFormState> {
  const companyId = Number(formData.get("companyId"));
  const admin = readAdmin(formData);
  const values = { adminName: admin.adminName, adminEmail: admin.adminEmail };
  const failed = (rest: CompanyFormState): CompanyFormState => ({ ...rest, values, stamp: Date.now() });

  if (!Number.isInteger(companyId) || companyId <= 0) return failed({ error: "Choose a company" });
  if (Object.keys(admin.errors).length) return failed({ fieldErrors: admin.errors });

  const supabase = await requirePlatformAdmin();
  const result = await inviteAdmin(supabase, companyId, admin.adminName, admin.adminEmail);
  if (!result.ok) {
    if (result.field) return failed({ fieldErrors: { [result.field]: result.message } });
    return failed({ error: result.message });
  }

  revalidatePath(`/system/companies/${companyId}`);
  return {
    done: `An invite email is on its way to ${admin.adminEmail} for ${admin.adminName}, who will be a system admin of this company.`,
    stamp: Date.now(),
  };
}
