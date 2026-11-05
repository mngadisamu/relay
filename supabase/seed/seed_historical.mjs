// S1-17: load a year of past tickets into the database, for the Sprint 2 dashboard
// and the Sprint 3 workload forecast.
//
// Reads data/processed/combined_tickets.csv (built by data/scripts/combine_tickets.py)
// and inserts every ticket with is_historical = true and its original dates.
//
// Safe to run twice: each past ticket has a fixed reference (e.g. KF-260614-H04512),
// and tickets whose reference is already in the database are skipped.
//
// This is the ONE place the service-role ("secret") key is used, because these
// tickets have no submitter and must skip row-level security. The key is read
// from .env.local on your own laptop and is never committed.
//
// Run from the repo root:
//   node supabase/seed/seed_historical.mjs --check   (reads the file only, changes nothing)
//   node supabase/seed/seed_historical.mjs           (loads the tickets)

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const FILE = "data/processed/combined_tickets.csv";
const BATCH = 500; // rows per request, so no single request is too big
const checkOnly = process.argv.includes("--check");

// A small CSV reader: handles commas, quotes and line breaks inside quoted text.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...data] = rows.filter((r) => r.length > 1 || r[0] !== "");
  return data.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

const DEPARTMENTS = ["HR", "IT", "Finance", "Operations"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

const tickets = parseCsv(readFileSync(FILE, "utf8")).map((t) => ({
  reference: t.reference,
  subject: t.subject,
  description: t.description,
  department: t.department,
  priority: t.priority,
  depot: t.depot,
  status: t.status,
  created_at: t.created_at,
  answered_at: t.answered_at || null,
  closed_at: t.closed_at || null,
  is_historical: true, // keeps them out of the agent inbox and staff lists
  needs_review: false,
  submitted_by: null, // past tickets aren't linked to Relay accounts
}));

// Check the file before touching the database.
const problems = tickets.filter(
  (t) => !t.reference || !t.subject || !t.description || !DEPARTMENTS.includes(t.department) || !PRIORITIES.includes(t.priority) || !t.created_at,
);
console.log(`Read ${tickets.length} tickets from ${FILE}.`);
if (problems.length > 0) {
  console.error(`${problems.length} tickets have missing or wrong values, e.g. ${problems[0].reference}. Nothing was loaded.`);
  process.exit(1);
}
const counts = Object.fromEntries(DEPARTMENTS.map((d) => [d, tickets.filter((t) => t.department === d).length]));
console.log("Per department:", counts);
if (checkOnly) {
  console.log("Check only: the file is fine. Run again without --check to load it.");
  process.exit(0);
}

// Connect with the secret key from .env.local.
try {
  process.loadEnvFile(".env.local");
} catch {
  console.error("Couldn't read .env.local. Run this from the relay folder, where .env.local is.");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secretKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set in .env.local.");
  process.exit(1);
}
const supabase = createClient(url, secretKey, { auth: { persistSession: false } });

async function countHistorical() {
  const { count, error } = await supabase.from("tickets").select("id", { count: "exact", head: true }).eq("is_historical", true);
  if (error) throw error;
  return count ?? 0;
}

const before = await countHistorical();
console.log(`Past tickets already in the database: ${before}.`);

for (let i = 0; i < tickets.length; i += BATCH) {
  const batch = tickets.slice(i, i + BATCH);
  // ignoreDuplicates: a ticket whose reference already exists is skipped, not changed.
  const { error } = await supabase.from("tickets").upsert(batch, { onConflict: "reference", ignoreDuplicates: true });
  if (error) {
    console.error(`Stopped at ticket ${i + 1}: ${error.message}`);
    console.error("Tickets loaded before this point are kept; fix the problem and run again (duplicates are skipped).");
    process.exit(1);
  }
  process.stdout.write(`\rLoaded ${Math.min(i + BATCH, tickets.length)} of ${tickets.length}`);
}

const after = await countHistorical();
console.log(`\nDone. Past tickets in the database: ${after} (${after - before} new).`);
