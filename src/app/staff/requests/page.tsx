import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StaffNav } from "../StaffNav";
import { STATUS_LABEL, STATUS_STYLE, formatWhen, type TicketStatus } from "../status";

type Row = {
  id: number;
  reference: string;
  subject: string;
  department: string | null;
  status: TicketStatus;
  created_at: string;
};

// My requests (S1-26): newest first, status in words and colour.
// Row-level security (S1-15) means a plain select only returns this user's tickets.
export default async function MyRequests() {
  await requireRole(["staff"]);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tickets")
    .select("id, reference, subject, department, status, created_at")
    .order("created_at", { ascending: false });
  const requests = (data ?? []) as Row[];

  return (
    <div className="min-h-screen bg-gray-50">
      <StaffNav current="requests" />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-xl font-semibold text-gray-900">My requests</h1>
          <span className="text-sm text-gray-600">{requests.length} · newest first</span>
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            Couldn&apos;t load your requests. Please refresh the page.
          </p>
        )}

        {requests.length === 0 && !error ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
            <p className="text-sm text-gray-700">You haven&apos;t sent any requests yet.</p>
            <Link href="/staff" className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:underline">
              Submit a request
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {requests.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/staff/requests/${r.id}`}
                  className="block space-y-2 rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-400"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-semibold text-gray-900">{r.subject}</span>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {r.reference} · {r.department ?? "Not routed yet"} · {formatWhen(r.created_at)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
