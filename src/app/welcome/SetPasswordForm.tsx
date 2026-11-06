"use client";

import { useActionState } from "react";
import { setPassword, type PasswordState } from "./actions";

const field =
  "h-11 w-full rounded-md border border-field bg-white px-3 text-sm text-ink focus:outline-2 focus:outline-brand aria-[invalid=true]:border-[#b42318]";

// Choose a password: used by Welcome (after an invite) and Reset password.
export function SetPasswordForm({ submitLabel = "Save password and open Relay" }: { submitLabel?: string }) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(setPassword, {});
  const errorFor = (f: "password" | "confirm") => (state.field === f ? state.error : undefined);

  return (
    <form action={action} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-[13px] font-medium text-ink-2">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={errorFor("password") ? true : undefined}
          aria-describedby="password-hint"
          className={field}
        />
        <p id="password-hint" className="text-[13px] text-muted">
          At least 8 characters.
        </p>
        {errorFor("password") && (
          <p role="alert" className="text-[13px] text-[#a4231a]">
            {errorFor("password")}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirm" className="block text-[13px] font-medium text-ink-2">
          Type it again
        </label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" aria-invalid={errorFor("confirm") ? true : undefined} className={field} />
        {errorFor("confirm") && (
          <p role="alert" className="text-[13px] text-[#a4231a]">
            {errorFor("confirm")}
          </p>
        )}
      </div>
      <button type="submit" disabled={pending} className="h-11 w-full rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
