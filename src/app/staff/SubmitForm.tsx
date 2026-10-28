"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitRequest, type SubmitState } from "./actions";

const initialState: SubmitState = { status: "idle" };

const fieldClass =
  "w-full rounded-md border border-gray-400 bg-white px-3 py-3 text-base text-gray-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700";

// Submit form (S1-22): phone first, three fields, works at 360 px without zooming.
export function SubmitForm() {
  const [state, formAction, isPending] = useActionState(submitRequest, initialState);

  if (state.status === "sent") {
    return (
      <section role="status" className="space-y-5 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-xl font-semibold text-gray-900">Request sent</h2>
        <dl className="space-y-3">
          <div>
            <dt className="text-sm text-gray-600">Reference number</dt>
            <dd className="text-xl font-semibold tabular-nums text-gray-900">{state.reference}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-600">Sent to</dt>
            <dd className="text-base font-semibold text-gray-900">{state.department}</dd>
          </div>
        </dl>
        <p className="border-t border-gray-100 pt-4 text-sm text-gray-700">
          The {state.department} team will reply here in Relay. Keep the reference number if you call the office.
        </p>
        <div className="flex flex-col gap-3">
          <Link href="/staff/requests" className="rounded-md bg-blue-700 py-3 text-center text-base font-semibold text-white">
            View my requests
          </Link>
          <Link href="/staff" className="rounded-md border border-gray-400 py-3 text-center text-base font-medium text-gray-900">
            Send another request
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form action={formAction} className="space-y-5 rounded-xl border border-gray-200 bg-white p-5">
      <div className="space-y-1.5">
        <label htmlFor="subject" className="block text-sm font-medium text-gray-900">
          Subject
        </label>
        <input id="subject" name="subject" type="text" placeholder="e.g. Fuel card declined at the pump" className={fieldClass} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="block text-sm font-medium text-gray-900">
          What do you need help with?
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          placeholder="Describe what happened and add any details that will help."
          aria-describedby={state.status === "error" ? "form-error" : undefined}
          className={fieldClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="depot" className="block text-sm font-medium text-gray-900">
          Your depot
        </label>
        <select id="depot" name="depot" defaultValue="City Deep depot" className={fieldClass}>
          <option>Head Office</option>
          <option>City Deep depot</option>
          <option>Pomona depot</option>
        </select>
      </div>

      {state.status === "error" && (
        <p id="form-error" role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-blue-700 py-3 text-base font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
      >
        {isPending ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}
