"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startEnrolment, verifyCode, type EnrolState, type VerifyState } from "./actions";

const noEnrolState: EnrolState = {};
const noVerifyState: VerifyState = {};

// The code box, shared by set-up and sign-in. The 6-digit code is typed, never shown.
function CodeField({ id, error, factorId }: { id: string; error?: string; factorId?: string }) {
  // The error message has this id, so a screen reader reads it with the field.
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1.5">
      {factorId && <input type="hidden" name="factor_id" value={factorId} />}
      <Label htmlFor={id}>Six-digit code</Label>
      <Input
        id={id}
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={8}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="h-12 text-base tracking-[0.2em]"
      />
    </div>
  );
}

function ErrorText({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="rounded-md border border-[#f4c7c2] bg-[#fdecea] px-3 py-2.5 text-sm leading-5 text-destructive">
      {message}
    </p>
  );
}

// First-time set-up: show the QR code, then ask for the first code to confirm it works.
export function EnrolForm() {
  const [start, startAction, startPending] = useActionState(startEnrolment, noEnrolState);
  const [verify, verifyAction, verifyPending] = useActionState(verifyCode, noVerifyState);

  if (!start.qr) {
    return (
      <form action={startAction} className="space-y-5">
        <ErrorText message={start.error} />
        <p className="text-sm leading-6 text-ink-2">
          Managers and compliance officers sign in with a code from an authenticator app as well as the password.
          Use an app such as Google Authenticator, Microsoft Authenticator or Authy.
        </p>
        <Button type="submit" size="lg" disabled={startPending} className="h-12 w-full text-base">
          {startPending ? "Starting…" : "Start set-up"}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-ink-2">
        <li>Open your authenticator app and add a new account.</li>
        <li>Scan this QR code, or type the key below by hand.</li>
        <li>Enter the six-digit code the app shows.</li>
      </ol>

      <div className="flex flex-col items-center gap-3">
        {/* The QR code is an image from Supabase, so it is shown as an image, not as HTML. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- the QR code is a data address that next/image cannot optimise */}
        <img src={start.qr} alt="QR code for your authenticator app" width={200} height={200} className="rounded-md bg-white p-2" />
        <p className="text-center text-sm text-ink-2">
          Key: <span className="break-all font-mono text-ink">{start.secret}</span>
        </p>
      </div>

      <form action={verifyAction} className="space-y-5">
        <ErrorText id="enrol-code-error" message={verify.error} />
        <CodeField id="enrol-code" error={verify.error} factorId={start.factorId} />
        <Button type="submit" size="lg" disabled={verifyPending} className="h-12 w-full text-base">
          {verifyPending ? "Checking…" : "Confirm and continue"}
        </Button>
      </form>
    </div>
  );
}

// Every sign-in after set-up: ask for the code from the app.
export function VerifyForm() {
  const [state, formAction, isPending] = useActionState(verifyCode, noVerifyState);

  return (
    <form action={formAction} className="space-y-5">
      <ErrorText id="verify-code-error" message={state.error} />
      <CodeField id="verify-code" error={state.error} />
      <Button type="submit" size="lg" disabled={isPending} className="h-12 w-full text-base">
        {isPending ? "Checking…" : "Continue"}
      </Button>
    </form>
  );
}
