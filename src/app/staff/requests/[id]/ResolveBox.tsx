"use client";

import { useActionState, useState } from "react";
import { confirmSolved, stillNeedHelp, type ResolveState } from "./actions";

const empty: ResolveState = {};

// Shown under the reply while the request is Answered (S2-20):
// "This solved it" closes it; "I still need help" sends a message back to the team.
export function ResolveBox({ ticketId, team }: { ticketId: number; team: string }) {
  const [asking, setAsking] = useState(false);
  const [closeState, closeAction, isClosing] = useActionState(confirmSolved.bind(null, ticketId), empty);
  const [helpState, helpAction, isSending] = useActionState(stillNeedHelp.bind(null, ticketId), empty);
  const busy = isClosing || isSending;

  return (
    <section aria-labelledby="resolve-heading" className="space-y-3 rounded-[10px] border border-line bg-white px-4 py-[18px]">
      <h2 id="resolve-heading" className="text-base font-semibold text-ink">
        Did this sort it out?
      </h2>

      {(closeState.error || helpState.error) && (
        <p role="alert" className="rounded-md border border-[#f0c8c3] bg-[#fdf1ef] px-3 py-2.5 text-sm text-[#a4231a]">
          {closeState.error ?? helpState.error}
        </p>
      )}

      {!asking ? (
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <form action={closeAction} className="sm:flex-1">
            <button
              type="submit"
              disabled={busy}
              className="h-12 w-full rounded-md bg-brand text-base font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {isClosing ? "Closing…" : "This solved it"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setAsking(true)}
            disabled={busy}
            className="h-12 rounded-md border border-field bg-white px-4 text-base font-medium text-ink hover:bg-page disabled:opacity-60 sm:flex-1"
          >
            I still need help
          </button>
        </div>
      ) : (
        <form action={helpAction} noValidate className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="message" className="block text-sm font-medium text-ink">
              What still isn&apos;t working?
            </label>
            <textarea
              id="message"
              name="message"
              rows={4}
              defaultValue={helpState.message}
              aria-invalid={helpState.messageError ? true : undefined}
              aria-describedby={helpState.messageError ? "message-error" : "message-hint"}
              className={`w-full rounded-md bg-white px-3 py-2.5 text-base leading-[22px] text-ink focus:outline-2 focus:outline-brand ${
                helpState.messageError ? "border-2 border-[#a4231a]" : "border border-field focus:border-brand"
              }`}
            />
            {helpState.messageError ? (
              <p id="message-error" role="alert" className="text-sm text-[#a4231a]">
                {helpState.messageError}
              </p>
            ) : (
              <p id="message-hint" className="text-sm text-muted">
                Your request goes back to the {team} team with this message.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <button
              type="submit"
              disabled={busy}
              className="h-12 rounded-md bg-brand px-5 text-base font-semibold text-white hover:bg-brand-dark disabled:opacity-60 sm:flex-1"
            >
              {isSending ? "Sending…" : "Send to the team"}
            </button>
            <button
              type="button"
              onClick={() => setAsking(false)}
              disabled={busy}
              className="h-12 rounded-md px-4 text-base font-medium text-brand hover:text-brand-dark sm:flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
