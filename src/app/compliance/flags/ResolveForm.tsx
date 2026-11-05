"use client";

import { useActionState } from "react";
import { resolveFlag, type FlagFormState } from "@/lib/flag-actions";

// Resolve a flag (S2-26): what compliance found, and a note explaining it.
// resolve_flag() (migration 0011) saves it and writes a flag_resolve audit entry.
export function ResolveForm({ flagId }: { flagId: number }) {
  const [state, action, pending] = useActionState<FlagFormState, FormData>(resolveFlag.bind(null, flagId), {});
  const noteId = `resolve-note-${flagId}`;

  return (
    <form action={action} className="space-y-3 border-t border-line-soft pt-3">
      <fieldset className="space-y-1.5">
        <legend className="text-[13px] font-medium text-ink-2">What did you find?</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <label className="flex min-h-9 items-center gap-2 text-sm text-ink">
            <input type="radio" name="outcome" value="ok" className="h-4 w-4 accent-brand" />
            No change needed
          </label>
          <label className="flex min-h-9 items-center gap-2 text-sm text-ink">
            <input type="radio" name="outcome" value="needs_change" className="h-4 w-4 accent-brand" />
            Needs a change
          </label>
        </div>
      </fieldset>
      <div className="space-y-1.5">
        <label htmlFor={noteId} className="block text-[13px] font-medium text-ink-2">
          Note
        </label>
        <textarea
          id={noteId}
          name="note"
          rows={2}
          className="w-full rounded-md border border-field px-3 py-2 text-sm text-ink focus:outline-2 focus:outline-brand"
          placeholder="e.g. The date is right: it's in the leave policy. Or: asked the agent to send a correction."
        />
      </div>
      {state.error && (
        <p role="alert" className="text-[13px] text-[#a4231a]">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Saving…" : "Resolve"}
      </button>
    </form>
  );
}
