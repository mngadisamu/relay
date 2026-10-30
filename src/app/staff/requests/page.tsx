// prefetch on links: Next.js fetches the page in the background before the click,
// so it opens instantly instead of showing a loading screen.
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusPill } from "@/components/StatusPill";
import { StaffNav } from "../StaffNav";
import { formatWhen, latestUpdate, type TicketStatus } from "../status";

type Row = {
  id: number;
  reference: string;
  subject: string;
  department: string | null;
  status: TicketStatus;
  created_at: string;
  assigned_at: string | null;
  answered_at: string | null;
  closed_at: string | null;
};

// My requests (S1-26, mockup screen 4): newest first, status in words and colour.
// Row-level security (S1-15) means a plain select only returns this user's tickets.
export default async function MyRequests() {
  await requireRole(["staff"]);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tickets")
    .select("id, reference, subject, department, status, created_at, assigned_at, answered_at, closed_at")
    .order("created_at", { ascending: false });
  const requests = (data ?? []) as Row[];

  return (
    <div className="min-h-screen bg-page">
      <StaffNav current="requests" />
      <main className="mx-auto max-w-3xl space-y-3 px-4 py-5">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-xl font-semibold text-ink">My requests</h1>
          <span className="text-[13px] text-muted">
            {requests.length} {requests.length === 1 ? "request" : "requests"} · newest first
          </span>
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-[#fdecea] p-3 text-sm text-[#a4231a]">
            Couldn&apos;t load your requests. Please refresh the page.
          </p>
        )}

        {requests.length === 0 && !error ? (
          <div className="rounded-[10px] border border-line bg-white p-6 text-center">
            <p className="text-sm text-ink-2">You haven&apos;t sent any requests yet.</p>
            <Link prefetch href="/staff" className="mt-3 inline-block text-sm font-semibold text-brand hover:text-brand-dark">
              Submit a request
            </Link>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {requests.map((r) => {
              const update = latestUpdate(r);
              return (
              <li key={r.id}>
                <Link
                  prefetch
                  href={`/staff/requests/${r.id}`}
                  className="block space-y-2 rounded-[10px] border border-line bg-white px-4 py-3.5 hover:border-field"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[15px] font-semibold leading-[21px] text-ink">{r.subject}</span>
                    <StatusPill status={r.status} />
                  </div>
                  <p className="text-[13px] tabular-nums text-muted">
                    {r.reference} · {r.department ?? "Not routed yet"}
                  </p>
                  {/* Sent time, plus the latest change once there is one (e.g. "Replied Today, 10:05"). */}
                  <p className="text-[13px] tabular-nums text-ink-2">
                    Sent <time dateTime={r.created_at}>{formatWhen(r.created_at)}</time>
                    {update.label !== "Sent" && (
                      <>
                        {" · "}
                        <span className="font-medium">{update.label}</span> <time dateTime={update.at}>{formatWhen(update.at)}</time>
                      </>
                    )}
                  </p>
                </Link>
              </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
