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

export function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}
