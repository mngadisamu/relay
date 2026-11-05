import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RoleHeader } from "@/components/RoleHeader";
import { FlagReply, FlagTag } from "@/components/FlagReply";
import { COMPLIANCE_MENU, MANAGER_MENU } from "@/lib/menus";
import { FLAG_COLUMNS, type Flag, type FlagKind } from "@/lib/flags";
import { formatExact } from "../audit/audit";
import { ResolveForm } from "./ResolveForm";
import { ReplyCompare, TicketLine, type ResponseBits } from "./ReplyParts";

// Flagged replies (S2-26): AI replies that need a second look, so compliance
// doesn't have to read every reply. Open flags first; Resolve asks for a note.
// "Recent AI replies" lets compliance flag a reply by hand.
// Managers can look; only compliance resolves (resolve_flag(), migration 0011).

const LIST_LIMIT = 100;
type View = "open" | "reviewed" | "replies";

type FlagRow = Flag & {
  flagged_by: string;
  resolved_by: string | null;
  resolution_note: string | null;
  responses: ResponseBits | null;
};

export default async function FlaggedRepliesPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const profile = await requireRole(["compliance", "manager"]);
  const { show } = await searchParams;
  const view: View = show === "reviewed" || show === "replies" ? show : "open";
  const isManager = profile.role === "manager";
  const canResolve = profile.role === "compliance";

  const supabase = await createClient();
  const responseCols = "id, ai_draft, final_text, sent_at, sent_by, tickets(reference, subject, department)";

  // The tab counts, without fetching the rows.
  const [{ count: openCount }, { count: reviewedCount }] = await Promise.all([
    supabase.from("flags").select("id", { count: "exact", head: true }).is("resolved_at", null),
    supabase.from("flags").select("id", { count: "exact", head: true }).not("resolved_at", "is", null),
  ]);

  let flags: FlagRow[] = [];
  let replies: (ResponseBits & { flags: Flag[] })[] = [];
  let loadError: string | null = null;

  if (view === "replies") {
    // The latest replies that started from a Gemini draft, with their flags.
    const { data, error } = await supabase
      .from("responses")
      .select(responseCols)
      .not("sent_at", "is", null)
      .eq("ai_generated", true)
      .order("sent_at", { ascending: false })
      .limit(30)
      .returns<ResponseBits[]>();
    loadError = error?.message ?? null;
    const ids = (data ?? []).map((r) => r.id);
    const { data: flagRows } = ids.length
      ? await supabase.from("flags").select(`${FLAG_COLUMNS}, response_id`).in("response_id", ids)
      : { data: [] };
    replies = (data ?? []).map((r) => ({
      ...r,
      flags: ((flagRows ?? []) as (Flag & { response_id: number })[]).filter((f) => f.response_id === r.id),
    }));
  } else {
    const query = supabase
      .from("flags")
      .select(`${FLAG_COLUMNS}, flagged_by, resolved_by, resolution_note, responses(${responseCols})`)
      .limit(LIST_LIMIT);
    const { data, error } =
      view === "open"
        ? await query.is("resolved_at", null).order("created_at", { ascending: false }).returns<FlagRow[]>()
        : await query.not("resolved_at", "is", null).order("resolved_at", { ascending: false }).returns<FlagRow[]>();
    loadError = error?.message ?? null;
    flags = data ?? [];
  }

  // Names for "Sent by", "Flagged by" and "Reviewed by" (compliance and managers
  // can read every profile, migration 0006).
  const ids = new Set<string>();
  for (const f of flags) [f.flagged_by, f.resolved_by, f.responses?.sent_by].forEach((id) => id && ids.add(id));
  for (const r of replies) if (r.sent_by) ids.add(r.sent_by);
  const names = new Map<string, string>();
  if (ids.size) {
    const { data } = await supabase.from("profiles").select("id, full_name").in("id", [...ids]);
    for (const p of data ?? []) names.set(p.id, p.full_name ?? "Someone");
  }
  const name = (id: string | null | undefined) => (id ? (names.get(id) ?? "Someone") : "Someone");

  const tabs: { view: View; label: string }[] = [
    { view: "open", label: `Open (${openCount ?? 0})` },
    { view: "reviewed", label: `Reviewed (${reviewedCount ?? 0})` },
    { view: "replies", label: "Recent AI replies" },
  ];

  return (
    <div className="min-h-screen bg-page">
      <RoleHeader
        profile={profile}
        home={isManager ? "/manager" : "/compliance"}
        menu={isManager ? MANAGER_MENU : COMPLIANCE_MENU}
        current="/compliance/flags"
      />
      <main className="mx-auto max-w-[1100px] space-y-5 px-4 pb-12 pt-7 sm:px-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-ink">Flagged replies</h1>
          <p className="text-[15px] text-ink-2">
            Replies Relay or a colleague marked for a second look: an AI draft sent without edits, an amount or date
            nobody gave the AI, or a reason someone wrote. Times are South African time.
          </p>
        </div>

        <nav aria-label="Which replies" className="flex flex-wrap gap-1 border-b border-line">
          {tabs.map((t) => (
            <Link
              key={t.view}
              href={t.view === "open" ? "/compliance/flags" : `/compliance/flags?show=${t.view}`}
              aria-current={view === t.view ? "page" : undefined}
              className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium ${
                view === t.view ? "border-brand text-brand-dark" : "border-transparent text-ink-2 hover:text-ink"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {loadError && (
          <p role="alert" className="rounded-md border border-[#f0c8c3] bg-[#fdf1ef] px-3 py-2.5 text-sm text-[#a4231a]">
            The replies couldn&apos;t be loaded: {loadError}
          </p>
        )}

        {view !== "replies" && !loadError && flags.length === 0 && (
          <p className="rounded-[10px] border border-line bg-white px-4 py-6 text-center text-sm text-ink-2">
            {view === "open" ? "No open flags. Every flagged reply has been reviewed." : "No reviewed flags yet."}
          </p>
        )}

        {view !== "replies" && (
          <ul className="space-y-4">
            {flags.map((f) => (
              <li key={f.id} className="space-y-3 rounded-[10px] border border-line bg-white p-4">
                <TicketLine ticket={f.responses?.tickets ?? null} />
                <div className="flex flex-wrap items-center gap-2">
                  <FlagTag kind={f.kind as FlagKind} resolved={Boolean(f.resolved_at)} />
                  <p className="text-[13px] text-muted">
                    {f.source === "auto" ? "Flagged automatically when it was sent" : `Flagged by ${name(f.flagged_by)}`},{" "}
                    {formatExact(f.created_at)}
                  </p>
                </div>
                {f.note && (
                  <p className="text-sm text-ink">
                    <span className="font-medium">{f.kind === "invented_detail" ? "Not in the request or template: " : "Reason: "}</span>
                    {f.note}
                  </p>
                )}
                {f.responses && <ReplyCompare response={f.responses} sentBy={name(f.responses.sent_by)} highlight={f.kind === "invented_detail" ? f.note : null} />}

                {f.resolved_at ? (
                  <p className="rounded-md bg-page px-3 py-2.5 text-sm text-ink">
                    <span className="font-semibold">{f.outcome === "ok" ? "No change needed" : "Needs a change"}</span> ·
                    reviewed by {name(f.resolved_by)}, {formatExact(f.resolved_at)}
                    {f.resolution_note && <span className="mt-1 block text-ink-2">{f.resolution_note}</span>}
                  </p>
                ) : canResolve ? (
                  <ResolveForm flagId={f.id} />
                ) : (
                  <p className="text-[13px] text-muted">Waiting for compliance to review it.</p>
                )}
              </li>
            ))}
          </ul>
        )}

        {view === "replies" && (
          <>
            <p className="text-sm text-ink-2">The {replies.length} latest replies that started from an AI draft. Flag any that need a second look.</p>
            <ul className="space-y-4">
              {replies.map((r) => (
                <li key={r.id} className="space-y-3 rounded-[10px] border border-line bg-white p-4">
                  <TicketLine ticket={r.tickets} />
                  <ReplyCompare response={r} sentBy={name(r.sent_by)} highlight={null} />
                  <FlagReply responseId={r.id} flags={r.flags} idPrefix="recent" />
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
