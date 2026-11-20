"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { requirePlatformAdmin } from "@/lib/platform";

// Creates a company and invites its first system admin (P3). The company is made by
// create_company() (migration 0033). The admin is invited by the invite-user function, which
// makes them the company's general manager. Only platform admins can do this.

export type CompanyFormState = {
  error?: string; // shown above the form
  fieldErrors?: Partial<Record<"name" | "slug" | "adminName" | "adminEmail", string>>;
  values?: Record<string, string>; // what was typed, so an error keeps it
  done?: string; // shown after success
  stamp?: number; // changes on every result, so the form redraws with its values
};

export async function createCompany(_prev: CompanyFormState, formData: FormData): Promise<CompanyFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const adminName = String(formData.get("adminName") ?? "").trim();
  const adminEmail = String(formData.get("adminEmail") ?? "").trim().toLowerCase();
  const twoStep = formData.get("two_step") === "on";
  const values = { name, slug, adminName, adminEmail, two_step: twoStep ? "on" : "" };
  const failed = (rest: CompanyFormState): CompanyFormState => ({ ...rest, values, stamp: Date.now() });

  // Checked before anything is created.
  const fieldErrors: NonNullable<CompanyFormState["fieldErrors"]> = {};
  if (name.length < 2 || name.length > 120) fieldErrors.name = "Enter the company name (2 to 120 characters)";
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) fieldErrors.slug = "Use 2 to 40 lower-case letters, numbers or hyphens";
  if (adminName.length < 2 || adminName.length > 120) fieldErrors.adminName = "Enter the system admin's full name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) fieldErrors.adminEmail = "Enter a valid email address";
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

  // The invite's link must come back to this same site, as for Manage users.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const redirectTo = `${proto}://${host}/auth/confirm`;

  const { error: inviteError } = await supabase.functions.invoke("invite-user", {
    body: {
      action: "platform_create_company_admin",
      companyId: Number(companyId),
      fullName: adminName,
      email: adminEmail,
      redirectTo,
    },
  });

  if (inviteError) {
    let message = "The invite could not be sent.";
    if (inviteError instanceof FunctionsHttpError) {
      const body = await inviteError.context.json().catch(() => null);
      message = body?.error ?? message;
      const field = body?.field === "adminEmail" ? "adminEmail" : body?.field === "adminName" ? "adminName" : null;
      if (field) return failed({ fieldErrors: { [field]: message } });
    }
    // The company now exists, so it must not be created again. The invite is the step that failed.
    revalidatePath("/system");
    return failed({
      error: `${name} was created, but its system admin was not invited: ${message} Do not create the company again.`,
    });
  }

  revalidatePath("/system");
  return {
    done: `${name} was created. An invite email is on its way to ${adminEmail} for ${adminName}, who will be its system admin.`,
    stamp: Date.now(),
  };
}
