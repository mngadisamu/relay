import { redirect } from "next/navigation";

// Compliance starts on the audit log, so /compliance has no page of its own.
// Sign-in goes straight to /compliance/audit (HOME_FOR_ROLE in src/lib/auth.ts);
// this only catches old links and the Relay logo.
export default function ComplianceHome() {
  redirect("/compliance/audit");
}
