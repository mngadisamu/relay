"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, type LoginState } from "@/app/login/actions";

// One demo role, as the server page passes it in. The password is only sent for roles
// that are set up. Demo accounts are fictional and live on the separate demo project.
export type DemoRole = {
  key: string;
  label: string;
  blurb: string;
  ready: boolean;
  email: string;
  password: string;
};

const initialState: LoginState = { error: null };

// The sign-in page with a row of demo role buttons on the blue panel. Clicking a role fills
// the email and password fields; the person then presses Sign in as usual.
export function DemoLogin({ roles }: { roles: DemoRole[] }) {
  const [state, formAction, isPending] = useActionState(signIn, initialState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [picked, setPicked] = useState<string | null>(null);

  function fill(role: DemoRole) {
    setEmail(role.email);
    setPassword(role.password);
    setPicked(role.key);
  }

  const picker = (
    <div className="space-y-3 pt-2">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-white">Try a demo account</p>
        <p className="text-[13px] leading-5 text-[#b9cce6]">
          Click a role below. Its email and password fill in the sign-in form on the right. Then press Sign in.
        </p>
      </div>
      <div className="grid max-w-[460px] gap-2 sm:grid-cols-2">
        {roles.map((role) => {
          const isPicked = picked === role.key;
          return (
            <button
              key={role.key}
              type="button"
              disabled={!role.ready}
              aria-pressed={isPicked}
              onClick={() => fill(role)}
              className={`rounded-xl border px-3.5 py-2.5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40 ${
                isPicked
                  ? "border-white bg-white text-navy"
                  : "border-white/30 bg-white/5 text-white hover:border-white/70 hover:bg-white/10"
              }`}
            >
              <span className="block text-sm font-semibold">{role.label}</span>
              <span className={`block text-xs leading-4 ${isPicked ? "text-[#0B3D73]" : "text-[#b9cce6]"}`}>
                {role.ready ? (isPicked ? "Filled in. Press Sign in." : role.blurb) : "Not set up yet"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <AuthShell
      heading="Try Relay as any role at Kopano Freight."
      blurb="Click a role on the left and its details fill in the sign-in form. Nothing here reaches a real company."
      aside={picker}
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
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setPicked(null);
            }}
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
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPicked(null);
            }}
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