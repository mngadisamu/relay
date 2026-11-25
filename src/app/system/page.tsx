import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/platform";
import { SystemShell } from "./SystemShell";
import { CreateCompanyForm } from "./CreateCompanyForm";
import {
  AdminHero,
  IconArrow,
  IconBuilding,
  IconMail,
  IconPeople,
  IconReply,
  IconTicket,
  Mark,
  Panel,
  PrivacyNote,
  StatTile,
} from "./AdminUI";

type Company = { company_id: number; company_slug: string; company_name: string; active_people: number };
type Summary = {
  people_active: number;
  people_removed: number;
  live_tickets: number;
  historical_tickets: number;
  replies_sent: number;
  emails_waiting: number;
  emails_sent: number;
};

// System admin home (stories P3 and P5). Platform admins only. Shows the companies and
// counts, and lets them create a company with its first system admin. No ticket text is shown.
export default async function SystemPage() {
  const supabase = await requirePlatformAdmin();

  const [{ data: summary, error: summaryError }, { data: companies }] = await Promise.all([
    supabase.rpc("system_summary"),
    supabase.rpc("platform_list_companies"),
  ]);
  const counts = summaryError ? null : (summary as Summary | null);
  const list = ((companies ?? []) as Company[]).slice().sort((a, b) => a.company_name.localeCompare(b.company_name));

  return (
    <SystemShell current="/system">
      <AdminHero
        eyebrow="Platform admin"
        title="Companies on Relay"
        description="Every company, its people and the platform's numbers in one place. Each company only ever sees its own data."
      >
        <PrivacyNote>No ticket text or replies are shown here</PrivacyNote>
      </AdminHero>

      {/* The four numbers that matter most, lifted onto the band. */}
      <div className="relative -mt-12 grid grid-cols-1 gap-3 px-3 min-[420px]:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <StatTile label="Companies" value={list.length} icon={<IconBuilding />} />
        <StatTile label="Active people" value={counts?.people_active ?? null} hint={counts ? `${counts.people_removed.toLocaleString("en-ZA")} removed` : undefined} icon={<IconPeople />} />
        <StatTile label="Live tickets" value={counts?.live_tickets ?? null} hint={counts ? `${counts.historical_tickets.toLocaleString("en-ZA")} past tickets` : undefined} icon={<IconTicket />} />
        <StatTile label="Replies sent" value={counts?.replies_sent ?? null} icon={<IconReply />} />
      </div>

      {!counts && (
        <p role="alert" className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink-2">
          The counts can&apos;t load yet. The database needs migration 0030 (platform admins). Reload once it is in place.
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Panel
          id="companies-heading"
          title="Companies"
          description={`${list.length} ${list.length === 1 ? "company" : "companies"}. Open one to see and edit its people.`}
        >
          {list.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line px-4 py-10 text-center">
              <p className="font-semibold text-ink">No companies yet</p>
              <p className="mt-1 text-sm text-ink-2">Create the first one with the form on this page.</p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {list.map((c) => (
                <li key={c.company_id}>
                  <Link
                    prefetch
                    href={`/system/companies/${c.company_id}`}
                    className="group flex h-full items-center gap-3 rounded-lg border border-line bg-white p-4 transition-colors hover:border-brand hover:bg-brand-soft/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <Mark name={c.company_name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{c.company_name}</span>
                      <span className="block text-xs text-muted">
                        <span className="font-mono">{c.company_slug}</span> · {c.active_people.toLocaleString("en-ZA")} active{" "}
                        {c.active_people === 1 ? "person" : "people"}
                      </span>
                    </span>
                    <span className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand">
                      <IconArrow />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-6 lg:sticky lg:top-6">
          <Panel id="create-heading" title="Create a company" description="Add the company, then its first system admin gets an invite.">
            <CreateCompanyForm />
          </Panel>

          {counts && (
            <Panel id="email-heading" title="Email notifications">
              <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-page p-3">
                  <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                    <IconMail /> Waiting
                  </dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums text-ink">{counts.emails_waiting.toLocaleString("en-ZA")}</dd>
                </div>
                <div className="rounded-lg bg-page p-3">
                  <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                    <IconMail /> Sent
                  </dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums text-ink">{counts.emails_sent.toLocaleString("en-ZA")}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-muted">Emails go out once Resend is switched on. Until then they wait here, and people still see in-app notices.</p>
            </Panel>
          )}
        </div>
      </div>
    </SystemShell>
  );
}
