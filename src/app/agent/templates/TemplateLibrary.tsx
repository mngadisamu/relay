"use client";

import { useState } from "react";
import { departmentTemplates } from "@/lib/templates";

// Department name → list of template texts.
type TemplateLibraryData = Record<string, string[]>;

const DEPARTMENTS = ["HR", "IT", "Finance", "Operations"];

// Template library (S1-27, mockup screen 8): department tabs, a list of templates,
// and an editor. Agents edit only their own department's templates (managers: all).
// Still to do for S1-27: save edits to the templates table so the next AI draft uses them.
export default function TemplateLibrary({ myDepartment }: { myDepartment: string | null }) {
  const [templates, setTemplates] = useState<TemplateLibraryData>(departmentTemplates as TemplateLibraryData);
  const [dept, setDept] = useState(myDepartment && DEPARTMENTS.includes(myDepartment) ? myDepartment : "HR");
  const [index, setIndex] = useState(0);
  const [message, setMessage] = useState("");

  const list = templates[dept] ?? [];
  const current = list[index] ?? "";
  const canEdit = myDepartment === null || myDepartment === dept;

  function pickDept(d: string) {
    setDept(d);
    setIndex(0);
    setMessage("");
  }

  function update(value: string) {
    setTemplates((prev) => {
      const updated = [...(prev[dept] ?? [])];
      updated[index] = value;
      return { ...prev, [dept]: updated };
    });
  }

  function save() {
    // Honest message until saving to the database is built.
    setMessage("Changes are kept on this screen only for now. Saving to the database is still to come (S1-27).");
  }

  return (
    <main className="mx-auto max-w-[1360px] space-y-[18px] px-6 pb-12 pt-7">
      <div className="space-y-1">
        <h1 className="text-[22px] font-semibold text-ink">Reply templates</h1>
        <p className="text-sm text-muted">The AI starts every draft from one of these. Words in [brackets] are filled in from the ticket.</p>
      </div>

      <div role="tablist" aria-label="Department" className="flex flex-wrap border-b border-line">
        {DEPARTMENTS.map((d) => (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={d === dept}
            onClick={() => pickDept(d)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm ${
              d === dept ? "border-brand font-semibold text-brand-dark" : "border-transparent font-medium text-ink-2 hover:text-ink"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <ul className="flex min-w-0 flex-[1_1_260px] flex-col gap-0.5 rounded-[10px] border border-line bg-white p-1.5">
          {list.map((text, i) => (
            <li key={`${dept}-${i}`}>
              <button
                type="button"
                aria-current={i === index || undefined}
                onClick={() => {
                  setIndex(i);
                  setMessage("");
                }}
                className={`flex w-full flex-col gap-0.5 rounded-md px-3 py-2.5 text-left ${i === index ? "bg-brand-soft" : "hover:bg-page"}`}
              >
                <span className="text-sm font-semibold text-ink">Template {i + 1}</span>
                <span className="line-clamp-1 text-xs text-muted">{text}</span>
              </button>
            </li>
          ))}
        </ul>

        <section className="flex min-w-0 flex-[999_1_560px] flex-col gap-4 rounded-[10px] border border-line bg-white p-5">
          {!canEdit && (
            <p role="note" className="flex items-start gap-2 rounded-md border border-line bg-page px-3 py-2.5 text-sm leading-5 text-ink-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              <span>View only. {dept} templates are edited by {dept} agents.</span>
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="template-body" className="text-[13px] font-medium text-ink-2">
              Template text
            </label>
            <textarea
              id="template-body"
              rows={12}
              value={current}
              readOnly={!canEdit}
              onChange={(e) => update(e.target.value)}
              className={`w-full resize-y rounded-md border border-field px-3.5 py-3 text-[15px] leading-[23px] text-ink ${canEdit ? "bg-white" : "bg-[#f8f9fb]"}`}
            />
          </div>
          {message && (
            <p role="status" className="rounded-md border border-[#f3dfa6] bg-[#fff8e6] px-3 py-2.5 text-sm text-[#7a4d00]">
              {message}
            </p>
          )}
          {canEdit && (
            <div className="flex justify-end">
              <button type="button" onClick={save} className="h-[42px] rounded-md bg-brand px-5 text-[15px] font-semibold text-white hover:bg-brand-dark">
                Save changes
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
