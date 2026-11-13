import type { createClient } from "@/lib/supabase/server";

// Everything the audit log screen (S2-12) and its CSV export share, so the two
// always show the same entries with the same wording.
// The actions and their details are listed in docs/audit-actions.md (S2-07).

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Plain-words name for each action, in the order a ticket meets them.
export const ACTION_LABEL: Record<string, string> = {
  classify: "AI routing",
  confirm_department: "Department confirmed",
  reroute: "Moved to another department",
  assign: "Assigned",
  draft: "AI draft",
  send: "Reply sent",
  close: "Closed",
  reopen: "Reopened",
  template_edit: "Template edited",
  user_create: "Person added",
  role_change: "Role changed",
  user_deactivate: "Person removed",
  user_update: "Details updated",
  user_email_change: "Email changed",
  password_reset_sent: "Password reset sent",
  user_reactivate: "Person brought back",
  insight_generate: "Weekly summary",
  report_download: "Report downloaded",
  risk_report_download: "Risk report downloaded",
  flag: "Reply flagged",
  flag_resolve: "Flag reviewed",
};
export const ACTIONS = Object.keys(ACTION_LABEL);

export type AuditFilters = {
  actions?: string[]; // any of ACTIONS; none means all actions
  from?: string; // "2026-11-01", a day in South African time
  to?: string; // "2026-11-13", included
  ref?: string; // part of a ticket reference, e.g. "KF-261105"
};

export type AuditEntry = {
  id: number;
  createdAt: string;
  action: string;
  actionLabel: string;
  who: string;
  reference: string | null;
  summary: string;
  details: Record<string, unknown>;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

// Read the filters from the page address, ignoring anything that isn't valid.
export function readFilters(params: Record<string, string | string[] | undefined>): AuditFilters {
  const ref = String(params.ref ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  // The action checkboxes send one value each, so there can be several (or none).
  const picked = (Array.isArray(params.action) ? params.action : [params.action]).filter(
    (a): a is string => typeof a === "string" && ACTIONS.includes(a),
  );
  return {
    actions: picked.length > 0 ? picked : undefined,
    from: typeof params.from === "string" && DAY.test(params.from) ? params.from : undefined,
    to: typeof params.to === "string" && DAY.test(params.to) ? params.to : undefined,
    ref: ref || undefined,
  };
}

// The same filters as a query string, for the Export CSV link.
export function filtersToQuery(f: AuditFilters) {
  const q = new URLSearchParams();
  for (const a of f.actions ?? []) q.append("action", a);
  if (f.from) q.set("from", f.from);
  if (f.to) q.set("to", f.to);
  if (f.ref) q.set("ref", f.ref);
  return q.toString();
}

// The start of a South African day as a UTC moment (SAST is UTC+2 all year).
function startOfSastDay(day: string, addDays = 0) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + addDays, 0, 0, 0) - 2 * 60 * 60 * 1000).toISOString();
}

// Load the entries that match the filters. Newest first, except when looking at
// one ticket's history, which reads oldest first (classify → … → close).
// Row-level security (0004) only lets managers and compliance read audit_log.
export async function loadAuditEntries(supabase: Supabase, f: AuditFilters, limit: number) {
  let query = supabase
    .from("audit_log")
    .select("id, action, details, created_at, ticket_id, tickets(reference), profiles(full_name)")
    .order("created_at", { ascending: Boolean(f.ref) })
    .order("id", { ascending: Boolean(f.ref) })
    .limit(limit);

  if (f.actions?.length) query = query.in("action", f.actions);
  if (f.from) query = query.gte("created_at", startOfSastDay(f.from));
  if (f.to) query = query.lt("created_at", startOfSastDay(f.to, 1));

  if (f.ref) {
    const { data: tickets } = await supabase.from("tickets").select("id").eq("is_historical", false).ilike("reference", `%${f.ref}%`).limit(50);
    const ids = (tickets ?? []).map((t) => t.id as number);
    if (ids.length === 0) return { entries: [] as AuditEntry[], error: null };
    query = query.in("ticket_id", ids);
  }

  const { data, error } = await query;
  if (error) return { entries: [] as AuditEntry[], error: error.message };

  type Row = {
    id: number;
    action: string;
    details: Record<string, unknown> | null;
    created_at: string;
    tickets: { reference: string } | null;
    profiles: { full_name: string } | null;
  };
  const rows = (data ?? []) as unknown as Row[];

  // Some details hold people's ids (who it was assigned to, who was added).
  // Look their names up once, for all rows together.
  const personIds = new Set<string>();
  for (const r of rows) {
    for (const key of ["assigned_to", "previous", "user_id"]) {
      const v = r.details?.[key];
      if (typeof v === "string") personIds.add(v);
    }
  }
  const names = new Map<string, string>();
  if (personIds.size > 0) {
    const { data: people } = await supabase.from("profiles").select("id, full_name").in("id", [...personIds]);
    for (const p of people ?? []) names.set(p.id as string, p.full_name as string);
  }

  const entries: AuditEntry[] = rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    action: r.action,
    actionLabel: ACTION_LABEL[r.action] ?? r.action,
    who: r.profiles?.full_name ?? "Unknown",
    reference: r.tickets?.reference ?? null,
    summary: summarize(r.action, r.details ?? {}, names),
    details: r.details ?? {},
  }));
  return { entries, error: null };
}

