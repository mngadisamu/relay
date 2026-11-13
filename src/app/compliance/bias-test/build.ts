import { jsPDF } from "jspdf";
import { BIAS_TEST_DOC, type BiasDocBlock } from "@/lib/bias-test-doc";
import { drawHeaderBand } from "@/app/compliance/risk/pdf/build";

// Draws the full bias test (S2-21) as a PDF in the same layout as the Risk report
// (docs/report-template.md): the header band, numbered headings, a footer.
// The words come from docs/responsible-ai/bias-test.md, via src/lib/bias-test-doc.ts.

const NAVY: [number, number, number] = [11, 61, 115];
const INK: [number, number, number] = [23, 33, 45];
const MUTED: [number, number, number] = [91, 103, 117];
const LINE: [number, number, number] = [221, 226, 232];
const SOFT: [number, number, number] = [247, 248, 250];

export function buildBiasTestPdf(): ArrayBuffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setProperties({ title: "Relay bias test (S2-21)", author: "Relay" });
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
  const lineHeight = (size: number) => size * 0.45 + 1.6;

  const heading = (text: string) => {
    room(16);
    y += 3;
    doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(...NAVY);
    doc.text(text.toUpperCase(), left, y);
    y += 2;
    doc.setDrawColor(...LINE).line(left, y, left + width, y);
    y += 6;
  };
  const subheading = (text: string) => {
    room(12);
    doc.setFont("helvetica", "bold").setFontSize(10.5).setTextColor(...INK);
    const lines = doc.splitTextToSize(text, width) as string[];
    doc.text(lines, left, y);
    y += lines.length * lineHeight(10.5) + 2;
  };
  const paragraph = (text: string, size = 10, color = INK, indent = 0) => {
    doc.setFont("helvetica", "normal").setFontSize(size).setTextColor(...color);
    const lines = doc.splitTextToSize(text, width - indent) as string[];
    room(lines.length * lineHeight(size) + 2);
    doc.text(lines, left + indent, y);
    y += lines.length * lineHeight(size) + 2;
  };
  const code = (text: string) => {
    doc.setFont("courier", "normal").setFontSize(8.5).setTextColor(...INK);
    const lines = text.split("\n").flatMap((l) => doc.splitTextToSize(l || " ", width - 8) as string[]);
    const h = lines.length * 4 + 6;
    room(h + 2);
    doc.setFillColor(...SOFT).setDrawColor(...LINE).roundedRect(left, y, width, h, 1.5, 1.5, "FD");
    doc.text(lines, left + 4, y + 5);
    y += h + 3;
  };

  // A table: equal-ish columns sized by their longest text, a shaded header row, wrapped cells.
  const table = (header: string[], rows: string[][]) => {
    const cols = header.length;
    const longest = Array.from({ length: cols }, (_, c) =>
      Math.max(header[c]?.length ?? 0, ...rows.map((r) => r[c]?.length ?? 0), 4),
    );
    const total = longest.reduce((a, b) => a + b, 0);
    const widths = longest.map((l) => Math.max((l / total) * width, 18));
    const scale = width / widths.reduce((a, b) => a + b, 0);
    const colW = widths.map((w) => w * scale);
    const xs = colW.reduce<number[]>((acc, w, i) => (i === 0 ? [left] : [...acc, acc[i - 1] + colW[i - 1]]), []);
    const size = 8;

    const drawRow = (cells: string[], bold: boolean, shade: boolean) => {
      doc.setFont("helvetica", bold ? "bold" : "normal").setFontSize(size);
      const wrapped = cells.map((c, i) => doc.splitTextToSize(c ?? "", colW[i] - 3) as string[]);
      const h = Math.max(...wrapped.map((w) => w.length)) * lineHeight(size) + 3;
      room(h);
      if (shade) doc.setFillColor(...SOFT).rect(left, y, width, h, "F");
      doc.setDrawColor(...LINE).line(left, y + h, left + width, y + h);
      doc.setTextColor(...INK);
      wrapped.forEach((lines, i) => doc.text(lines, xs[i] + 1.5, y + 4));
      y += h;
    };

    drawRow(header, true, true);
    rows.forEach((r) => drawRow(r, false, false));
    y += 4;
  };

  const bullets = (items: string[]) => {
    for (const item of items) paragraph(item, 10, INK, 5);
  };

  // A block of the document, drawn by its kind.
  const draw = (b: BiasDocBlock) => {
    switch (b.kind) {
      case "h2":
        return heading(b.text);
      case "h3":
        return subheading(b.text);
      case "p":
        return paragraph(b.text);
      case "code":
        return code(b.text);
      case "bullets":
        return bullets(b.items.map((t) => `•  ${t}`));
      case "numbered":
        return bullets(b.items.map((t, i) => `${i + 1}.  ${t}`));
      case "table":
        return table(b.header, b.rows);
    }
  };

  // The title band, as on the Risk report.
  drawHeaderBand(doc);
  doc.setTextColor(255, 255, 255).setFont("helvetica", "bold").setFontSize(10);
  doc.text("RELAY HELP DESK", left, 13);
  doc.setFontSize(18).text("Bias Test", left, 23);
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text("S2-21 · run on 5 and 9 Nov 2026", 196, 25, { align: "right" });
  y = 46;

  // The document's first heading is the title, already in the band, so start after it.
  const blocks = BIAS_TEST_DOC.filter((b, i) => !(i === 0 && b.kind === "h1"));
  for (const b of blocks) draw(b);

  // Footer on every page, as on the Risk report.
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
