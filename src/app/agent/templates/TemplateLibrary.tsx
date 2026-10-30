"use client";

import { useState, useTransition } from "react";
import type { ReplyTemplate } from "@/lib/reply-templates";
import { formatWhen } from "@/app/staff/status";
import { saveTemplate } from "./actions";

const DEPARTMENTS = ["HR", "IT", "Finance", "Operations"];

// Template library (S1-27, mockup screen 8): department tabs, a list of templates,
// and an editor. Agents edit only their own department's templates (managers: all).
// Save writes to the templates table, and the next AI draft starts from the new wording.
export default function TemplateLibrary({
  templates: initial,
  myDepartment,
}: {
  templates: ReplyTemplate[];
  myDepartment: string | null;
}) {
  const [templates, setTemplates] = useState(initial);
  // What's been typed but not saved yet, by position in the list.
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [dept, setDept] = useState(myDepartment && DEPARTMENTS.includes(myDepartment) ? myDepartment : "HR");
  const [selected, setSelected] = useState(() => templates.findIndex((t) => t.department === dept));
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [isSaving, startSaving] = useTransition();

  const list = templates.map((t, i) => ({ ...t, i })).filter((t) => t.department === dept);
  const current = templates[selected];
  const text = edits[selected] ?? current?.body ?? "";
  const unsaved = (i: number) => edits[i] !== undefined && edits[i] !== templates[i].body;
  const canEdit = myDepartment === null || myDepartment === dept;
  const notInDatabase = current && current.id === null;

  function pickDept(d: string) {
    setDept(d);
    setSelected(templates.findIndex((t) => t.department === d));
    setMessage(null);
  }

  function save() {
    if (!current?.id) return;
    const id = current.id;
    const index = selected;
    setMessage(null);
    startSaving(async () => {
      const result = await saveTemplate({ id, body: text });
      if ("error" in result) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      setTemplates((prev) => prev.map((t, i) => (i === index ? { ...t, body: text.trim(), updated_at: result.updatedAt } : t)));
      setEdits((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      setMessage({ kind: "ok", text: `Saved. The next ${current.name.toLowerCase()} AI draft for ${current.department} starts from this wording.` });
    });
  }

  return (
    <main className="mx-auto max-w-[1360px] space-y-[18px] px-4 pb-12 pt-7 sm:px-6">
      <div className="space-y-1">
        <h1 className="text-[22px] font-semibold text-ink">Reply templates</h1>
        <p className="text-sm text-muted">
          The AI starts every draft from the template that matches the tone the agent picks. [Staff Name] and [Subject] are filled in from the ticket.
        </p>
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
          {list.map((t) => (
            <li key={`${t.department}-${t.name}`}>
              <button
                type="button"
                aria-current={t.i === selected || undefined}
                onClick={() => {
                  setSelected(t.i);
                  setMessage(null);
                }}
                className={`flex w-full flex-col gap-0.5 rounded-md px-3 py-2.5 text-left ${t.i === selected ? "bg-brand-soft" : "hover:bg-page"}`}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                  {t.name}
                  {unsaved(t.i) && <span className="text-xs font-medium text-[#7a4a00]">· Not saved</span>}
                </span>
                <span className="line-clamp-1 text-xs text-muted">{edits[t.i] ?? t.body}</span>
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
          {canEdit && notInDatabase && (
            <p role="note" className="rounded-md border border-[#f3dfa6] bg-[#fff8e6] px-3 py-2.5 text-sm text-[#7a4d00]">
              These are the built-in templates. They can be saved once supabase/seed/templates.sql has been run in Supabase.
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label htmlFor="template-body" className="text-[13px] font-medium text-ink-2">
                {current ? `${current.department} · ${current.name}` : "Template"} text
              </label>
              {current?.updated_at && (
                <span className="text-xs text-muted">
                  Last saved <time dateTime={current.updated_at}>{formatWhen(current.updated_at)}</time>
                </span>
              )}
            </div>
            <textarea
              id="template-body"
              rows={12}
              value={text}
              readOnly={!canEdit}
              onChange={(e) => {
                setEdits((prev) => ({ ...prev, [selected]: e.target.value }));
                setMessage(null);
              }}
              className={`w-full resize-y rounded-md border border-field px-3.5 py-3 text-[15px] leading-[23px] text-ink ${canEdit ? "bg-white" : "bg-[#f8f9fb]"}`}
            />
          </div>

          {message && (
            <p
              role={message.kind === "error" ? "alert" : "status"}
              className={`rounded-md px-3 py-2.5 text-sm ${message.kind === "error" ? "bg-[#fdecea] text-[#a4231a]" : "bg-[#e5f3ea] text-[#1b6b36]"}`}
            >
              {message.text}
            </p>
          )}

          {canEdit && (
            <div className="flex flex-wrap items-center justify-end gap-3">
              {unsaved(selected) && <span className="text-sm text-[#7a4a00]">You have unsaved changes</span>}
              <button
                type="button"
                onClick={save}
                disabled={isSaving || notInDatabase || !unsaved(selected)}
                className="h-[42px] rounded-md bg-brand px-5 text-[15px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
              >
                {isSaving ? "Saving…" : "Save changes"}
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
