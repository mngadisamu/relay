import { redirect } from "next/navigation";

// Managers start on the dashboard, so /manager has no page of its own.
// Sign-in goes straight to /manager/dashboard (HOME_FOR_ROLE in src/lib/auth.ts);
// this only catches old links and the Relay logo.
export default function ManagerHome() {
  redirect("/manager/dashboard");
}
