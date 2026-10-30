// prefetch on links: Next.js fetches the page in the background before the click,
// so it opens instantly instead of showing a loading screen.
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AgentHeader } from "@/components/AgentHeader";
import { NeedsReviewTag, PriorityTag, StatusPill } from "@/components/StatusPill";
import { STATUS_LABEL, formatWhen, type TicketPriority, type TicketStatus } from "@/app/staff/status";

type Ticket = {
  id: number;
  reference: string;
  subject: string;
  depot: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  needs_review: boolean;
  created_at: string;
};

const STATUSES: TicketStatus[] = ["received", "assigned", "answered", "closed"];

// Most urgent first (S1-19).
const PRIORITY_RANK: Record<TicketPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

// Agent inbox (S1-19, mockup screen 6): only the agent's department, most urgent
// first then oldest, a status filter with counts, and "Needs review" clearly marked.
export default async function AgentInbox({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; moved?: string; to?: string }>;
}) {
  const profile = await requireRole(["agent"]);
  const { status, moved, to } = await searchParams;
  const filter = STATUSES.find((s) => s === status);

  // A plain select is enough: row-level security (S1-15) only returns
  // tickets from this agent's department. Seeded history is left out.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tickets")
    .select("id, reference, subject, depot, priority, status, needs_review, created_at")
    .eq("is_historical", false);

  const all = ((data ?? []) as Ticket[]).sort(
    (a, b) =>
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const tickets = filter ? all.filter((t) => t.status === filter) : all;
  const countFor = (s?: TicketStatus) => (s ? all.filter((t) => t.status === s).length : all.length);

  return (
    <div className="min-h-screen bg-page">
      <AgentHeader profile={profile} current="inbox" />
      <main className="mx-auto max-w-[1360px] space-y-[18px] px-6 pb-12 pt-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-[22px] font-semibold text-ink">Inbox</h1>
            <p className="text-sm text-muted">
              {profile.department ?? "Your department"} tickets only · most urgent first, then oldest
            </p>
          </div>
          <nav aria-label="Filter by status" className="flex flex-wrap gap-1 rounded-lg border border-line bg-white p-1">
            {[undefined, ...STATUSES].map((s) => {
              const active = s === filter;
              return (
                <Link
                  prefetch
                  key={s ?? "all"}
                  href={s ? `/agent?status=${s}` : "/agent"}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-[7px] text-sm ${
                    active ? "bg-brand font-semibold text-white" : "font-medium text-ink-2 hover:bg-page"
                  }`}
                >
                  {s ? STATUS_LABEL[s] : "All"}
                  <span className={`text-xs tabular-nums ${active ? "text-[#dce8f7]" : "text-muted"}`}>{countFor(s)}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Shown after an agent moves a ticket to another department (S1-25). */}
        {moved && to && (
          <p role="status" className="rounded-md bg-[#e5f3ea] px-3 py-2.5 text-sm font-medium text-[#1b6b36]">
            {moved} was moved to {to}. It&apos;s now in the {to} inbox.
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-md bg-[#fdecea] p-3 text-sm text-[#a4231a]">
            Couldn&apos;t load tickets: {error.message}
          </p>
        )}

        <div className="overflow-x-auto rounded-[10px] border border-line bg-white">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-[0.4px] text-muted">
                {["Priority", "Subject", "Reference", "Depot", "Status", "Received"].map((h) => (
                  <th key={h} scope="col" className="border-b border-line px-4 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-[#f8f9fb]">
                  <td className="whitespace-nowrap border-b border-line-soft px-4 py-3.5">
                    <PriorityTag priority={t.priority} />
                  </td>
                  <td className="border-b border-line-soft px-4 py-3.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Link prefetch href={`/agent/${t.id}`} className="font-semibold text-ink hover:underline">
                        {t.subject}
                      </Link>
                      {t.needs_review && <NeedsReviewTag />}
                    </div>
                  </td>
                  <td className="whitespace-nowrap border-b border-line-soft px-4 py-3.5 tabular-nums text-ink-2">{t.reference}</td>
                  <td className="whitespace-nowrap border-b border-line-soft px-4 py-3.5 text-ink-2">{t.depot ?? "Not given"}</td>
                  <td className="whitespace-nowrap border-b border-line-soft px-4 py-3.5">
                    <StatusPill status={t.status} size="sm" />
                  </td>
                  <td className="whitespace-nowrap border-b border-line-soft px-4 py-3.5 text-ink-2">{formatWhen(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tickets.length === 0 && !error && (
            <p className="px-4 py-8 text-center text-sm text-muted">
              {filter ? `No ${STATUS_LABEL[filter].toLowerCase()} tickets.` : "No tickets for your department right now."}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
