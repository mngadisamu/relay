import { requireRole } from "@/lib/auth";
import { StaffNav } from "./StaffNav";
import { SubmitForm } from "./SubmitForm";

// Staff home = the submit form (S1-22, mockup screens 2 and 3).
export default async function StaffHome() {
  await requireRole(["staff"]);

  return (
    <div className="min-h-screen bg-page">
      <StaffNav current="submit" />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-ink">New request</h1>
          <p className="text-sm leading-5 text-muted">Relay sends it to the right team: HR, IT, Finance or Operations.</p>
        </div>
        <SubmitForm />
      </main>
    </div>
  );
}
