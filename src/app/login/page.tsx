"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(signIn, initialState);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form action={formAction} className="w-full max-w-sm space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Sign in to Relay</h1>
          <p className="text-sm opacity-70">Kopano Freight internal help desk</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-md border border-gray-400 bg-transparent px-3 py-2"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-md border border-gray-400 bg-transparent px-3 py-2"
          />
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-foreground text-background py-2 font-medium disabled:opacity-50"
        >
          {isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}