// S2-21 bias test, parts 1 and 2: does the classifier route a request differently
// because of the person's name or depot? Runs Relay's real classifier code.
//
// Run from the repo root (no keys needed):
//   npx tsx scripts/bias-test-classifier.ts
// It prints a summary and writes docs/responsible-ai/bias-test-classifier.md.

import { writeFileSync } from "node:fs";
import { classify, REVIEW_THRESHOLD } from "../src/lib/classifier";
import { DEPOTS, NAMES, REQUESTS, withDepot, withName } from "./bias-requests";

type Row = { subject: string; expected: string; results: { label: string; department: string; confidence: number }[] };

function run(labels: string[], fill: (i: number, label: string) => { subject: string; description: string }) {
  return REQUESTS.map((r, i): Row => ({
    subject: r.subject,
    expected: r.department,
    results: labels.map((label) => {
      const req = fill(i, label);
      const c = classify(req.subject, req.description);
      return { label, department: c.department, confidence: c.confidence };
    }),
  }));
}

// The plain request, with no name or depot, to compare against.
const baseline = REQUESTS.map((r) => classify(r.subject, r.description));
const byName = run(NAMES, (i, name) => withName(REQUESTS[i], name));
const byDepot = run(DEPOTS, (i, depot) => withDepot(REQUESTS[i], depot));

// A request "changes" when not every version went to the same department.
const changed = (rows: Row[]) => rows.filter((r) => new Set(r.results.map((x) => x.department)).size > 1);
const pct = (n: number) => `${Math.round(n * 100)}%`;

// The biggest confidence gap between versions of the same request, to show
// small effects even when the department stays the same.
const maxGap = (rows: Row[]) =>
  Math.max(...rows.map((r) => Math.max(...r.results.map((x) => x.confidence)) - Math.min(...r.results.map((x) => x.confidence))));

// Accuracy per name or depot: how many of the 40 went to the right department.
// Also how many would be marked "Needs review" (confidence under 60%), which
// means an agent has to check them by hand.
const accuracy = (rows: Row[], labels: string[]) =>
  labels.map((label) => {
    const mine = rows.map((r) => ({ expected: r.expected, ...r.results.find((x) => x.label === label)! }));
    const right = mine.filter((x) => x.department === x.expected).length;
    const review = mine.filter((x) => x.confidence < REVIEW_THRESHOLD).length;
    const avgConf = mine.reduce((s, x) => s + x.confidence, 0) / mine.length;
    return { label, right, review, avgConf };
  });
const base = {
  right: baseline.filter((c, i) => c.department === REQUESTS[i].department).length,
  review: baseline.filter((c) => c.confidence < REVIEW_THRESHOLD).length,
  avgConf: baseline.reduce((s, c) => s + c.confidence, 0) / baseline.length,
};

function table(title: string, rows: Row[], labels: string[]) {
  const lines = [`### ${title}`, "", `| ${["Request", "Should go to", ...labels].join(" | ")} |`, `| ${["---", "---", ...labels.map(() => "---")].join(" | ")} |`];
  for (const r of rows) {
    lines.push(`| ${[r.subject, r.expected, ...r.results.map((x) => `${x.department} (${pct(x.confidence)})`)].join(" | ")} |`);
  }
  return lines.join("\n");
}

const nameChanged = changed(byName);
const depotChanged = changed(byDepot);
const nameAcc = accuracy(byName, NAMES);
const depotAcc = accuracy(byDepot, DEPOTS);

const md = [
  "# Bias test: the classifier (S2-21, parts 1 and 2)",
  "",
  "Written by `scripts/bias-test-classifier.ts` (run it again with `npx tsx scripts/bias-test-classifier.ts`). Don't edit by hand.",
  "",
  `40 everyday requests (10 per department). Each one was sent **once per name** (signed "Thanks, [name]") and **once per depot** ("I work at [depot]."), with nothing else changed, through Relay's real classifier (\`src/lib/classifier.ts\`).`,
  "",
  "## Summary",
  "",
  `- **Names:** ${nameChanged.length} of 40 requests went to a different department depending on the name. Biggest confidence difference between names for the same request: ${pct(maxGap(byName))}.`,
  `- **Depots:** ${depotChanged.length} of 40 requests went to a different department depending on the depot. Biggest confidence difference: ${pct(maxGap(byDepot))}.`,
  "",
  "| Version | Right department (of 40) | Needs review (of 40) | Average confidence |",
  "| --- | --- | --- | --- |",
  `| No name, no depot | ${base.right} | ${base.review} | ${pct(base.avgConf)} |`,
  ...nameAcc.map((a) => `| Signed ${a.label} | ${a.right} | ${a.review} | ${pct(a.avgConf)} |`),
  ...depotAcc.map((a) => `| "I work at ${a.label}." | ${a.right} | ${a.review} | ${pct(a.avgConf)} |`),
  "",
  "## Requests that changed",
  "",
  nameChanged.length ? table("By name", nameChanged, NAMES) : "**By name:** none. Every request went to the same department for all four names.",
  "",
  depotChanged.length ? table("By depot", depotChanged, DEPOTS) : "**By depot:** none. Every request went to the same department for all three depots.",
  "",
  "## Every result",
  "",
  table("By name", byName, NAMES),
  "",
  table("By depot", byDepot, DEPOTS),
  "",
].join("\n");

writeFileSync("docs/responsible-ai/bias-test-classifier.md", md);
console.log(`No name or depot: ${base.right}/40 right, ${base.review} need review, avg ${pct(base.avgConf)}`);
console.log(`Names: ${nameChanged.length} of 40 changed department; biggest confidence gap ${pct(maxGap(byName))}`);
console.log(nameAcc.map((a) => `  ${a.label}: ${a.right}/40 right, ${a.review} need review, avg ${pct(a.avgConf)}`).join("\n"));
console.log(`Depots: ${depotChanged.length} of 40 changed department; biggest confidence gap ${pct(maxGap(byDepot))}`);
console.log(depotAcc.map((a) => `  ${a.label}: ${a.right}/40 right, ${a.review} need review, avg ${pct(a.avgConf)}`).join("\n"));
console.log("Wrote docs/responsible-ai/bias-test-classifier.md");
