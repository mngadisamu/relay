// S4-14 Demo reset. Local only. Never imported by the app.
//
// Puts the live demo tickets, approvals and replies back to one scripted set, so every
// demo starts from the same state. Historical tickets (is_historical = true) are never touched.
// Running it twice gives the same result: the live demo rows are removed first, then re-created.
//
// Run from the project folder (Node 20.6 or newer):
//   node --env-file=.env.local scripts/reset-demo.mjs
//
// It uses SUPABASE_SERVICE_ROLE_KEY from .env.local. That key bypasses row-level security,
// so it belongs in this script only, never in app code.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

// 1. Find the test accounts by email (the emails are not stored in code otherwise).
const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ perPage: 200 });
if (listError) throw listError;
function idFor(email) {
  const user = listed.users.find((u) => u.email === email);
  if (!user) throw new Error(`Test account not found: ${email}. Ask Samukelo to check the test accounts.`);
  return user.id;
}
const staffId = idFor("staff@relay.test");
const staffTwoId = idFor("staff2@relay.test");

// 2. Remove the live demo tickets and everything that points at them. Children first.
const { data: live, error: liveError } = await supabase.from("tickets").select("id").eq("is_historical", false);
if (liveError) throw liveError;
const liveIds = live.map((t) => t.id);
if (liveIds.length > 0) {
  for (const table of ["flags", "responses", "classifications", "ticket_messages", "approvals", "audit_log"]) {
    const { error } = await supabase.from(table).delete().in("ticket_id", liveIds);
    if (error) throw new Error(`Could not clear ${table}: ${error.message}`);
  }
  const { error } = await supabase.from("tickets").delete().in("id", liveIds);
  if (error) throw new Error(`Could not clear tickets: ${error.message}`);
}

// 3. The scripted set: a Finance purchase and a leave request waiting for approval,
//    and an HR ticket with an AI draft waiting for an agent.
const scripted = [
  {
    submitted_by: staffId,
    subject: "Replacement tyres for truck KF-14",
    description: "Two front tyres worn below the legal limit. Quote attached to the purchase request.",
    depot: "Depot 2",
    department: "Finance",
    priority: "high",
    status: "awaiting_approval",
    request_type: "purchase",
    amount: 6400,
    kind: "approval",
  },
  {
    submitted_by: staffTwoId,
    subject: "Annual leave, 3 to 5 December",
    description: "Three days of annual leave. Cover is arranged with the depot team.",
    depot: "Head office",
    department: "HR",
    priority: "low",
    status: "awaiting_approval",
    request_type: "leave",
    amount: null,
    kind: "approval",
  },
  {
    submitted_by: staffId,
    subject: "Payslip shows the wrong tax",
    description: "The tax on my October payslip looks higher than last month. Can someone check it?",
    depot: "Head office",
    department: "HR",
    priority: "medium",
    status: "assigned",
    request_type: null,
    amount: null,
    kind: "draft",
  },
];

// Insert one ticket at a time, so each row is matched with its own kind.
// Each ticket gets a classification, like a real submission, and the approval or draft its kind needs.
for (const spec of scripted) {
  const row = Object.fromEntries(Object.entries(spec).filter(([key]) => key !== "kind"));
  const { data: ticket, error: insertError } = await supabase
    .from("tickets")
    .insert(row)
    .select("id, submitted_by, department, request_type, amount, status")
    .single();
  if (insertError) throw insertError;

  const { error: classError } = await supabase.from("classifications").insert({
    ticket_id: ticket.id,
    predicted_department: ticket.department,
    confidence: 0.9,
    model_version: "tfidf-logreg-v2",
  });
  if (classError) throw classError;

  if (spec.kind === "approval") {
    const { error: approvalError } = await supabase.from("approvals").insert({
      ticket_id: ticket.id,
      requested_by: ticket.submitted_by,
      decision: "pending",
    });
    if (approvalError) throw approvalError;

    const { error: auditError } = await supabase.from("audit_log").insert({
      actor: ticket.submitted_by,
      action: "approval_request",
      ticket_id: ticket.id,
      details: { request_type: ticket.request_type, amount: ticket.amount, department: ticket.department },
    });
    if (auditError) throw auditError;
  }

  if (spec.kind === "draft") {
    const { error: draftError } = await supabase.from("responses").insert({
      ticket_id: ticket.id,
      tone: "formal",
      ai_draft:
        "Dear colleague, thank you for your message about your October payslip. We are checking the tax calculation now and will come back to you within two working days.",
      ai_generated: true,
    });
    if (draftError) throw draftError;
  }
}

console.log(`Demo reset done. Removed ${liveIds.length} live ticket(s) and created ${scripted.length} scripted ticket(s).`);
console.log("Historical tickets were not changed.");
