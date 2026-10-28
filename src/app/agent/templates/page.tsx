"use client";

import { useState } from "react";
import Link from "next/link";
import { departmentTemplates } from "@/lib/templates";

// Department name → list of template texts.
type TemplateLibraryData = Record<string, string[]>;

// Template library (S1-27). Agents view the templates for every department.
// Still to do for S1-27: save edits to the templates table so the next AI draft uses them.
export default function TemplateLibrary() {
  const [templates, setTemplates] = useState<TemplateLibraryData>(
    departmentTemplates as TemplateLibraryData,
  );
  const [message, setMessage] = useState("");

  const handleTemplateChange = (dept: string, index: number, value: string) => {
    setTemplates((prev) => {
      const updated = [...prev[dept]];
      updated[index] = value;
      return { ...prev, [dept]: updated };
    });
  };

  const handleSave = () => {
    // Honest message until saving to the database is built.
    setMessage("Changes are kept on this screen only for now. Saving to the database is still to come (S1-27).");
    setTimeout(() => setMessage(""), 6000);
  };

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <Link href="/agent" className="text-sm font-medium text-blue-700 hover:underline">
        ← Back to inbox
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Template library</h1>
          <p className="text-sm text-gray-600">View and update the reply templates for each department.</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Save changes
        </button>
      </div>

      {message && (
        <p role="status" className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {message}
        </p>
      )}

      <div className="space-y-8">
        {Object.entries(templates).map(([dept, deptTemplates]) => (
          <section key={dept} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="border-b pb-2 text-lg font-bold text-gray-800">{dept}</h2>
            {deptTemplates.map((templateText, index) => {
              const fieldId = `${dept}-template-${index}`;
              return (
                <div key={fieldId} className="space-y-1">
                  <label htmlFor={fieldId} className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Template {index + 1}
                  </label>
                  <textarea
                    id={fieldId}
                    value={templateText}
                    onChange={(e) => handleTemplateChange(dept, index, e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-gray-400 p-3 text-sm"
                  />
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </main>
  );
}