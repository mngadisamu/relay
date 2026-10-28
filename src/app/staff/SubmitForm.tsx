"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitRequest, type SubmitState } from "./actions";

const initialState: SubmitState = { status: "idle" };

// 48 px tall fields and 16 px text, so phones don't zoom in (S1-22: 360 px without zooming).
const fieldClass =
  "w-full rounded-md border border-field bg-white px-3 text-base text-ink focus:border-brand focus:outline-2 focus:outline-brand";

// Submit form (S1-22, mockup screen 2) and the "Request sent" view (mockup screen 3).
export function SubmitForm() {
  const [state, formAction, isPending] = useActionState(submitRequest, initialState);

  if (state.status === "sent") {
    return (
      <div className="space-y-4">
        <section role="status" className="space-y-5 rounded-[10px] border border-line bg-white px-5 py-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e5f3ea]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1b6b36" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <h2 className="text-xl font-semibold text-ink">Request sent</h2>
          </div>
          <dl className="space-y-3.5">
            <div className="space-y-0.5">
              <dt className="text-[13px] text-muted">Reference number</dt>
              <dd className="text-xl font-semibold tabular-nums tracking-wide text-ink">{state.reference}</dd>
            </div>
            <div className="space-y-0.5">
              <dt className="text-[13px] text-muted">Sent to</dt>
              <dd className="text-base font-semibold text-ink">{state.department}</dd>
            </div>
          </dl>
          <p className="border-t border-line-soft pt-4 text-sm leading-5 text-ink-2">
            The {state.department} team will reply here in Relay. Keep the reference number if you call the office.
          </p>
        </section>
        <div className="flex flex-col gap-2.5">
          <Link href="/staff/requests" className="flex h-12 items-center justify-center rounded-md bg-brand text-base font-semibold text-white hover:bg-brand-dark">
            View my requests
          </Link>
          <Link href="/staff" className="flex h-12 items-center justify-center rounded-md border border-field bg-white text-base font-medium text-ink">
            Send another request
          </Link>
        </div>
      </div>
    );
  }

  const hasError = state.status === "error";

  return (
    <form action={formAction} className="space-y-[18px] rounded-[10px] border border-line bg-white px-4 py-5">
      <div className="space-y-1.5">
        <label htmlFor="subject" className="block text-sm font-medium text-ink">
          Subject
        </label>
        <input id="subject" name="subject" type="text" placeholder="e.g. Fuel card declined at the pump" className={`${fieldClass} h-12`} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="block text-sm font-medium text-ink">
          What do you need help with?
        </label>
        <textarea
          id="description"
          name="description"
          rows={6}
          placeholder="Describe what happened and add any details that will help."
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? "form-error" : undefined}
          className={`${fieldClass} py-2.5 leading-[22px] ${hasError ? "border-2 border-[#a4231a]" : ""}`}
        />
        {hasError && (
          <p id="form-error" role="alert" className="flex items-start gap-1.5 text-sm leading-5 text-[#a4231a]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5" />
              <path d="M12 16.5v.5" />
            </svg>
            <span>{state.message}</span>
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="depot" className="block text-sm font-medium text-ink">
          Your depot
        </label>
        <select id="depot" name="depot" defaultValue="City Deep depot" className={`${fieldClass} h-12`}>
          <option>Head Office</option>
          <option>City Deep depot</option>
          <option>Pomona depot</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="h-12 w-full rounded-md bg-brand text-base font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {isPending ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}
