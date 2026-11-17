import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RoleHeader } from "@/components/RoleHeader";
import { MANAGER_MENU } from "@/lib/menus";
import { formatWhen } from "@/app/staff/status";
import { DecisionForm } from "./DecisionForm";

// Approvals queue (S4-08): purchases and leave waiting for a decision, oldest first.
// RLS (migration 0023) shows a department manager only their department's approvals;
// a general manager sees all of them.
type Pending = {
  id: number;
  requested_at: string;
  ticket: {
    reference: string;
    subject: string;
    department: string | null;
    request_type: string | null;
    amount: number | null;
    depot: string | null;
  } | null;
};

const TYPE_LABEL: Record<string, string> = {
  purchase: "Purchase",
  leave: "Leave",
  system_access: "System access",
  other: "Other",
};

export default async function ApprovalsPage() {
  const profile = await requireRole(["manager"]);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("approvals")
    .select("id, requested_at, ticket:tickets(reference, subject, department, request_type, amount, depot)")
    .eq("decision", "pending")
    .order("requested_at", { ascending: true });
  const items = (data ?? []) as unknown as Pending[];

  return (
    <div className="min-h-screen bg-page">
      <RoleHeader profile={profile} home="/manager" menu={MANAGER_MENU} current="/manager/approvals" />
      <main className="mx-auto max-w-[900px] space-y-5 px-4 pb-12 pt-7 sm:px-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-ink sm:text-2xl">Approvals</h1>
          <p className="text-[15px] text-ink-2">
            Purchases over R5,000 and all leave wait here until a manager decides. Oldest first.
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-md border border-[#f0c8c3] bg-[#fdf1ef] px-3 py-2.5 text-sm text-[#a4231a]">
            The list couldn&apos;t be loaded: {error.message}
          </p>
        )}

        {!error && items.length === 0 && (
          <p className="rounded-[10px] border border-line bg-white p-5 text-sm text-ink-2">Nothing is waiting for approval.</p>
        )}

        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className="space-y-3 rounded-[10px] border border-line bg-white p-4">
              <div className="space-y-1">
                <p className="text-[13px] tabular-nums text-muted">{a.ticket?.reference ?? "Unknown request"}</p>
                <h2 className="font-semibold text-ink">{a.ticket?.subject ?? "Request"}</h2>
                <p className="text-sm text-ink-2">
                  {TYPE_LABEL[a.ticket?.request_type ?? ""] ?? "Request"}
                  {a.ticket?.amount != null ? ` · R${Number(a.ticket.amount).toLocaleString("en-ZA")}` : ""}
                  {a.ticket?.department ? ` · ${a.ticket.department}` : ""}
                  {` · Asked ${formatWhen(a.requested_at)}`}
                </p>
              </div>
              <DecisionForm approvalId={a.id} />
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
