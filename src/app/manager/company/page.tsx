import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RoleHeader } from "@/components/RoleHeader";
import { MANAGER_MENU } from "@/lib/menus";
import { Button } from "@/components/ui/button";
import { CompanyTabs } from "../CompanyTabs";
import { saveCompanySettings } from "./actions";

// Company settings (story P4): depots and allowed email domains. General managers only.
export default async function CompanySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const profile = await requireRole(["manager"]);
  const isGeneral = profile.department === null;

  const supabase = await createClient();
  const { data: depotRows } = await supabase.from("company_depots").select("name").eq("active", true).order("name");
  const depots = (depotRows ?? []).map((r) => r.name as string);
  const { data: company } = await supabase.from("companies").select("allowed_domains").maybeSingle();
  const domains = (company?.allowed_domains as string[] | null) ?? [];

  return (
    <div className="min-h-screen bg-page">
      <RoleHeader profile={profile} home="/manager" menu={MANAGER_MENU} current="/manager/users" />
      <main className="mx-auto max-w-[900px] space-y-6 px-4 pb-12 pt-7 sm:px-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-ink sm:text-2xl">Manage users</h1>
          <CompanyTabs current="company" isGeneral={isGeneral} />
        </div>

        {saved && (
          <p role="status" className="rounded-md border border-line bg-white px-3 py-2 text-sm text-ink">Settings saved.</p>
        )}
        {error && (
          <p role="alert" className="rounded-md border border-[#a4231a] bg-[#fdecea] px-3 py-2 text-sm text-[#a4231a]">{error}</p>
        )}

        {!isGeneral ? (
          <p className="text-[15px] text-ink-2">Only a general manager can change company settings.</p>
        ) : (
          <form action={saveCompanySettings} className="grid gap-6">
            <div className="grid gap-1.5">
              <label htmlFor="depots" className="text-sm font-semibold text-ink">Depots</label>
              <p id="depots-hint" className="text-xs text-muted">One per line. Up to 10. Removing a depot hides it from new requests; old tickets keep it.</p>
              <textarea id="depots" name="depots" rows={5} defaultValue={depots.join("\n")} aria-describedby="depots-hint" className="rounded-md border border-line bg-white p-2 text-[15px]" />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="domains" className="text-sm font-semibold text-ink">Allowed email domains</label>
              <p id="domains-hint" className="text-xs text-muted">One per line, or separated by commas, like kopano.example. Leave empty to allow any domain.</p>
              <textarea id="domains" name="domains" rows={3} defaultValue={domains.join("\n")} aria-describedby="domains-hint" className="rounded-md border border-line bg-white p-2 text-[15px]" />
            </div>
            <Button type="submit" className="w-fit">Save settings</Button>
          </form>
        )}
      </main>
    </div>
  );
}
