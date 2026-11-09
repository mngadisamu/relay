"use client";

import { useState, useTransition } from "react";
import { bringBack, removePerson, type PeopleFormState } from "./actions";

// "Remove from Relay", with a confirmation step on the page itself (no browser
// pop-up), and "Bring back" for someone who was removed (S2-35).
export function RemoveButton({ userId, name, removed }: { userId: string; name: string; removed: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<PeopleFormState>({});
  const [pending, startTransition] = useTransition();

  const run = (fn: (id: string) => Promise<PeopleFormState>) =>
    startTransition(async () => {
      setResult(await fn(userId));
      setConfirming(false);
    });

  const message = result.error ? (
    <p role="alert" className="text-[13px] text-[#a4231a]">
      {result.error}
    </p>
  ) : result.done ? (
    <p role="status" className="text-[13px] text-[#1b6b36]">
      {result.done}
    </p>
  ) : null;

  if (removed) {
    return (
      <div className="space-y-1.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(bringBack)}
          className="h-11 rounded-md border border-field bg-white px-4 text-sm font-semibold text-ink hover:bg-page disabled:opacity-60"
        >
          {pending ? "Bringing back…" : "Bring back"}
        </button>
        {message}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {confirming ? (
        <div className="space-y-2 rounded-md border border-[#f0c8c3] bg-[#fdf1ef] p-3">
          <p className="text-sm text-ink">
            Remove <span className="font-semibold">{name}</span> from Relay? They won&apos;t be able to sign in, and
            tickets they took but haven&apos;t answered go back to the inbox. Their history stays, and you can bring
            them back later.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(removePerson)}
              className="h-10 rounded-md bg-[#b42318] px-4 text-sm font-semibold text-white hover:bg-[#8f1f15] disabled:opacity-60"
            >
              {pending ? "Removing…" : "Yes, remove"}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="h-10 rounded-md px-3 text-sm font-medium text-brand hover:text-brand-dark">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-sm font-medium text-[#a4231a] underline underline-offset-4 hover:text-[#8f1f15]"
        >
          Remove from Relay
        </button>
      )}
      {message}
    </div>
  );
}
