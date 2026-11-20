import { requireRole } from "@/lib/auth";
import { RequestsHeader } from "./RequestsHeader";
import { SubmitForm } from "./SubmitForm";
import { createClient } from "@/lib/supabase/server";

// Staff home = the submit form (S1-22, mockup screens 2 and 3).
export default async function StaffHome() {
  const profile = await requireRole(["staff", "agent", "manager"]);

  // The company's depots (migration 0032). Shown in the form; the server checks them again on submit.
  const supabase = await createClient();
  const { data: depotRows } = await supabase.from("company_depots").select("name").eq("active", true).order("name");
  const depots = (depotRows ?? []).map((r) => r.name as string);

  return (
    <div className="min-h-screen bg-page">
      <RequestsHeader profile={profile} current="submit" />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-ink">New request</h1>
          <p className="text-sm leading-5 text-muted">Relay sends it to the right team: HR, IT, Finance or Operations.</p>
        </div>
        <SubmitForm depots={depots} />
      </main>
    </div>
  );
}
