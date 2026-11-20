import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/platform";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCompany } from "./actions";

// System admin home (stories P3 and P5). Platform admins only. Shows counts, the companies,
// and lets them create a company. Ticket text and replies are never shown here.
export default async function SystemPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const { error, created } = await searchParams;
  const supabase = await requirePlatformAdmin();

  const { data: summary, error: summaryError } = await supabase.rpc("system_summary");
  const counts = summary as Record<string, number> | null;
  const { data: companies } = await supabase.rpc("platform_list_companies");
  const list = (companies ?? []) as { company_id: number; company_name: string; active_people: number }[];

  return (
    <main className="mx-auto max-w-[900px] space-y-8 px-4 pb-12 pt-8 text-ink sm:px-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold sm:text-2xl">System admin</h1>
        <p className="text-[15px] text-ink-2">
          Counts and people across every company. This page never shows ticket text, replies or anyone&apos;s tickets.
        </p>
      </div>

      {created && <p role="status" className="rounded-md border border-line bg-white px-3 py-2 text-sm">Created the company {created}.</p>}
      {error && <p role="alert" className="rounded-md border border-[#a4231a] bg-[#fdecea] px-3 py-2 text-sm text-[#a4231a]">{error}</p>}

      <section aria-labelledby="companies-heading" className="space-y-3">
        <h2 id="companies-heading" className="text-lg font-semibold">Companies</h2>
        {list.length === 0 ? (
          <p className="text-sm text-muted">No companies yet.</p>
        ) : (
          <ul className="divide-y divide-line rounded-md border border-line bg-white">
            {list.map((c) => (
              <li key={c.company_id} className="flex items-center justify-between px-4 py-3">
                <span className="font-semibold">{c.company_name}</span>
                <Link href={`/system/companies/${c.company_id}`} className="text-sm font-semibold text-brand underline">
                  People ({c.active_people} active)<span className="sr-only"> in {c.company_name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="counts-heading" className="space-y-3">
        <h2 id="counts-heading" className="text-lg font-semibold">Counts</h2>
        {summaryError || !counts ? (
          <p className="text-sm text-muted">The counts are not set up yet. Samukelo needs to run migration 0028.</p>
        ) : (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(counts).map(([key, value]) => (
              <div key={key} className="rounded-md border border-line bg-white p-3">
                <dt className="text-xs text-muted">{key.replace(/_/g, " ")}</dt>
                <dd className="text-xl font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section aria-labelledby="create-heading" className="space-y-4">
        <h2 id="create-heading" className="text-lg font-semibold">Create a company</h2>
        <form action={createCompany} className="grid max-w-md gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Company name</Label>
            <Input id="name" name="name" required minLength={2} maxLength={120} autoComplete="off" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="slug">Company code</Label>
            <Input id="slug" name="slug" required minLength={2} maxLength={40} pattern="[a-z0-9-]+" autoComplete="off" aria-describedby="slug-hint" />
            <p id="slug-hint" className="text-xs text-muted">Lower-case letters, numbers and hyphens, 2 to 40 characters.</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="two_step" defaultChecked className="h-4 w-4" />
            Require two-step sign-in (keep this on for every real company)
          </label>
          <Button type="submit" className="w-fit">Create company</Button>
        </form>
      </section>
    </main>
  );
}
