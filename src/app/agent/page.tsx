// prefetch on links: Next.js fetches the page in the background before the click,
// so it opens instantly instead of showing a loading screen.
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AgentHeader } from "@/components/AgentHeader";
import { RoleHeader } from "@/components/RoleHeader";
import { MANAGER_MENU } from "@/lib/menus";
import { SENSITIVE_LABEL, type SensitiveKind } from "@/lib/sensitive";
import { NeedsReviewTag, PriorityTag, SensitiveTag, StatusPill } from "@/components/StatusPill";
import { STATUS_LABEL, formatWhen, latestUpdate, type TicketPriority, type TicketStatus } from "@/app/staff/status";

type Ticket = {
  id: number;
  reference: string;
  subject: string;
  depot: string | null;
  department: string | null;
  assigned_to: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  needs_review: boolean;
  is_sensitive: boolean;
  sensitive_kind: SensitiveKind | null;
  created_at: string;
  assigned_at: string | null;
  answered_at: string | null;
  closed_at: string | null;
};

const STATUSES: TicketStatus[] = ["received", "assigned", "answered", "closed"];

// Most urgent first (S1-19).
const PRIORITY_RANK: Record<TicketPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

// Agent inbox (S1-19, mockup screen 6): only the agent's department, most urgent
// first then oldest, a status filter with counts, and "Needs review" clearly marked.
// S2-16: shows who each ticket is assigned to, and a Mine filter for agents.
// Managers open it too (Tickets in their menu), so they can assign work:
// a department manager sees their department, a general manager sees everything.
export default async function AgentInbox({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; mine?: string; moved?: string; to?: string }>;
}) {
  const profile = await requireRole(["agent", "manager"]);
  const { status, mine: mineParam, moved, to } = await searchParams;
  const filter = STATUSES.find((s) => s === status);
  const isManager = profile.role === "manager";
  const mine = !isManager && mineParam === "1";

  // A plain select is enough: row-level security (S1-15) only returns
  // tickets from this agent's department. Seeded history is left out.
  const supabase = await createClient();
  let query = supabase
    .from("tickets")
    .select("id, reference, subject, depot, department, assigned_to, priority, status, needs_review, is_sensitive, sensitive_kind, created_at, assigned_at, answered_at, closed_at")
    .eq("is_historical", false);
  // Managers can read every ticket (0003); a department manager only needs theirs here.
  if (isManager && profile.department) query = query.eq("department", profile.department);
  const { data, error } = await query;

  // Names of the people tickets are assigned to. Agents can read their own
  // department's names, managers everyone's (migration 0006).
  const assigneeIds = [...new Set(((data ?? []) as Ticket[]).map((t) => t.assigned_to).filter((id): id is string => !!id))];
  const names = new Map<string, string>();
  if (assigneeIds.length > 0) {
    const { data: people } = await supabase.from("profiles").select("id, full_name").in("id", assigneeIds);
    for (const p of people ?? []) names.set(p.id as string, p.full_name as string);
  }
  const assignedLabel = (t: Ticket) =>
    !t.assigned_to ? null : t.assigned_to === profile.id ? "You" : (names.get(t.assigned_to) ?? "Another agent");

  const scope = ((data ?? []) as Ticket[]).filter((t) => !mine || t.assigned_to === profile.id);
  const all = scope.sort(
    (a, b) =>
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const tickets = filter ? all.filter((t) => t.status === filter) : all;
  const countFor = (s?: TicketStatus) => (s ? all.filter((t) => t.status === s).length : all.length);

  return (
    <div className="min-h-screen bg-page">
      {isManager ? (
        <RoleHeader profile={profile} home="/manager" menu={MANAGER_MENU} current="/agent" />
      ) : (
        <AgentHeader profile={profile} current="inbox" />
      )}
      <main className="mx-auto max-w-[1360px] space-y-[18px] px-4 pb-12 pt-7 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-[19px] font-semibold text-ink sm:text-[22px]">{isManager ? "Tickets" : "Inbox"}</h1>
            <p className="text-sm text-muted">
              {profile.department ?? "All departments"}
              {profile.department ? " tickets only" : ""} · most urgent first, then oldest
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
          {/* Mine (S2-16): only the tickets this agent has taken or been given. */}
          {!isManager && (
            <nav aria-label="Whose tickets" className="flex gap-1 rounded-lg border border-line bg-white p-1">
              {[false, true].map((m) => (
                <Link
                  prefetch
                  key={String(m)}
                  href={inboxHref(filter, m)}
                  aria-current={m === mine ? "page" : undefined}
                  className={`inline-flex items-center rounded-md px-3 py-[7px] text-sm ${
                    m === mine ? "bg-brand font-semibold text-white" : "font-medium text-ink-2 hover:bg-page"
                  }`}
                >
                  {m ? "Mine" : "Everyone's"}
                </Link>
              ))}
            </nav>
          )}
          <nav aria-label="Filter by status" className="flex flex-wrap gap-1 rounded-lg border border-line bg-white p-1">
            {[undefined, ...STATUSES].map((s) => {
              const active = s === filter;
              return (
                <Link
                  prefetch
                  key={s ?? "all"}
                  href={inboxHref(s, mine)}
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

        {/* Phones: one card per ticket, so nothing is cut off and nothing scrolls sideways.
            From tablet width (md) up, the full table is shown instead. */}
        <ul aria-label="Tickets" className="space-y-3 md:hidden">
          {tickets.map((t) => {
            const update = latestUpdate(t);
            return (
              <li key={t.id} className="rounded-[10px] border border-line bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityTag priority={t.priority} />
                  <StatusPill status={t.status} size="sm" />
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <Link prefetch href={`/agent/${t.id}`} className="font-semibold text-ink hover:underline">
                    {t.subject}
                  </Link>
                  {t.is_sensitive && <SensitiveTag label={t.sensitive_kind ? SENSITIVE_LABEL[t.sensitive_kind].tag : undefined} />}
                  {t.needs_review && <NeedsReviewTag />}
                </div>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                  <dt className="text-muted">Reference</dt>
                  <dd className="tabular-nums text-ink-2">{t.reference}</dd>
                  <dt className="text-muted">Depot</dt>
                  <dd className="text-ink-2">{t.depot ?? "Not given"}</dd>
                  <dt className="text-muted">Assigned to</dt>
                  <dd className="text-ink-2">{assignedLabel(t) ?? "Nobody yet"}</dd>
                  <dt className="text-muted">Received</dt>
                  <dd className="text-ink-2">
                    <time dateTime={t.created_at}>{formatWhen(t.created_at)}</time>
                  </dd>
                  <dt className="text-muted">Last update</dt>
                  <dd className="text-ink-2">
                    {update.label === "Sent" ? (
                      "No reply yet"
                    ) : (
                      <>
                        {update.label} <time dateTime={update.at}>{formatWhen(update.at)}</time>
                      </>
                    )}
                  </dd>
                </dl>
              </li>
            );
          })}
        </ul>

        <div className="hidden overflow-x-auto rounded-[10px] border border-line bg-white md:block">
          <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-[0.4px] text-muted">
                {["Priority", "Subject", "Reference", "Depot", "Status", "Assigned to", "Received", "Last update"].map((h) => (
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
                      {t.is_sensitive && <SensitiveTag label={t.sensitive_kind ? SENSITIVE_LABEL[t.sensitive_kind].tag : undefined} />}
                      {t.needs_review && <NeedsReviewTag />}
                    </div>
                  </td>
                  <td className="whitespace-nowrap border-b border-line-soft px-4 py-3.5 tabular-nums text-ink-2">{t.reference}</td>
                  <td className="whitespace-nowrap border-b border-line-soft px-4 py-3.5 text-ink-2">{t.depot ?? "Not given"}</td>
                  <td className="whitespace-nowrap border-b border-line-soft px-4 py-3.5">
                    <StatusPill status={t.status} size="sm" />
                  </td>
                  <td className="whitespace-nowrap border-b border-line-soft px-4 py-3.5 text-ink-2">
                    {assignedLabel(t) ?? <span className="text-muted">Nobody yet</span>}
                  </td>
                  <td className="whitespace-nowrap border-b border-line-soft px-4 py-3.5 text-ink-2">
                    <time dateTime={t.created_at}>{formatWhen(t.created_at)}</time>
                  </td>
                  <td className="whitespace-nowrap border-b border-line-soft px-4 py-3.5 text-ink-2">
                    {(() => {
                      const update = latestUpdate(t);
                      return update.label === "Sent" ? (
                        <span className="text-muted">No reply yet</span>
                      ) : (
                        <>
                          {update.label} <time dateTime={update.at}>{formatWhen(update.at)}</time>
                        </>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {tickets.length === 0 && !error && (
          <p className="rounded-[10px] border border-line bg-white px-4 py-8 text-center text-sm text-muted">
            {mine && !filter
              ? "Nothing is assigned to you right now. Take a ticket from Everyone's."
              : filter
                ? `No ${STATUS_LABEL[filter].toLowerCase()} tickets.`
                : "No tickets for your department right now."}
          </p>
        )}
      </main>
    </div>
  );
}

// The inbox address for a status filter and the Mine switch, kept together so
// changing one doesn't lose the other.
function inboxHref(status: TicketStatus | undefined, mine: boolean) {
  const q = new URLSearchParams();
  if (status) q.set("status", status);
  if (mine) q.set("mine", "1");
  const query = q.toString();
  return query ? `/agent?${query}` : "/agent";
}
