"use client";

import { useActionState, useState } from "react";
import { flagReply, type FlagFormState } from "@/lib/flag-actions";
import { FLAG_LABEL, type Flag, type FlagKind } from "@/lib/flags";

// Red-brown tag for a flagged reply (S2-26), e.g. "⚑ Sent without edits".
// Shown in text, with an icon, not by colour alone.
export function FlagTag({ kind, resolved = false }: { kind: FlagKind; resolved?: boolean }) {
  return (
    <span
      className={`inline-flex h-[22px] items-center gap-1 rounded px-2 text-xs font-semibold ${
        resolved ? "bg-[#eceef1] text-[#3d4651]" : "bg-[#fdecea] text-[#8f1f15]"
      }`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 21V4" />
        <path d="M5 4h11l-2 4 2 4H5" />
      </svg>
      {FLAG_LABEL[kind]}
      {resolved && " · reviewed"}
    </span>
  );
}

// The flags on one sent reply, and a Flag button that asks why (S2-26).
// Used under the sent reply on the agent's ticket view and on Flagged replies.
export function FlagReply({ responseId, flags, idPrefix = "flag" }: { responseId: number; flags: Flag[]; idPrefix?: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FlagFormState, FormData>(flagReply.bind(null, responseId), {});
  const fieldId = `${idPrefix}-reason-${responseId}`;

  return (
    <div className="space-y-2">
      {flags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Flags on this reply">
          {flags.map((f) => (
            <li key={f.id}>
              <FlagTag kind={f.kind} resolved={Boolean(f.resolved_at)} />
            </li>
          ))}
        </ul>
      )}

      {state.done ? (
        <p role="status" className="text-[13px] text-[#1b6b36]">
          Flagged. Compliance will review it on Flagged replies.
        </p>
      ) : open ? (
        <form action={action} className="space-y-2 rounded-md border border-line bg-white p-3">
          <label htmlFor={fieldId} className="block text-[13px] font-medium text-ink-2">
            Why does this reply need a second look?
          </label>
          <textarea
            id={fieldId}
            name="reason"
            rows={2}
            className="w-full rounded-md border border-field px-3 py-2 text-sm text-ink focus:outline-2 focus:outline-brand"
            placeholder="e.g. It promises a refund date we can't confirm"
          />
          {state.error && (
            <p role="alert" className="text-[13px] text-[#a4231a]">
              {state.error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="h-9 rounded-md bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {pending ? "Flagging…" : "Flag reply"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-md px-3 text-sm font-medium text-brand hover:text-brand-dark">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink-2 hover:border-field"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 21V4" />
            <path d="M5 4h11l-2 4 2 4H5" />
          </svg>
          Flag
        </button>
      )}
    </div>
  );
}
