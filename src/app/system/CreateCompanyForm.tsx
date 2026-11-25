"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCompany, type CompanyFormState } from "./actions";

const initial: CompanyFormState = {};

// Create a company (P3): its name and code, and the name and email of its first system admin.
// The admin gets an invite email and chooses their own password.
export function CreateCompanyForm() {
  const [state, action, pending] = useActionState(createCompany, initial);
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};

  return (
    <div className="space-y-4">
      {state.done && (
        <p role="status" className="rounded-[10px] border border-line bg-white px-4 py-3 text-sm text-ink">
          {state.done}
        </p>
      )}
      {state.error && (
        <p role="alert" className="rounded-[10px] border border-[#f0c8c3] bg-[#fdf1ef] px-4 py-3 text-sm text-[#a4231a]">
          {state.error}
        </p>
      )}

      {/* The key redraws the form after each result, so the typed values come back on an error. */}
      <form key={state.stamp} action={action} className="grid gap-5">
        <div className="grid gap-1.5">
          <Label htmlFor="name">Company name</Label>
          <Input id="name" name="name" required minLength={2} maxLength={120} autoComplete="off" defaultValue={v.name}
            aria-invalid={fe.name ? true : undefined} aria-describedby={fe.name ? "name-error" : undefined} className="h-11" />
          {fe.name && <p id="name-error" className="text-sm text-[#a4231a]">{fe.name}</p>}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="slug">Company code</Label>
          <Input id="slug" name="slug" required minLength={2} maxLength={40} pattern="[a-z0-9-]+" autoComplete="off" defaultValue={v.slug}
            aria-invalid={fe.slug ? true : undefined} aria-describedby={fe.slug ? "slug-error slug-hint" : "slug-hint"} className="h-11" />
          <p id="slug-hint" className="text-xs text-muted">Lower-case letters, numbers and hyphens, 2 to 40 characters.</p>
          {fe.slug && <p id="slug-error" className="text-sm text-[#a4231a]">{fe.slug}</p>}
        </div>

        <fieldset className="grid gap-5 rounded-lg border border-line-soft bg-page/60 p-4">
          <legend className="px-1 text-sm font-semibold text-ink">System admin</legend>
          <p className="-mt-2 text-sm text-ink-2">
            They get an invite email, choose their own password, and manage the company&apos;s people and settings.
          </p>
          <div className="grid gap-1.5">
            <Label htmlFor="adminName">Full name</Label>
            <Input id="adminName" name="adminName" required minLength={2} maxLength={120} autoComplete="off" defaultValue={v.adminName}
              aria-invalid={fe.adminName ? true : undefined} aria-describedby={fe.adminName ? "adminName-error" : undefined} className="h-11" />
            {fe.adminName && <p id="adminName-error" className="text-sm text-[#a4231a]">{fe.adminName}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="adminEmail">Work email</Label>
            <Input id="adminEmail" name="adminEmail" type="email" required autoComplete="off" defaultValue={v.adminEmail}
              aria-invalid={fe.adminEmail ? true : undefined} aria-describedby={fe.adminEmail ? "adminEmail-error" : undefined} className="h-11" />
            {fe.adminEmail && <p id="adminEmail-error" className="text-sm text-[#a4231a]">{fe.adminEmail}</p>}
          </div>
        </fieldset>

        <label className="flex items-start gap-2.5 text-sm text-ink">
          <input type="checkbox" name="two_step" defaultChecked={v.two_step ? v.two_step === "on" : true} className="mt-0.5 h-4 w-4" />
          <span>Require two-step sign-in (keep this on for every real company)</span>
        </label>

        <Button type="submit" disabled={pending} className="h-11 w-full">
          {pending ? "Creating…" : "Create company"}
        </Button>
      </form>
    </div>
  );
}
