// Status shown in words AND colour, never colour alone (WCAG 2.1 AA).
// Colours from the style guide; every pair passes AA contrast.
export type TicketStatus = "received" | "assigned" | "answered" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";

export const STATUS_LABEL: Record<TicketStatus, string> = {
  received: "Received",
  assigned: "Assigned",
  answered: "Answered",
  closed: "Closed",
};

// Background and text colour for each status pill (the dot uses the text colour).
export const STATUS_STYLE: Record<TicketStatus, string> = {
  received: "bg-[#eef0f3] text-[#3d4651]",
  assigned: "bg-[#e7f0fb] text-[#0b4c94]",
  answered: "bg-[#e5f3ea] text-[#1b6b36]",
  closed: "bg-[#ecedef] text-[#4a4f57]",
};

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const PRIORITY_STYLE: Record<TicketPriority, string> = {
  urgent: "bg-[#fdecea] text-[#a4231a]",
  high: "bg-[#fff0e3] text-[#8a3b00]",
  medium: "bg-[#eef0f3] text-[#3d4651]",
  low: "bg-page text-muted",
};

// Relay is used in South Africa, but Vercel's servers run on UTC time. Without a
// time zone every time showed 2 hours behind, so always format in SAST.
const TIME_ZONE = "Africa/Johannesburg";

// The calendar day (e.g. "2026-10-29") of a moment, in Johannesburg.
function dayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date);
}

// "Today, 14:05", "Yesterday, 15:40", "Mon 19 Oct, 09:12", or with the year if it isn't this year.
export function formatWhen(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const time = new Intl.DateTimeFormat("en-ZA", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(date);

  const day = dayKey(date);
  if (day === dayKey(now)) return `Today, ${time}`;
  if (day === dayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000))) return `Yesterday, ${time}`;

  const sameYear = day.slice(0, 4) === dayKey(now).slice(0, 4);
  const datePart = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date);
  return `${datePart.replace(",", "").replace("Sept", "Sep")}, ${time}`;
}
