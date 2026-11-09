"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestReset, type ForgotState } from "./actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState<ForgotState, FormData>(requestReset, {});

  if (state.sent) {
    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold text-ink lg:text-2xl">Check your email</h1>
          <p role="status" className="text-sm leading-6 text-ink-2">
            If that email is in Relay, a link to choose a new password is on its way. It works once, for one hour.
            Check your spam folder if it isn&apos;t there in a few minutes.
          </p>
        </div>
        <Link href="/login" className="inline-flex h-11 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="space-y-5">
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold text-ink lg:text-2xl">Forgot your password?</h1>
        <p className="text-sm text-ink-2">Enter your work email and we&apos;ll send you a link to choose a new one.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "email-error" : undefined}
          className="h-12 text-base"
        />
        {state.error && (
          <p id="email-error" role="alert" className="text-[13px] text-[#a4231a]">
            {state.error}
          </p>
        )}
      </div>
      <Button type="submit" size="lg" disabled={pending} className="h-12 w-full text-base">
        {pending ? "Sending…" : "Send me a link"}
      </Button>
      <p className="text-center text-sm">
        <Link href="/login" className="font-medium text-brand hover:text-brand-dark">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
