"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

// Sign in (S1-09, mockup screens 1 and 1b): navy band on phones, split screen on
// desktop (the shared AuthShell). "Forgot your password?" opens /forgot-password.
export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(signIn, initialState);

  return (
    <AuthShell
      heading="One place to ask for help at Kopano Freight."
      blurb="Send a request from the depot, the road or the office. Relay gets it to the right team and keeps you posted until it's sorted."
      footer={
        <p className="mx-auto max-w-[300px] text-center text-sm leading-5 text-muted lg:max-w-none">
          No account yet? Ask your manager to add you to Relay.
        </p>
      }
    >
      <div className="space-y-1.5">
        {/* The page's main heading, so it's an h1. */}
        <h1 className="text-xl font-semibold text-ink lg:text-2xl">Sign in</h1>
        <p className="text-sm text-ink-2">Use your Kopano Freight work email.</p>
      </div>
      <form action={formAction} className="space-y-5">
        {state.error && (
          <p role="alert" className="rounded-md border border-[#f4c7c2] bg-[#fdecea] px-3 py-2.5 text-sm leading-5 text-destructive">
            {state.error}
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={state.error ? true : undefined}
            className="h-12 text-base"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={state.error ? true : undefined}
            className="h-12 text-base"
          />
        </div>

        <Button type="submit" size="lg" disabled={isPending} className="h-12 w-full text-base">
          {isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="text-center text-sm">
        <Link href="/forgot-password" className="font-medium text-brand hover:text-brand-dark">
          Forgot your password?
        </Link>
      </p>
    </AuthShell>
  );
}
