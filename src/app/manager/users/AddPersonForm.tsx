"use client";

import { useActionState } from "react";
import { addPerson, type PeopleFormState } from "./actions";
import { FieldError, RoleFields, fieldClass } from "./RoleFields";

// "Add a person" (S2-25): name, email, role and department, then an invite email.
export function AddPersonForm({ myDepartment }: { myDepartment: string | null }) {
  const [state, action, pending] = useActionState<PeopleFormState, FormData>(addPerson, {});
  const e = state.fieldErrors ?? {};

  return (
    <section aria-labelledby="add-heading" className="space-y-3 rounded-[10px] border border-line bg-white p-4">
      <h2 id="add-heading" className="text-lg font-semibold text-ink">
        Add a person
      </h2>
      {/* key: redraw the form after each try: empty once someone is added, with what was typed after an error */}
      <form key={state.stamp ?? 0} action={action} noValidate className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1.4fr_1fr_1fr]">
        <div className="space-y-1.5">
          <label htmlFor="add-name" className="block text-[13px] font-medium text-ink-2">
            Full name
          </label>
          <input
            id="add-name"
            name="fullName"
            defaultValue={state.values?.fullName}
            autoComplete="off"
            aria-invalid={e.fullName ? true : undefined}
            aria-describedby={e.fullName ? "add-name-error" : undefined}
            className={fieldClass}
          />
          <FieldError id="add-name-error" message={e.fullName} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="add-email" className="block text-[13px] font-medium text-ink-2">
            Work email
          </label>
          <input
            id="add-email"
            name="email"
            type="email"
            defaultValue={state.values?.email}
            autoComplete="off"
            aria-invalid={e.email ? true : undefined}
            aria-describedby={e.email ? "add-email-error" : undefined}
            className={fieldClass}
          />
          <FieldError id="add-email-error" message={e.email} />
        </div>
        <RoleFields idPrefix="add" role={state.values?.role} department={state.values ? state.values.department : myDepartment} errors={e} />
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
          <button
            type="submit"
            disabled={pending}
            className="h-11 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {pending ? "Sending invite…" : "Add and send invite"}
          </button>
          <p className="text-[13px] text-muted">Agents need a department. Staff and compliance don&apos;t have one.</p>
        </div>
      </form>
      {state.error && (
        <p role="alert" className="rounded-md bg-[#fdecea] px-3 py-2.5 text-sm text-[#a4231a]">
          {state.error}
        </p>
      )}
      {state.done && (
        <p role="status" className="rounded-md bg-[#e5f3ea] px-3 py-2.5 text-sm font-medium text-[#1b6b36]">
          {state.done}
        </p>
      )}
    </section>
  );
}
