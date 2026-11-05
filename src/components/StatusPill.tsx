import {
  PRIORITY_LABEL,
  PRIORITY_STYLE,
  STATUS_LABEL,
  STATUS_STYLE,
  type TicketPriority,
  type TicketStatus,
} from "@/app/staff/status";

// Round pill with a dot: "● Answered".
export function StatusPill({ status, size = "md" }: { status: TicketStatus; size?: "sm" | "md" }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold ${
        size === "sm" ? "h-[22px] px-2 text-xs" : "h-6 px-2.5 text-[13px]"
      } ${STATUS_STYLE[status]}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}

// Square tag: "Urgent".
export function PriorityTag({ priority }: { priority: TicketPriority }) {
  return (
    <span className={`inline-flex h-[22px] items-center rounded px-2 text-xs font-semibold ${PRIORITY_STYLE[priority]}`}>
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

// Amber tag for low classifier confidence (S1-25).
export function NeedsReviewTag() {
  return (
    <span className="inline-flex h-[22px] items-center gap-1 rounded bg-[#fff3d6] px-2 text-xs font-semibold text-[#7a4d00]">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 4l9 16H3z" />
        <path d="M12 10v4" />
        <path d="M12 17v.5" />
      </svg>
      Needs review
    </span>
  );
}

// Purple tag for a sensitive request (migration 0009), e.g. "Sensitive: conduct".
export function SensitiveTag({ label = "Sensitive" }: { label?: string }) {
  return (
    <span className="inline-flex h-[22px] items-center gap-1 rounded bg-[#f1e8fb] px-2 text-xs font-semibold text-[#5b2a86]">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" />
      </svg>
      {label}
    </span>
  );
}
