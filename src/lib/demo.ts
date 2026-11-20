// The Kopano Freight demo (a fictional company, for demonstrations only).
// Sign-in details are read on the server from environment variables, so passwords never reach the browser.
// The demo is off unless DEMO_ENABLED=true.

export const DEMO_ROLES = [
  { key: "staff", label: "Staff", env: "DEMO_STAFF" },
  { key: "agent-it", label: "Agent, IT", env: "DEMO_AGENT_IT" },
  { key: "agent-hr", label: "Agent, HR", env: "DEMO_AGENT_HR" },
  { key: "agent-finance", label: "Agent, Finance", env: "DEMO_AGENT_FINANCE" },
  { key: "agent-operations", label: "Agent, Operations", env: "DEMO_AGENT_OPERATIONS" },
  { key: "department-manager", label: "Department manager, Finance", env: "DEMO_DEPARTMENT_MANAGER" },
  { key: "general-manager", label: "General manager (company admin)", env: "DEMO_GENERAL_MANAGER" },
  { key: "compliance", label: "Compliance", env: "DEMO_COMPLIANCE" },
] as const;

export type DemoRoleKey = (typeof DEMO_ROLES)[number]["key"];

export function demoEnabled(): boolean {
  return process.env.DEMO_ENABLED === "true";
}

// Returns the email and password for a demo role, or null if they are not set.
export function demoCredentials(key: string): { email: string; password: string } | null {
  const role = DEMO_ROLES.find((r) => r.key === key);
  if (!role) return null;
  const email = process.env[`${role.env}_EMAIL`];
  const password = process.env[`${role.env}_PASSWORD`];
  if (!email || !password) return null;
  return { email, password };
}

// Only true or false leaves the server: the page shows which roles are ready, never the details.
export function demoRoleReady(key: string): boolean {
  return demoCredentials(key) !== null;
}

// Demo accounts skip the second step. Only the emails listed in DEMO_ACCOUNT_EMAILS count.
// Remove this once every company has its own two-step setting (see docs/platform-plan.md).
export function isDemoAccount(email: string): boolean {
  const list = (process.env.DEMO_ACCOUNT_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}
