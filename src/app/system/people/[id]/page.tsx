import { requirePlatformAdmin, PEOPLE_TABS, tabFor, type PlatformPerson } from "@/lib/platform";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePerson } from "../actions";
import { SystemShell } from "../../SystemShell";
import { AdminHero, Breadcrumbs, Mark, Panel, StatusTag } from "../../AdminUI";

const ROLE_NAMES: Record<string, string> = {
  staff: "Staff",
  agent: "Agent",
  manager: "Manager",
  compliance: "Compliance",
};

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
  const [{ data: people }, { data: companies }, { data: depotRows }] = await Promise.all([
    supabase.rpc("platform_list_company_people", { p_company_id: Number(companyId) }),
    supabase.rpc("platform_list_companies"),
    supabase.rpc("platform_company_depots", { p_company_id: Number(companyId) }),
  ]);
  const companyName =
    ((companies ?? []) as { company_id: number; company_name: string }[]).find((c) => String(c.company_id) === companyId)
      ?.company_name ?? "Company";
  const person = ((people ?? []) as PlatformPerson[]).find((p) => p.person_id === id);
  const backHref = `/system/companies/${companyId}?tab=${tab}`;

  if (!person) {
    return (
      <SystemShell current="/system">
        <Breadcrumbs items={[{ label: "Companies", href: "/system" }, { label: companyName, href: backHref }, { label: "Not found" }]} />
        <div className="rounded-xl border border-dashed border-line bg-white px-4 py-12 text-center">
          <p className="font-semibold text-ink">This person is not in that company</p>
          <p className="mt-1 text-sm text-ink-2">Go back to the company and pick them from the list.</p>
        </div>
      </SystemShell>
    );
  }

  const depots = ((depotRows ?? []) as { depot_name: string }[]).map((d) => d.depot_name);
  const group = PEOPLE_TABS.find((t) => t.key === tabFor(person))?.label ?? "People";
  const role = ROLE_NAMES[person.person_role] ?? person.person_role;

  return (
    <SystemShell current="/system">
      <Breadcrumbs
        items={[
          { label: "Companies", href: "/system" },
          { label: companyName, href: backHref },
          { label: person.person_name },
        ]}
      />

      <AdminHero
        eyebrow={`${companyName} · ${group}`}
        title={person.person_name}
        leading={<Mark name={person.person_name} size="lg" />}
        description={person.person_email}
      >
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">{role}</span>
          <StatusTag active={person.person_active} />
        </div>
      </AdminHero>

      {error && (
        <p role="alert" className="rounded-xl border border-[#f0c8c3] bg-[#fdf1ef] px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel id="details-heading" title="Details" description="Name, email, department and depot. Saving takes you back to the company.">
          <form action={updatePerson} className="grid gap-5">
            <input type="hidden" name="userId" value={person.person_id} />
            <input type="hidden" name="companyId" value={companyId} />
            <input type="hidden" name="tab" value={tab} />
            <input type="hidden" name="currentEmail" value={person.person_email} />

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" name="fullName" required minLength={2} maxLength={120} defaultValue={person.person_name} className="h-11" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required defaultValue={person.person_email} aria-describedby="email-hint" className="h-11" />
                <p id="email-hint" className="text-xs text-muted">A new address works straight away; their password stays the same.</p>
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
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-line-soft pt-5">
              <Button type="submit" className="h-11 px-6">Save details</Button>
              <a href={backHref} className="rounded-md px-3 py-2 text-sm font-semibold text-ink-2 hover:bg-page">
                Cancel
              </a>
            </div>
          </form>
        </Panel>

        <Panel id="rules-heading" title="Good to know">
          <ul className="space-y-3 text-sm text-ink-2">
            <li className="flex gap-2"><span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />An agent needs a department.</li>
            <li className="flex gap-2"><span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />A manager without a department is the company&apos;s general manager (system admin).</li>
            <li className="flex gap-2"><span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />Roles change on the company&apos;s own Manage users page, not here.</li>
            <li className="flex gap-2"><span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />Depots come from the company&apos;s settings.</li>
          </ul>
        </Panel>
      </div>
    </SystemShell>
  );
}
