import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";

type Ticket = {
  id: number;
  reference: string;
  subject: string;
  depot: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "received" | "assigned" | "answered" | "closed";
  needs_review: boolean;
  created_at: string;
};

const STATUSES = ["received", "assigned", "answered", "closed"] as const;

// Most urgent first (S1-19).
const PRIORITY_RANK: Record<Ticket["priority"], number> = { urgent: 0, high: 1, medium: 2, low: 3 };

// Status in words AND colour (WCAG: never colour alone).
const STATUS_STYLE: Record<Ticket["status"], string> = {
  received: "bg-gray-100 text-gray-800",
  assigned: "bg-blue-50 text-blue-800",
  answered: "bg-green-50 text-green-800",
  closed: "bg-gray-200 text-gray-800",
};
const PRIORITY_STYLE: Record<Ticket["priority"], string> = {
  urgent: "bg-red-50 text-red-800",
  high: "bg-orange-50 text-orange-900",
  medium: "bg-gray-100 text-gray-800",
  low: "bg-gray-50 text-gray-700",
};

// Agent inbox (S1-19): only the agent's department, most urgent first then oldest,
// a status filter, and "Needs review" clearly marked.
export default async function AgentInbox({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const profile = await requireRole(["agent"]);
  const { status } = await searchParams;
  const filter = STATUSES.find((s) => s === status);

  // A plain select is enough: row-level security (S1-15) only returns
  // tickets from this agent's department.
  const supabase = await createClient();
  let query = supabase
    .from("tickets")
    .select("id, reference, subject, depot, priority, status, needs_review, created_at")
    .eq("is_historical", false);
  if (filter) query = query.eq("status", filter);
  const { data, error } = await query;

  const tickets = ((data ?? []) as Ticket[]).sort(
    (a, b) =>
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-600">Relay · {profile.department ?? "No department"}</p>
          <h1 className="text-2xl font-semibold text-gray-900">Inbox</h1>
          <p className="text-sm text-gray-600">Most urgent first, then oldest</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/agent/templates" className="text-sm font-medium text-blue-700 hover:underline">
            Templates
          </Link>
          <form action={signOut}>
            <button type="submit" className="rounded-md border border-gray-400 px-3 py-1.5 text-sm">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {[undefined, ...STATUSES].map((s) => {
          const active = s === filter;
          return (
            <Link
              key={s ?? "all"}
              href={s ? `/agent?status=${s}` : "/agent"}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
                active ? "bg-blue-700 text-white" : "border border-gray-300 bg-white text-gray-800"
              }`}
            >
              {s ?? "All"}
            </Link>
          );
        })}
      </nav>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          Couldn&apos;t load tickets: {error.message}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th scope="col" className="px-4 py-3">Priority</th>
              <th scope="col" className="px-4 py-3">Subject</th>
              <th scope="col" className="px-4 py-3">Reference</th>
              <th scope="col" className="px-4 py-3">Depot</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tickets.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${PRIORITY_STYLE[t.priority]}`}>
                    {t.priority}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/agent/${t.id}`} className="font-semibold text-gray-900 hover:underline">
                      {t.subject}
                    </Link>
                    {t.needs_review && (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                        Needs review
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700">{t.reference}</td>
                <td className="px-4 py-3 text-gray-700">{t.depot ?? "Not given"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[t.status]}`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {new Date(t.created_at).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tickets.length === 0 && !error && (
          <p className="p-6 text-center text-sm text-gray-600">
            {filter ? `No ${filter} tickets.` : "No tickets for your department right now."}
          </p>
        )}
      </div>
    </main>
  );
}