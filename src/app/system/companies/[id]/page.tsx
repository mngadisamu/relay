import Link from "next/link";
import { requirePlatformAdmin, PEOPLE_TABS, tabFor, type PeopleTab, type PlatformPerson } from "@/lib/platform";
import { SystemShell } from "../../SystemShell";
import { InviteAdminForm } from "../../InviteAdminForm";
import { AdminHero, Breadcrumbs, Mark, Panel, PrivacyNote, StatusTag } from "../../AdminUI";

type Company = { company_id: number; company_slug: string; company_name: string; active_people: number };

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

  const [{ data: companies }, { data: people }] = await Promise.all([
    supabase.rpc("platform_list_companies"),
    supabase.rpc("platform_list_company_people", { p_company_id: Number(id) }),
  ]);
  const company = ((companies ?? []) as Company[]).find((c) => String(c.company_id) === id);
  if (!company) {
    return (
      <SystemShell current="/system">
        <Breadcrumbs items={[{ label: "Companies", href: "/system" }, { label: "Not found" }]} />
        <div className="rounded-xl border border-dashed border-line bg-white px-4 py-12 text-center">
          <p className="font-semibold text-ink">No company with that id</p>
          <p className="mt-1 text-sm text-ink-2">It may have been typed wrong. Go back to the list to pick one.</p>
        </div>
      </SystemShell>
    );
  }

  const everyone = (people ?? []) as PlatformPerson[];
  const active: PeopleTab = PEOPLE_TABS.some((t) => t.key === tab) ? (tab as PeopleTab) : "staff";
  const shown = everyone
    .filter((p) => tabFor(p) === active)
    .sort((a, b) => Number(b.person_active) - Number(a.person_active) || a.person_name.localeCompare(b.person_name));
  const removed = everyone.filter((p) => !p.person_active).length;
  const activeTabLabel = PEOPLE_TABS.find((t) => t.key === active)?.label ?? "People";

  return (
    <SystemShell current="/system">
      <Breadcrumbs items={[{ label: "Companies", href: "/system" }, { label: company.company_name }]} />

      <AdminHero
        eyebrow={`Company · ${company.company_slug}`}
        title={company.company_name}
        leading={<Mark name={company.company_name} size="lg" />}
        description={
          <>
            {company.active_people.toLocaleString("en-ZA")} active {company.active_people === 1 ? "person" : "people"}
            {removed > 0 ? `, ${removed} removed` : ""}.
          </>
        }
      >
        <PrivacyNote>Tickets are never shown here</PrivacyNote>
      </AdminHero>

      {saved && (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-[#bfe5cf] bg-[#e6f6ee] px-4 py-3 text-sm font-medium text-[#0f6b3c]">
          <span aria-hidden="true">✓</span> Details saved.
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="people-heading" className="min-w-0 rounded-xl border border-line bg-white">
          <div className="space-y-3 border-b border-line-soft px-5 pt-4">
            <h2 id="people-heading" className="text-base font-semibold text-ink">People</h2>
            {/* Tabs as links, so each group has its own address and works without JavaScript. */}
            <nav aria-label="People groups" className="flex flex-wrap gap-1.5 pb-3">
              {PEOPLE_TABS.map((t) => {
                const count = everyone.filter((p) => tabFor(p) === t.key).length;
                const current = t.key === active;
                return (
                  <Link
                    key={t.key}
                    prefetch
                    href={`/system/companies/${id}?tab=${t.key}`}
                    aria-current={current ? "page" : undefined}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                      current ? "bg-brand text-white" : "bg-page text-ink-2 hover:bg-brand-soft hover:text-brand-dark"
                    }`}
                  >
                    {t.label}
                    <span className={`rounded-full px-1.5 text-xs tabular-nums ${current ? "bg-white/20" : "bg-white text-muted"}`}>{count}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {shown.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="font-semibold text-ink">No {activeTabLabel.toLowerCase()} yet</p>
              <p className="mt-1 text-sm text-ink-2">
                {active === "admins"
                  ? "Invite a system admin with the form on this page."
                  : "The company's system admin adds people on Manage users."}
              </p>
            </div>
          ) : (
            <>
              {/* Wide screens: a table. */}
              <table className="hidden w-full table-fixed text-left text-sm md:table">
                <caption className="sr-only">{activeTabLabel} in {company.company_name}</caption>
                <thead className="text-xs uppercase tracking-wide text-muted">
                  <tr className="border-b border-line-soft">
                    {/* Fixed widths, so a long email truncates instead of pushing Edit out of the card. */}
                    <th scope="col" className="px-5 py-2.5 font-semibold">Name</th>
                    <th scope="col" className="w-[17%] px-3 py-2.5 font-semibold">Department</th>
                    <th scope="col" className="w-[19%] px-3 py-2.5 font-semibold">Depot</th>
                    <th scope="col" className="w-[15%] px-3 py-2.5 font-semibold">Status</th>
                    <th scope="col" className="w-[72px] px-3 py-2.5"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {shown.map((p) => (
                    <tr key={p.person_id} className={p.person_active ? "" : "bg-page/60"}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Mark name={p.person_name} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink">{p.person_name}</p>
                            <p className="truncate text-ink-2">{p.person_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-ink-2">{p.person_department ?? <span className="text-muted">None</span>}</td>
                      <td className="truncate px-3 py-3 text-ink-2">{p.person_depot ?? <span className="text-muted">None</span>}</td>
                      <td className="px-3 py-3"><StatusTag active={p.person_active} /></td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/system/people/${p.person_id}?company=${id}&tab=${active}`}
                          className="rounded-md px-2.5 py-1.5 font-semibold text-brand hover:bg-brand-soft hover:text-brand-dark"
                        >
                          Edit<span className="sr-only"> {p.person_name}</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Phones: one card per person. */}
              <ul className="divide-y divide-line-soft md:hidden">
                {shown.map((p) => (
                  <li key={p.person_id} className="flex items-start gap-3 px-5 py-4">
                    <Mark name={p.person_name} size="sm" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-semibold text-ink">{p.person_name}</p>
                      <p className="break-all text-sm text-ink-2">{p.person_email}</p>
                      <p className="text-xs text-muted">
                        {p.person_department ?? "No department"} · {p.person_depot ?? "No depot"}
                      </p>
                      <StatusTag active={p.person_active} />
                    </div>
                    <Link
                      href={`/system/people/${p.person_id}?company=${id}&tab=${active}`}
                      className="shrink-0 rounded-md px-2.5 py-1.5 text-sm font-semibold text-brand hover:bg-brand-soft"
                    >
                      Edit<span className="sr-only"> {p.person_name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <div className="lg:sticky lg:top-6">
          <Panel
            id="invite-admin-heading"
            title="Invite a system admin"
            description="They get an invite email, choose their own password and become this company's general manager."
          >
            <InviteAdminForm companyId={company.company_id} />
          </Panel>
        </div>
      </div>
    </SystemShell>
  );
}
