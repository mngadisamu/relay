import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/platform";
import { SystemShell } from "./SystemShell";
import { CreateCompanyForm } from "./CreateCompanyForm";

// System admin home (stories P3 and P5). Platform admins only. Shows the companies and
// counts, and lets them create a company with its first system admin. No ticket text is shown.
export default async function SystemPage() {
  const supabase = await requirePlatformAdmin();

  const { data: summary, error: summaryError } = await supabase.rpc("system_summary");
  const counts = summary as Record<string, number> | null;
  const { data: companies } = await supabase.rpc("platform_list_companies");
  const list = (companies ?? []) as { company_id: number; company_name: string; active_people: number }[];

  return (
    <SystemShell current="/system">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink sm:text-2xl">System admin</h1>
        <p className="text-[15px] text-ink-2">
          Counts and people across every company. This page never shows ticket text, replies or anyone&apos;s tickets.
        </p>
      </div>

      <section aria-labelledby="companies-heading" className="space-y-3">
        <h2 id="companies-heading" className="text-base font-semibold text-ink sm:text-lg">Companies</h2>
        {list.length === 0 ? (
          <p className="text-sm text-muted">No companies yet.</p>
        ) : (
          <ul className="divide-y divide-line-soft rounded-[10px] border border-line bg-white">
            {list.map((c) => (
              <li key={c.company_id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="font-semibold text-ink">{c.company_name}</span>
                <Link href={`/system/companies/${c.company_id}`} className="shrink-0 text-sm font-semibold text-brand hover:text-brand-dark">
                  People ({c.active_people} active)<span className="sr-only"> in {c.company_name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="counts-heading" className="space-y-3">
        <h2 id="counts-heading" className="text-base font-semibold text-ink sm:text-lg">Counts</h2>
        {summaryError || !counts ? (
          <p className="text-sm text-muted">The counts are not set up yet. Samukelo needs to run migration 0028.</p>
        ) : (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(counts).map(([key, value]) => (
              <div key={key} className="rounded-[10px] border border-line bg-white p-3">
                <dt className="text-xs text-muted">{key.replace(/_/g, " ")}</dt>
                <dd className="text-xl font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section aria-labelledby="create-heading" className="space-y-3">
        <div className="space-y-1">
          <h2 id="create-heading" className="text-base font-semibold text-ink sm:text-lg">Create a company</h2>
          <p className="text-sm text-ink-2">Add the company, then invite its system admin.</p>
        </div>
        <CreateCompanyForm />
      </section>
    </SystemShell>
  );
}
