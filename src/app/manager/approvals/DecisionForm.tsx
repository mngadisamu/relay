"use client";

import { useActionState } from "react";
import { decideApproval, type DecideState } from "./actions";

// Approve or decline with a note (S4-09). Declining needs a reason; approving may have one.
// Each button sends its own decision, so both use the same form and the same action.
export function DecisionForm({ approvalId }: { approvalId: number }) {
  const [state, action, pending] = useActionState<DecideState, FormData>(decideApproval, {});
  const noteId = `note-${approvalId}`;

  return (
    <form action={action} noValidate className="space-y-3">
      <input type="hidden" name="approval_id" value={approvalId} />
      <div className="space-y-1.5">
        <label htmlFor={noteId} className="block text-[13px] font-medium text-ink-2">
          Note (needed to decline)
        </label>
        <textarea
          id={noteId}
          name="note"
          rows={2}
          className="w-full rounded-md border border-field bg-white p-2.5 text-sm text-ink"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          name="decision"
          value="approved"
          disabled={pending}
          className="h-11 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          Approve
        </button>
        <button
          type="submit"
          name="decision"
          value="rejected"
          disabled={pending}
          className="h-11 rounded-md border border-field bg-white px-4 text-sm font-semibold text-ink hover:bg-page disabled:opacity-60"
        >
          Decline
        </button>
      </div>
      {state.error && (
        <p role="alert" className="text-[13px] text-[#a4231a]">
          {state.error}
        </p>
      )}
      {state.done && (
        <p role="status" className="text-[13px] text-[#1b6b36]">
          {state.done}
        </p>
      )}
    </form>
  );
}
