"use client";

import { useActionState, useState, useTransition } from "react";
import { sendReset, updateDetails, type PeopleFormState } from "./actions";
import { FieldError, fieldClass } from "./RoleFields";

const DEPOTS = ["Head Office", "City Deep depot", "Pomona depot"];

// "Edit details" (name, email, depot) and "Send password reset" for one person
// on Manage users (S2-36).
export function PersonTools({
  userId,
  fullName,
  email,
  depot,
  isMe,
}: {
  userId: string;
  fullName: string;
  email: string;
  depot: string | null;
  isMe: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<PeopleFormState, FormData>(updateDetails.bind(null, userId, email), {});
  const [reset, setReset] = useState<PeopleFormState>({});
  const [sending, startSending] = useTransition();
  const id = `details-${userId.slice(0, 8)}`;
  const e = state.fieldErrors ?? {};
  const v = state.values;

  const link = "text-sm font-medium text-brand underline-offset-4 hover:text-brand-dark hover:underline";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <button type="button" onClick={() => setEditing((o) => !o)} aria-expanded={editing} className={link}>
          {editing ? "Close details" : "Edit details"}
        </button>
        {!isMe && (
          <button
            type="button"
            disabled={sending}
            onClick={() => startSending(async () => setReset(await sendReset(userId)))}
            className={`${link} disabled:opacity-60`}
          >
            {sending ? "Sending…" : "Send password reset"}
          </button>
        )}
      </div>

      {reset.error && (
        <p role="alert" className="text-[13px] text-[#a4231a]">
          {reset.error}
        </p>
      )}
      {reset.done && (
        <p role="status" className="text-[13px] text-[#1b6b36]">
          {reset.done}
        </p>
      )}

      {editing && (
        <form key={state.stamp ?? 0} action={action} noValidate className="grid gap-3 rounded-md border border-line bg-page p-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor={`${id}-name`} className="block text-[13px] font-medium text-ink-2">
              Full name
            </label>
            <input
              id={`${id}-name`}
              name="fullName"
              defaultValue={v?.fullName ?? fullName}
              aria-invalid={e.fullName ? true : undefined}
              aria-describedby={e.fullName ? `${id}-name-error` : undefined}
              className={fieldClass}
            />
            <FieldError id={`${id}-name-error`} message={e.fullName} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${id}-email`} className="block text-[13px] font-medium text-ink-2">
              Work email
            </label>
            <input
              id={`${id}-email`}
              name="email"
              type="email"
              defaultValue={v?.email ?? email}
              aria-invalid={e.email ? true : undefined}
              aria-describedby={e.email ? `${id}-email-error` : undefined}
              className={fieldClass}
            />
            <FieldError id={`${id}-email-error`} message={e.email} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${id}-depot`} className="block text-[13px] font-medium text-ink-2">
              Depot
            </label>
            <select id={`${id}-depot`} name="depot" defaultValue={v?.depot ?? depot ?? ""} className={fieldClass}>
              <option value="">Not set</option>
              {DEPOTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <FieldError id={`${id}-depot-error`} message={e.depot} />
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
            <button
              type="submit"
              disabled={pending}
              className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save details"}
            </button>
            <p className="text-[13px] text-muted">A new email is their new sign-in. Their password stays the same.</p>
          </div>
          {state.error && (
            <p role="alert" className="text-[13px] text-[#a4231a] sm:col-span-3">
              {state.error}
            </p>
          )}
          {state.done && (
            <p role="status" className="text-[13px] text-[#1b6b36] sm:col-span-3">
              {state.done}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
