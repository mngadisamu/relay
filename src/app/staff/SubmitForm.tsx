"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitRequest, type Field, type SubmitState } from "./actions";

const initialState: SubmitState = { status: "idle" };

// 48 px tall fields and 16 px text, so phones don't zoom in (S1-22: 360 px without zooming).
// Only one border colour is ever in the class list: when two compete, the red one can lose.
function fieldClass(invalid: boolean) {
  const border = invalid ? "border-2 border-[#a4231a]" : "border border-field focus:border-brand";
  return `w-full rounded-md bg-white px-3 text-base text-ink focus:outline-2 focus:outline-brand ${border}`;
}

// The error under a field: an icon plus words, so it doesn't rely on colour alone (WCAG AA).
function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-sm leading-5 text-[#a4231a]">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5" />
        <path d="M12 16.5v.5" />
      </svg>
      <span>{message}</span>
    </p>
  );
}

// Submit form (S1-22, mockup screen 2) and the "Request sent" view (mockup screen 3).
// "Send another request" used to link to /staff, the page you're already on, so
// nothing changed. Giving the form a new key starts it again, empty.
export function SubmitForm() {
  const [formKey, setFormKey] = useState(0);
  return <RequestForm key={formKey} onSendAnother={() => setFormKey((k) => k + 1)} />;
}

function RequestForm({ onSendAnother }: { onSendAnother: () => void }) {
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
            <div className="space-y-0.5">
              <dt className="text-[13px] text-muted">Subject</dt>
              <dd className="text-[15px] text-ink">{state.subject}</dd>
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
          <button
            type="button"
            onClick={onSendAnother}
            className="flex h-12 items-center justify-center rounded-md border border-field bg-white text-base font-medium text-ink hover:bg-page"
          >
            Send another request
          </button>
        </div>
      </div>
    );
  }

  const errors = state.status === "error" ? state.fieldErrors : {};
  const formMessage = state.status === "error" ? state.message : undefined;
  // After a submit, React empties the form. Putting back what was typed means a
  // missing field doesn't cost the person everything else they wrote.
  const values = state.status === "error" ? state.values : undefined;

  // Props that link a field to its error, for screen readers and the red border.
  const errorProps = (field: Field) =>
    errors[field] ? { "aria-invalid": true, "aria-describedby": `${field}-error` } : {};

  return (
    <form action={formAction} noValidate className="space-y-[18px] rounded-[10px] border border-line bg-white px-4 py-5">
      {formMessage && (
        <p role="alert" className="rounded-md border border-[#f0c8c3] bg-[#fdf1ef] px-3 py-2.5 text-sm leading-5 text-[#a4231a]">
          {formMessage}
        </p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="subject" className="block text-sm font-medium text-ink">
          Subject
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          defaultValue={values?.subject}
          placeholder="e.g. Fuel card declined at the pump"
          className={`${fieldClass(!!errors.subject)} h-12`}
          {...errorProps("subject")}
        />
        <FieldError id="subject-error" message={errors.subject} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="block text-sm font-medium text-ink">
          What do you need help with?
        </label>
        <textarea
          id="description"
          name="description"
          rows={6}
          defaultValue={values?.description}
          placeholder="Describe what happened and add any details that will help."
          className={`${fieldClass(!!errors.description)} py-2.5 leading-[22px]`}
          {...errorProps("description")}
        />
        <FieldError id="description-error" message={errors.description} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="depot" className="block text-sm font-medium text-ink">
          Your depot
        </label>
        <select
          id="depot"
          name="depot"
          defaultValue={values?.depot || "City Deep depot"}
          className={`${fieldClass(!!errors.depot)} h-12`}
          {...errorProps("depot")}
        >
          <option>Head Office</option>
          <option>City Deep depot</option>
          <option>Pomona depot</option>
        </select>
        <FieldError id="depot-error" message={errors.depot} />
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
