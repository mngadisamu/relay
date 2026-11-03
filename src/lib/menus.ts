import type { MenuItem } from "@/components/RoleHeader";

// The pages in each role's menu (S2-02). Each page's owner sets ready: true
// in the same pull request that adds the page, so the menu never links to a
// page that doesn't exist yet.

export const MANAGER_MENU: MenuItem[] = [
  {
    label: "Tickets",
    href: "/agent",
    description: "Open tickets in your department. Assign them to an agent.",
    ready: true, // Samukelo, S2-16
  },
  {
    label: "Dashboard",
    href: "/manager/dashboard",
    description: "Ticket numbers, reply times and trends by department.",
    ready: false, // Mihlali, S2-14
  },
  {
    label: "Reports",
    href: "/manager/reports",
    description: "Weekly department reports to preview, save and download.",
    ready: false, // Baphakamise, S2-15
  },
  {
    label: "Forecast",
    href: "/manager/forecast",
    description: "Expected tickets for the next four weeks.",
    ready: false, // Elzel, S2-27
  },
  {
    label: "Manage users",
    href: "/manager/users",
    description: "Add staff and agents, and set their role and department.",
    ready: false, // Samukelo, S2-25
  },
];

export const COMPLIANCE_MENU: MenuItem[] = [
  {
    label: "Audit log",
    href: "/compliance/audit",
    description: "Every routing, draft and send decision, with who made it.",
    ready: true, // Samukelo, S2-12
  },
  {
    label: "Flagged replies",
    href: "/compliance/flags",
    description: "AI-drafted replies that need a second look.",
    ready: false, // Samukelo, S2-26
  },
  {
    label: "Risk report",
    href: "/compliance/risk",
    description: "How the AI is performing and where it needs watching.",
    ready: false, // Samukelo, S2-30
  },
];