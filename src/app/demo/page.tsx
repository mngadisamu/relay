import { AuthShell } from "@/components/AuthShell";
import { demoCredentials, demoEnabled } from "@/lib/demo";
import { DemoLogin, type DemoRole } from "./DemoLogin";

// The eight demo roles. Keys match DEMO_ROLES in src/lib/demo.ts.
const ROLES = [
  { key: "staff", label: "Staff", blurb: "Sends requests and follows them" },
  { key: "agent-it", label: "Agent, IT", blurb: "Works the IT queue" },
  { key: "agent-hr", label: "Agent, HR", blurb: "Leave, payroll and conduct" },
  { key: "agent-finance", label: "Agent, Finance", blurb: "Purchases and approvals" },
  { key: "agent-operations", label: "Agent, Operations", blurb: "Depot and fleet requests" },
  { key: "department-manager", label: "Department manager, Finance", blurb: "Assigns and approves Finance" },
  { key: "general-manager", label: "General manager", blurb: "Every department and company people" },
  { key: "compliance", label: "Compliance", blurb: "Audit log and risk report" },
] as const;

// /demo: the sign-in page with demo role buttons. Off unless DEMO_ENABLED is "true".
export default function DemoPage() {
  if (!demoEnabled()) {
    return (
      <AuthShell
        heading="Kopano Freight demo"
        blurb="The demo is not switched on at the moment."
      >
        <p className="text-sm text-ink-2">The demo is not switched on at the moment.</p>
      </AuthShell>
    );
  }

  // Reads the email and password for each role from the server's environment (demo project only).
  const roles: DemoRole[] = ROLES.map((role) => {
    const creds = demoCredentials(role.key);
    return {
      key: role.key,
      label: role.label,
      blurb: role.blurb,
      ready: Boolean(creds),
      email: creds?.email ?? "",
      password: creds?.password ?? "",
    };
  });

  return <DemoLogin roles={roles} />;
}