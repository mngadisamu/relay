"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteCompanyAdmin, type CompanyFormState } from "./actions";

const initial: CompanyFormState = {};

// Invite a system admin into an existing company (for example Capaciti or BUCO, which have no admin yet).
export function InviteAdminForm({ companyId }: { companyId: number }) {
  const [state, action, pending] = useActionState(inviteCompanyAdmin, initial);
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};

  return (
    <div className="space-y-4">
      {state.done && (
        <p role="status" className="rounded-[10px] border border-line bg-white px-4 py-3 text-sm text-ink">{state.done}</p>
      )}
      {state.error && (
        <p role="alert" className="rounded-[10px] border border-[#f0c8c3] bg-[#fdf1ef] px-4 py-3 text-sm text-[#a4231a]">{state.error}</p>
      )}

      <form key={state.stamp} action={action} className="grid max-w-xl gap-5 rounded-[10px] border border-line bg-white p-5 sm:p-6">
        <input type="hidden" name="companyId" value={companyId} />

        <div className="grid gap-1.5">
          <Label htmlFor="inviteAdminName">Full name</Label>
          <Input id="inviteAdminName" name="adminName" required minLength={2} maxLength={120} autoComplete="off" defaultValue={v.adminName}
            aria-invalid={fe.adminName ? true : undefined} aria-describedby={fe.adminName ? "inviteAdminName-error" : undefined} className="h-11" />
          {fe.adminName && <p id="inviteAdminName-error" className="text-sm text-[#a4231a]">{fe.adminName}</p>}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="inviteAdminEmail">Work email</Label>
          <Input id="inviteAdminEmail" name="adminEmail" type="email" required autoComplete="off" defaultValue={v.adminEmail}
            aria-invalid={fe.adminEmail ? true : undefined} aria-describedby={fe.adminEmail ? "inviteAdminEmail-error" : undefined} className="h-11" />
          {fe.adminEmail && <p id="inviteAdminEmail-error" className="text-sm text-[#a4231a]">{fe.adminEmail}</p>}
        </div>

        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Sending invite…" : "Send invite"}
        </Button>
      </form>
    </div>
  );
}
