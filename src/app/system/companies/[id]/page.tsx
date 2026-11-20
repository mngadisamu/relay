import Link from "next/link";
import { requirePlatformAdmin, PEOPLE_TABS, tabFor, type PeopleTab, type PlatformPerson } from "@/lib/platform";
import { SystemShell } from "../../SystemShell";

// One company's people, in tabs (story P5). A platform admin sees names, emails and roles only.
export default async function CompanyPeoplePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { tab, saved } = await searchParams;
  const supabase = await requirePlatformAdmin();

  const { data: companies } = await supabase.rpc("platform_list_companies");
  const company = ((companies ?? []) as { company_id: number; company_name: string }[]).find((c) => String(c.company_id) === id);
  if (!company) {
    return (
      <SystemShell current="/system">
        <p className="text-sm text-ink-2">No company with that id.</p>
      </SystemShell>
    );
  }

  const { data: people } = await supabase.rpc("platform_list_company_people", { p_company_id: Number(id) });
  const everyone = (people ?? []) as PlatformPerson[];
  const active: PeopleTab = PEOPLE_TABS.some((t) => t.key === tab) ? (tab as PeopleTab) : "staff";
  const shown = everyone.filter((p) => tabFor(p) === active);

  return (
    <SystemShell current="/system">
      <Link href="/system" className="text-sm font-semibold text-brand hover:text-brand-dark">
        Back to companies
      </Link>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink sm:text-2xl">{company.company_name}</h1>
        <p className="text-[15px] text-ink-2">People in this company. Tickets are never shown here.</p>
      </div>

      {saved && (
        <p role="status" className="rounded-[10px] border border-line bg-white px-4 py-3 text-sm text-ink">Details saved.</p>
      )}

      <nav aria-label="People groups" className="-mx-1 flex gap-1 overflow-x-auto whitespace-nowrap px-1">
        {PEOPLE_TABS.map((t) => {
          const count = everyone.filter((p) => tabFor(p) === t.key).length;
          const current = t.key === active;
          return (
            <Link
              key={t.key}
              prefetch
              href={`/system/companies/${id}?tab=${t.key}`}
              aria-current={current ? "page" : undefined}
              className={`shrink-0 rounded-md px-3 py-2 text-sm font-semibold ${current ? "bg-brand text-white" : "text-ink-2 hover:bg-accent"}`}
            >
              {t.label} ({count})
            </Link>
          );
        })}
      </nav>

      {shown.length === 0 ? (
        <p className="text-sm text-muted">Nobody in this group yet.</p>
      ) : (
        <ul className="divide-y divide-line-soft rounded-[10px] border border-line bg-white">
          {shown.map((p) => (
            <li key={p.person_id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold text-ink">{p.person_name}{p.person_active ? "" : " (removed)"}</p>
                <p className="text-sm text-ink-2">{p.person_email}</p>
                <p className="text-xs text-muted">{p.person_department ?? "No department"} · {p.person_depot ?? "No depot"}</p>
              </div>
              <Link
                href={`/system/people/${p.person_id}?company=${id}&tab=${active}`}
                className="text-sm font-semibold text-brand hover:text-brand-dark"
              >
                Edit<span className="sr-only"> {p.person_name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SystemShell>
  );
}
