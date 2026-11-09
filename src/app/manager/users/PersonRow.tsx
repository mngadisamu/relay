"use client";

import { useActionState } from "react";
import { changeRole, type PeopleFormState } from "./actions";
import { ROLE_LABEL, RoleFields } from "./RoleFields";
import { RemoveButton } from "./RemoveButton";
import { PersonTools } from "./PersonTools";

export type Person = {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  department: string | null;
  created_at: string;
  active: boolean; // false once removed from Relay (S2-35)
  deactivated_at: string | null;
  depot?: string | null; // from profiles (S2-36)
};

const leftOn = (iso: string) =>
  new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Johannesburg" });

// One person in the list, with their role and department to change (S2-25).
export function PersonRow({ person, isMe }: { person: Person; isMe: boolean }) {
  const name = person.full_name || person.email;
  const [state, action, pending] = useActionState<PeopleFormState, FormData>(changeRole.bind(null, person.id), {});
  const idPrefix = `person-${person.id.slice(0, 8)}`;

  return (
    <li className="grid gap-3 px-4 py-3.5 md:grid-cols-[1.4fr_2fr] md:items-start">
      <div className="min-w-0">
        <p className="font-medium text-ink">{name}</p>
        <p className="truncate text-sm text-ink-2">{person.email}</p>
        <p className="text-[13px] text-muted">
          {ROLE_LABEL[person.role] ?? person.role}
          {person.department ? ` · ${person.department}` : ""}
          {person.depot ? ` · ${person.depot}` : ""}
          {!person.active && person.deactivated_at ? ` · left ${leftOn(person.deactivated_at)}` : ""}
        </p>
        {person.active && (
          <div className="pt-2">
            <PersonTools userId={person.id} fullName={person.full_name ?? ""} email={person.email} depot={person.depot ?? null} isMe={isMe} />
          </div>
        )}
      </div>
      {!person.active ? (
        <div className="md:pt-1">
          <RemoveButton userId={person.id} name={name} removed />
        </div>
      ) : isMe ? (
        <p className="text-sm text-muted md:pt-2">This is you. Another manager can change your role.</p>
      ) : (
        <form key={state.stamp ?? 0} action={action} noValidate className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
          <RoleFields
            idPrefix={idPrefix}
            role={state.values?.role ?? person.role}
            department={state.values ? state.values.department : person.department}
            errors={state.fieldErrors}
          />
          <div className="space-y-1.5 sm:pt-[26px]">
            <button
              type="submit"
              disabled={pending}
              className="h-11 w-full rounded-md border border-field bg-white px-4 text-sm font-semibold text-ink hover:bg-page disabled:opacity-60 sm:w-auto"
            >
              {pending ? "Saving…" : "Save"}
            </button>
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
          <div className="sm:col-span-3">
            <RemoveButton userId={person.id} name={name} removed={false} />
          </div>
        </form>
      )}
    </li>
  );
}
