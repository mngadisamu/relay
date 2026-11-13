import { jsPDF } from "jspdf";
import { AI_LABEL_CHECKS, BIAS_SUMMARY, formatDay, riskRows, type RiskMetrics } from "@/lib/risk";

// Draws the Risk report PDF (S2-30) in the weekly report layout
// (docs/report-template.md): a header band, numbered sections, a footer.
// Same numbers and wording as the page (src/lib/risk.ts).

const NAVY: [number, number, number] = [11, 61, 115]; // Relay navy (globals.css)
const INK: [number, number, number] = [23, 33, 45];
const MUTED: [number, number, number] = [91, 103, 117];
const LINE: [number, number, number] = [221, 226, 232];

export function buildRiskPdf(metrics: RiskMetrics, range: { from: string; to: string }): ArrayBuffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const left = 14;
  const width = 182;
  let y = 0;

  // A new page when the next block won't fit above the footer.
  const room = (needed: number) => {
    if (y + needed > 280) {
      doc.addPage();
      y = 16;
    }
  };
  const heading = (text: string) => {
    room(14);
    doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(...NAVY);
    doc.text(text.toUpperCase(), left, y);
    y += 7;
  };
  const paragraph = (text: string, size = 10, color = INK) => {
    doc.setFont("helvetica", "normal").setFontSize(size).setTextColor(...color);
    const lines = doc.splitTextToSize(text, width) as string[];
    room(lines.length * (size * 0.45) + 2);
    doc.text(lines, left, y);
    y += lines.length * (size * 0.45) + 2;
  };

  // Header band, with Relay's "routing" pattern behind the title.
  drawHeaderBand(doc);
  doc.setTextColor(255, 255, 255).setFont("helvetica", "bold").setFontSize(10);
  doc.text("RELAY HELP DESK", left, 13);
  doc.setFontSize(18).text("AI Risk Report", left, 23);
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(`${formatDay(range.from)} to ${formatDay(range.to)}`, 196, 25, { align: "right" });
  y = 46;
  paragraph("How Relay's AI behaved over this period. Live requests only; times are South African time.", 10, MUTED);
  y += 4;

  // Section 1: the numbers, as boxes, three to a row
  heading("Section 1: How the AI was used");
  const rows = riskRows(metrics);
  const boxW = (width - 8) / 3;
  const boxH = 34;
  rows.forEach((row, i) => {
    if (i % 3 === 0) room(boxH + 4);
    const x = left + (i % 3) * (boxW + 4);
    doc.setDrawColor(...LINE).setFillColor(247, 248, 250).roundedRect(x, y, boxW, boxH, 2, 2, "FD");
    doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...MUTED);
    doc.text(doc.splitTextToSize(row.label, boxW - 6) as string[], x + 3, y + 6);
    doc.setFont("helvetica", "bold").setFontSize(16).setTextColor(...INK);
    doc.text(row.value, x + 3, y + 17);
    doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...MUTED);
    doc.text((doc.splitTextToSize(row.note, boxW - 6) as string[]).slice(0, 4), x + 3, y + 23);
    if (i % 3 === 2 || i === rows.length - 1) y += boxH + 4;
  });
  y += 4;

  // Section 2: bias test
  heading("Section 2: Bias test");
  paragraph(`The same requests sent with four names and three depots, run on ${BIAS_SUMMARY.ranOn}.`, 10, MUTED);
  for (const point of BIAS_SUMMARY.points) paragraph(`•  ${point}`);
  paragraph("The full bias test is in its own PDF, from the Risk report page.", 8.5, MUTED);
  y += 4;

  // Section 3: AI labels, as a table
  heading("Section 3: AI labels on each screen");
  paragraph("Every piece of AI output should say it came from AI. Checked by hand on 6 Nov 2026.", 10, MUTED);
  const cols = [left, left + 58, left + 88];
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...INK);
  room(8);
  doc.text("Output · screen", cols[0], y);
  doc.text("Label", cols[1], y);
  doc.text("Note", cols[2], y);
  y += 2;
  doc.setDrawColor(...LINE).line(left, y, left + width, y);
  y += 5;
  doc.setFont("helvetica", "normal").setFontSize(8.5);
  for (const c of AI_LABEL_CHECKS) {
    const note = doc.splitTextToSize(c.note, width - 88) as string[];
    const first = doc.splitTextToSize(`${c.output} · ${c.screen}`, 56) as string[];
    const h = Math.max(note.length, first.length) * 4 + 3;
    room(h);
    doc.setTextColor(...INK).text(first, cols[0], y);
    doc.setTextColor(...(c.status === "missing" ? ([164, 35, 26] as [number, number, number]) : INK));
    doc.text(c.status === "ok" ? "Shown" : c.status === "missing" ? "Missing" : "Not built yet", cols[1], y);
    doc.setTextColor(...MUTED).text(note, cols[2], y);
    y += h;
  }

  // Footer on every page
  const generated = new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" });
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...LINE).line(left, 287, left + width, 287);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...MUTED);
    doc.text(`Relay Internal System Report · Confidential · Generated: ${generated}`, left, 292);
    doc.text(`Page ${p} of ${pages}`, 196, 292, { align: "right" });
  }

  return doc.output("arraybuffer");
}

// The navy band at the top: soft circles, a faint dot grid, and curved routes
// ending in dots (requests finding their team, as on the home page), with a
// brand-blue line underneath. Drawn first, so the title sits on top.
export function drawHeaderBand(doc: jsPDF) {
  const H = 34;
  doc.setFillColor(...NAVY).rect(0, 0, 210, H, "F");

  // Soft circles in lighter navys, mostly off the band's right edge.
  doc.setFillColor(16, 74, 136).circle(186, -6, 30, "F");
  doc.setFillColor(22, 86, 152).circle(214, 30, 20, "F");
  doc.setFillColor(14, 68, 126).circle(132, 40, 14, "F");

  // A faint dot grid across the middle.
  doc.setFillColor(36, 96, 160);
  for (let gx = 76; gx <= 128; gx += 4) {
    for (let gy = 5; gy <= 29; gy += 4) doc.circle(gx, gy, 0.35, "F");
  }

  // Three routes from one point to the right, each ending in a dot (kept clear
  // of the dates on the right).
  const start = { x: 92, y: 22 };
  const ends = [
    { x: 138, y: 7 },
    { x: 148, y: 16 },
    { x: 140, y: 27 },
  ];
  doc.setDrawColor(92, 150, 214).setLineWidth(0.5);
  for (const e of ends) {
    const dx = e.x - start.x;
    const dy = e.y - start.y;
    // One curve per route, bending right: [control 1, control 2, end], relative to the start.
    doc.lines([[dx * 0.45, 0, dx * 0.55, dy, dx, dy]], start.x, start.y, [1, 1], "S");
  }
  doc.setFillColor(148, 196, 245);
  for (const e of ends) doc.circle(e.x, e.y, 1.3, "F");
  doc.setFillColor(255, 255, 255).circle(start.x, start.y, 1.1, "F");

  // Brand-blue line under the band, then white below it, so the circles stop
  // at the band's edge.
  doc.setFillColor(15, 95, 184).rect(0, H, 210, 1.4, "F");
  doc.setFillColor(255, 255, 255).rect(0, H + 1.4, 210, 24, "F");
}
