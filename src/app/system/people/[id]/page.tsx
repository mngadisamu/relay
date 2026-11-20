import Link from "next/link";
import { requirePlatformAdmin, type PlatformPerson } from "@/lib/platform";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePerson } from "../actions";
import { SystemShell } from "../../SystemShell";

// Edit one person's details, for a platform admin (story P5). No tickets are shown here.
export default async function EditPersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ company?: string; tab?: string; error?: string }>;
}) {
  const { id } = await params;
  const { company, tab = "staff", error } = await searchParams;
  const supabase = await requirePlatformAdmin();

  const companyId = company ?? "";
  const { data: people } = await supabase.rpc("platform_list_company_people", { p_company_id: Number(companyId) });
  const person = ((people ?? []) as PlatformPerson[]).find((p) => p.person_id === id);
  if (!person) {
    return (
      <SystemShell current="/system">
        <p className="text-sm text-ink-2">This person is not in that company.</p>
      </SystemShell>
    );
  }
  const { data: depotRows } = await supabase.rpc("platform_company_depots", { p_company_id: Number(companyId) });
  const depots = ((depotRows ?? []) as { depot_name: string }[]).map((d) => d.depot_name);

  return (
    <SystemShell current="/system">
      <Link href={`/system/companies/${companyId}?tab=${tab}`} className="text-sm font-semibold text-brand hover:text-brand-dark">
        Back to the company
      </Link>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink sm:text-2xl">Edit {person.person_name}</h1>
        <p className="text-[15px] text-ink-2">Role: {person.person_role}{person.person_active ? "" : " (removed from Relay)"}. Role changes are not part of this page.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-[10px] border border-[#f0c8c3] bg-[#fdf1ef] px-4 py-3 text-sm text-[#a4231a]">{error}</p>
      )}

      <form action={updatePerson} className="grid max-w-xl gap-5 rounded-[10px] border border-line bg-white p-5 sm:p-6">
        <input type="hidden" name="userId" value={person.person_id} />
        <input type="hidden" name="companyId" value={companyId} />
        <input type="hidden" name="tab" value={tab} />
        <input type="hidden" name="currentEmail" value={person.person_email} />

        <div className="grid gap-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" required minLength={2} maxLength={120} defaultValue={person.person_name} className="h-11" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required defaultValue={person.person_email} className="h-11" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="department">Department</Label>
          <select id="department" name="department" defaultValue={person.person_department ?? ""} className="h-11 rounded-md border border-field bg-white px-3 text-sm text-ink">
            <option value="">None</option>
            <option>HR</option>
            <option>IT</option>
            <option>Finance</option>
            <option>Operations</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="depot">Depot</Label>
          <select id="depot" name="depot" defaultValue={person.person_depot ?? ""} className="h-11 rounded-md border border-field bg-white px-3 text-sm text-ink">
            <option value="">No depot</option>
            {depots.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <Button type="submit" className="w-fit">Save details</Button>
      </form>
    </SystemShell>
  );
}
