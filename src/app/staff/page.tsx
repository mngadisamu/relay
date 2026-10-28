import { requireRole } from "@/lib/auth";
import { StaffNav } from "./StaffNav";
import { SubmitForm } from "./SubmitForm";

// Staff home = the submit form (S1-22). Other roles are sent to their own home.
export default async function StaffHome() {
  await requireRole(["staff"]);

  return (
    <div className="min-h-screen bg-gray-50">
      <StaffNav current="submit" />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-gray-900">New request</h1>
          <p className="text-sm text-gray-600">Relay sends it to the right team: HR, IT, Finance or Operations.</p>
        </div>
        <SubmitForm />
      </main>
    </div>
  );
}
