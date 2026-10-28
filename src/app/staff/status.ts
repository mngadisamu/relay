// Status shown in words AND colour, never colour alone (WCAG 2.1 AA).
export type TicketStatus = "received" | "assigned" | "answered" | "closed";

export const STATUS_LABEL: Record<TicketStatus, string> = {
  received: "Received",
  assigned: "Assigned",
  answered: "Answered",
  closed: "Closed",
};

export const STATUS_STYLE: Record<TicketStatus, string> = {
  received: "bg-gray-100 text-gray-800",
  assigned: "bg-blue-50 text-blue-800",
  answered: "bg-green-50 text-green-800",
  closed: "bg-gray-200 text-gray-800",
};

export function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}