// One plain sentence per entry, from its details (docs/audit-actions.md).
export function summarize(action: string, d: Record<string, unknown>, names: Map<string, string>): string {
  const text = (key: string) => (d[key] === null || d[key] === undefined ? "" : String(d[key]));
  const person = (key: string) => names.get(text(key)) ?? "someone";

  switch (action) {
    case "classify": {
      const pct = Math.round(Number(d.confidence ?? 0) * 100);
      return `AI routed it to ${text("department")} (${pct}% sure)${d.needs_review ? ", marked Needs review" : ""}`;
    }
    case "draft":
      return d.ai_generated === false
        ? `Template used in ${text("tone")} tone (AI unavailable)`
        : `AI draft written in ${text("tone")} tone`;
    case "send":
      return `Reply sent in ${text("tone")} tone${d.edited_ai_draft ? ", started from an AI draft" : ", written without an AI draft"}`;
    case "reroute":
      return `Moved from ${text("from")} to ${text("to")}`;
    case "confirm_department":
      return `Confirmed ${text("department")} is the right department`;
    case "assign":
      return `Assigned to ${person("assigned_to")}${d.previous ? ` (was ${person("previous")})` : ""}`;
    case "close":
      return d.closed_by_role === "staff" ? "Closed by the person who sent it" : `Closed by the ${text("closed_by_role")}`;
    case "reopen":
      return "Reopened: the person who sent it still needs help";
    case "template_edit":
      return `Edited the ${text("department")} "${text("name")}" template`;
    case "user_create":
      return `Added ${person("user_id")} as ${text("role")}${d.department ? ` in ${text("department")}` : ""}`;
    case "role_change":
      return `Changed ${person("user_id")} from ${text("from_role")} to ${text("to_role")}${d.to_department ? ` in ${text("to_department")}` : ""}`;
    case "risk_report_download":
      return `Downloaded the risk report for ${text("from")} to ${text("to")}`;
    case "user_update":
      return `Updated ${person("user_id")}'s ${(Array.isArray(d.changed) ? d.changed : []).map((f) => (f === "full_name" ? "name" : String(f))).join(" and ")}`;
    case "user_email_change":
      return `Changed ${person("user_id")}'s sign-in email`;
    case "password_reset_sent":
      return `Sent ${person("user_id")} a link to choose a new password`;
    case "user_deactivate":
      return `Removed ${person("user_id")} from Relay${Number(d.tickets_returned) > 0 ? ` (${text("tickets_returned")} open tickets back to the inbox)` : ""}`;
    case "user_reactivate":
      return `Brought ${person("user_id")} back as ${text("role")}${d.department ? ` in ${text("department")}` : ""}`;
    case "insight_generate":
      return `Weekly summary for ${d.department ? text("department") : "all departments"}${d.ai_generated === false ? " (numbers only, AI unavailable)" : ", written by AI"}`;
    case "report_download":
      return `Downloaded the ${text("department")} report for the week of ${text("week_start")}`;
    case "flag":
      return `Reply flagged${d.source === "auto" ? " automatically" : ""}: ${text("reason")}`;
    case "flag_resolve":
      return d.outcome === "ok" ? "Flag reviewed: no change needed" : "Flag reviewed: needs a change";
    default:
      return JSON.stringify(d);
  }
}

// "Tue 3 Nov 2026, 14:05" in South African time.
export function formatExact(iso: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
  return parts.replace(/,/g, "").replace(/(\d{4}) /, "$1, ").replace("Sept", "Sep");
}

// The entries as a CSV file (opens in Excel). Times in South African time.
export function toCsv(entries: AuditEntry[]) {
  const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const sast = (iso: string) =>
    new Intl.DateTimeFormat("sv-SE", { timeZone: "Africa/Johannesburg", dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
  const header = ["Time (SAST)", "Who", "Action", "Ticket", "Summary", "Details"];
  const lines = entries.map((e) =>
    [sast(e.createdAt), e.who, e.actionLabel, e.reference ?? "", e.summary, JSON.stringify(e.details)].map(cell).join(","),
  );
  // The first character tells Excel the file is UTF-8, so names with accents show correctly.
  return "﻿" + [header.map(cell).join(","), ...lines].join("\r\n");
}
