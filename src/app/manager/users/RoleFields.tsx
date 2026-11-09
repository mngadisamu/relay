// The Role and Department fields, shared by "Add a person" and each row in the
// list. Errors show under the field they belong to.

export const ROLE_LABEL: Record<string, string> = {
  staff: "Staff",
  agent: "Agent",
  manager: "Manager",
  compliance: "Compliance",
};
const DEPARTMENTS = ["HR", "IT", "Finance", "Operations"];

export const fieldClass =
  "h-11 w-full rounded-md border border-field bg-white px-3 text-sm text-ink focus:outline-2 focus:outline-brand aria-[invalid=true]:border-[#b42318]";

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-[13px] text-[#a4231a]">
      {message}
    </p>
  );
}

export function RoleFields({
  idPrefix,
  role,
  department,
  errors,
}: {
  idPrefix: string;
  role?: string;
  department?: string | null;
  errors?: { role?: string; department?: string };
}) {
  return (
    <>
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-role`} className="block text-[13px] font-medium text-ink-2">
          Role
        </label>
        <select
          id={`${idPrefix}-role`}
          name="role"
          defaultValue={role ?? ""}
          aria-invalid={errors?.role ? true : undefined}
          aria-describedby={errors?.role ? `${idPrefix}-role-error` : undefined}
          className={fieldClass}
        >
          <option value="" disabled>
            Choose…
          </option>
          {Object.entries(ROLE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <FieldError id={`${idPrefix}-role-error`} message={errors?.role} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-department`} className="block text-[13px] font-medium text-ink-2">
          Department
        </label>
        <select
          id={`${idPrefix}-department`}
          name="department"
          defaultValue={department ?? ""}
          aria-invalid={errors?.department ? true : undefined}
          aria-describedby={errors?.department ? `${idPrefix}-department-error` : undefined}
          className={fieldClass}
        >
          <option value="">No department</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <FieldError id={`${idPrefix}-department-error`} message={errors?.department} />
      </div>
    </>
  );
}
