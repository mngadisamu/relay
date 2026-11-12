import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth';
import { forecast, Department } from '@/lib/forecast';
import { loadForecastHistory } from '@/lib/daily-history';
import { formatDay, todaySast } from '@/lib/risk';
import { jsPDF } from 'jspdf';

const DEPARTMENTS = ['HR', 'IT', 'Finance', 'Operations'];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// The same look as the Risk report PDF (src/app/compliance/risk/pdf/build.ts): the navy
// header band, numbered sections, three boxes to a row, and a footer with page numbers.
const NAVY: [number, number, number] = [11, 61, 115];
const INK: [number, number, number] = [23, 33, 45];
const MUTED: [number, number, number] = [91, 103, 117];
const LINE: [number, number, number] = [221, 226, 232];
const PANEL: [number, number, number] = [247, 248, 250];
const AMBER: [number, number, number] = [146, 64, 14];
const BLUE: [number, number, number] = [29, 78, 216];
const LEFT = 14;
const WIDTH = 182;

type Card = { value?: number | null; previous?: number | null; change_pct?: number | null };
type Metrics = {
  cards?: {
    tickets?: Card;
    first_reply_hours?: Card;
    open_tickets?: Card;
    needs_review?: { value?: number | null; count?: number | null };
  };
  resolution_hours?: Card;
  by_priority?: unknown;
};

// Missing values are said plainly ("no data"), never shown as zero.
function show(value: unknown, suffix = ''): string {
  if (value === null || value === undefined) return 'no data';
  if (typeof value === 'object') return JSON.stringify(value);
  return `${String(value)}${suffix}`;
}

function changeText(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return 'No comparison available';
  return `${pct > 0 ? '+' : ''}${pct}% on the previous period`;
}

// The navy band at the top: soft circles, a faint dot grid and curved routes ending in
// dots, with a brand-blue line underneath (copied from the Risk report so they match).
function drawHeaderBand(doc: jsPDF) {
  const H = 34;
  doc.setFillColor(...NAVY).rect(0, 0, 210, H, 'F');
  doc.setFillColor(16, 74, 136).circle(186, -6, 30, 'F');
  doc.setFillColor(22, 86, 152).circle(214, 30, 20, 'F');
  doc.setFillColor(14, 68, 126).circle(132, 40, 14, 'F');
  doc.setFillColor(36, 96, 160);
  for (let gx = 76; gx <= 128; gx += 4) {
    for (let gy = 5; gy <= 29; gy += 4) doc.circle(gx, gy, 0.35, 'F');
  }
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
    doc.lines([[dx * 0.45, 0, dx * 0.55, dy, dx, dy]], start.x, start.y, [1, 1], 'S');
  }
  doc.setFillColor(148, 196, 245);
  for (const e of ends) doc.circle(e.x, e.y, 1.3, 'F');
  doc.setFillColor(255, 255, 255).circle(start.x, start.y, 1.1, 'F');
  doc.setFillColor(15, 95, 184).rect(0, H, 210, 1.4, 'F');
  doc.setFillColor(255, 255, 255).rect(0, H + 1.4, 210, 24, 'F');
}

async function buildPdfResponse(department: string, weekStart: string) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'manager') {
    return NextResponse.json({ error: 'Only managers can download reports.' }, { status: 403 });
  }
  if (!DEPARTMENTS.includes(department) || !DAY.test(weekStart)) {
    return NextResponse.json({ error: 'Choose a department and a week.' }, { status: 400 });
  }

  // The report covers Monday to the Sunday after.
  const end = new Date(`${weekStart}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  const weekEnd = end.toISOString().slice(0, 10);

  const supabase = await createClient();

  // The same data the preview uses, fetched in parallel.
  const [
    { data: metricsData, error: metricsError },
    { data: insight },
    { data: oldestOpen },
  ] = await Promise.all([
    supabase.rpc('dashboard_metrics', { p_from: weekStart, p_to: weekEnd, p_department: department }),
    supabase
      .from('insights')
      .select('summary, status')
      .eq('period_from', weekStart)
      .eq('period_to', weekEnd)
      .eq('department', department)
      .maybeSingle<{ summary: string | null; status: string }>(),
    supabase
      .from('tickets')
      .select('reference, subject, created_at')
      .eq('department', department)
      .eq('is_historical', false)
      .neq('status', 'closed')
      .order('created_at', { ascending: true })
      .limit(5),
  ]);
  if (metricsError) {
    return NextResponse.json({ error: metricsError.message }, { status: 500 });
  }

  const metrics = (metricsData ?? {}) as Metrics;
  const summary = insight?.status === 'ok' && insight.summary ? insight.summary : null;

  // The four-week forecast: the same history the forecast page and the preview use.
  const history = await loadForecastHistory(supabase, department as Department, todaySast());
  if (history.length === 0) history.push({ date: weekStart, tickets: 0 });
  const forecastDays = forecast(department as Department, history, todaySast()).days as unknown as { date?: string; expected?: number }[];
  const forecastTotal = forecastDays.reduce((sum, d) => sum + (d.expected ?? 0), 0);

  // ---- Draw the PDF, in the Risk report's layout ----
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setProperties({ title: `Relay ${department} report ${weekStart}`, author: 'Relay' });
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
    doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...NAVY);
    doc.text(text.toUpperCase(), LEFT, y);
    y += 7;
  };
  const paragraph = (text: string, size = 10, color = INK) => {
    doc.setFont('helvetica', 'normal').setFontSize(size).setTextColor(...color);
    const lines = doc.splitTextToSize(text, WIDTH) as string[];
    room(lines.length * (size * 0.45) + 2);
    doc.text(lines, LEFT, y);
    y += lines.length * (size * 0.45) + 2;
  };
  // A simple table: a bold header, a rule, then rows. The first two columns are ink, the rest muted.
  const table = (head: string[], xs: number[], rows: string[][]) => {
    room(10);
    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...INK);
    head.forEach((h, i) => doc.text(h, xs[i], y));
    y += 2;
    doc.setDrawColor(...LINE).line(LEFT, y, LEFT + WIDTH, y);
    y += 5;
    doc.setFont('helvetica', 'normal').setFontSize(8.5);
    for (const row of rows) {
      const cells = row.map((cell, i) => doc.splitTextToSize(cell, (xs[i + 1] ?? LEFT + WIDTH) - xs[i] - 4) as string[]);
      const h = Math.max(...cells.map((c) => c.length)) * 4 + 3;
      room(h);
      cells.forEach((lines, i) => {
        doc.setTextColor(...(i < 2 ? INK : MUTED)).text(lines, xs[i], y);
      });
      y += h;
    }
    y += 3;
  };

  drawHeaderBand(doc);
  doc.setTextColor(255, 255, 255).setFont('helvetica', 'bold').setFontSize(10);
  doc.text('RELAY HELP DESK', LEFT, 13);
  doc.setFontSize(18).text('Weekly Department Report', LEFT, 23);
  doc.setFont('helvetica', 'normal').setFontSize(10);
  doc.text(`${department}  ·  ${formatDay(weekStart)} to ${formatDay(weekEnd)}`, 196, 25, { align: 'right' });
  y = 46;
  paragraph("How this department's help desk performed over the week. Live requests only; times are South African time.", 10, MUTED);
  y += 4;

  // Section 1: the numbers, as boxes, three to a row
  heading('Section 1: Key numbers');
  const cards = metrics.cards ?? {};
  const boxes = [
    { label: 'Total tickets', value: show(cards.tickets?.value), note: changeText(cards.tickets?.change_pct) },
    { label: 'Average first reply', value: show(cards.first_reply_hours?.value, ' h'), note: changeText(cards.first_reply_hours?.change_pct) },
    { label: 'Open tickets', value: show(cards.open_tickets?.value), note: `Previous period: ${show(cards.open_tickets?.previous)}` },
    { label: 'Needing review', value: show(cards.needs_review?.count), note: 'Routed with under 60% confidence, so an agent checks them.' },
    { label: 'Average resolution time', value: show(metrics.resolution_hours?.value, ' h'), note: `Previous period: ${show(metrics.resolution_hours?.previous, ' h')}` },
    { label: 'Forecast, next 28 days', value: `${Math.round(forecastTotal)}`, note: 'Requests expected, worked out from past tickets only.' },
  ];
  const boxW = (WIDTH - 8) / 3;
  const boxH = 34;
  boxes.forEach((box, i) => {
    if (i % 3 === 0) room(boxH + 4);
    const x = LEFT + (i % 3) * (boxW + 4);
    doc.setDrawColor(...LINE).setFillColor(...PANEL).roundedRect(x, y, boxW, boxH, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...MUTED);
    doc.text(doc.splitTextToSize(box.label, boxW - 6) as string[], x + 3, y + 6);
    doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(...INK);
    doc.text(box.value, x + 3, y + 17);
    doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...MUTED);
    doc.text((doc.splitTextToSize(box.note, boxW - 6) as string[]).slice(0, 4), x + 3, y + 23);
    if (i % 3 === 2 || i === boxes.length - 1) y += boxH + 4;
  });
  y += 4;

  // Section 2: resolution and priority
  heading('Section 2: Resolution and priority');
  const priorityRows: string[][] = [];
  const priority = metrics.by_priority;
  if (Array.isArray(priority)) {
    for (const r of priority as Record<string, unknown>[]) {
      priorityRows.push([show(r.priority ?? r.name), show(r.count ?? r.value), '']);
    }
  } else if (priority && typeof priority === 'object') {
    for (const [name, value] of Object.entries(priority as Record<string, unknown>)) {
      priorityRows.push([name, show(value), '']);
    }
  }
  table(['Measure', 'Value', 'Detail'], [LEFT, LEFT + 80, LEFT + 120], [
    ['Average resolution time', show(metrics.resolution_hours?.value, ' h'), `Previous period: ${show(metrics.resolution_hours?.previous, ' h')}`],
    ...(priorityRows.length ? priorityRows : [['By priority', 'no data', '']]),
  ]);

  // Section 3: the AI summary, labelled as AI (the same rule as the screen)
  heading('Section 3: AI weekly summary');
  if (summary) {
    paragraph(summary, 10, INK);
    paragraph('Summary written by AI - check it against the numbers', 8.5, BLUE);
  } else {
    paragraph('No AI summary is saved for this department and period. Write one on the Relay dashboard, then download the report again.', 9.5, AMBER);
  }
  y += 4;

  // Section 4: the four-week forecast, one row per week
  heading('Section 4: Four-week workload forecast');
  const weeklyRows: string[][] = [];
  for (let w = 0; w < 4; w++) {
    const days = forecastDays.slice(w * 7, w * 7 + 7);
    if (days.length === 0) break;
    const total = days.reduce((sum, d) => sum + (d.expected ?? 0), 0);
    weeklyRows.push([`Week ${w + 1}`, `${formatDay(days[0].date ?? '')} to ${formatDay(days[days.length - 1].date ?? '')}`, `${Math.round(total)} requests expected`]);
  }
  table(['Week', 'Dates', 'Expected'], [LEFT, LEFT + 30, LEFT + 110], weeklyRows.length ? weeklyRows : [['No forecast', '', '']]);

  // Section 5: the oldest unresolved tickets (top 5), with no names
  heading('Section 5: Oldest unresolved tickets (top 5)');
  const now = Date.now();
  const oldestRows = (oldestOpen ?? []).map((t) => [
    String(t.reference),
    String(t.subject),
    `${Math.floor((now - new Date(t.created_at as string).getTime()) / 86_400_000)} days`,
  ]);
  table(['Reference', 'Subject', 'Age'], [LEFT, LEFT + 40, LEFT + 150], oldestRows.length ? oldestRows : [['No unresolved tickets for this department.', '', '']]);

  // Footer on every page, as on the Risk report
  const generated = new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', dateStyle: 'medium', timeStyle: 'short' });
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...LINE).line(LEFT, 287, LEFT + WIDTH, 287);
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED);
    doc.text(`Relay Internal System Report · Confidential · Generated: ${generated}`, LEFT, 292);
    doc.text(`Page ${p} of ${pages}`, 196, 292, { align: 'right' });
  }

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

  // Record the download. The column is `actor` (audit_log, migration 0001).
  const { data: saved } = await supabase
    .from('reports')
    .select('id')
    .eq('department', department)
    .eq('week_start', weekStart)
    .maybeSingle<{ id: string }>();
  const { error: auditError } = await supabase.from('audit_log').insert({
    actor: profile.id,
    action: 'report_download',
    details: { report_id: saved?.id ?? null, department, week_start: weekStart },
  });
  if (auditError) {
    console.warn('Report download not logged:', auditError.message);
  }

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Relay-${department}-${weekStart}.pdf"`,
    },
  });
}

// The Download PDF button posts the details.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    return await buildPdfResponse(String(body?.department ?? ''), String(body?.weekStart ?? ''));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// The PDF link on Saved Reports is a plain link, so it arrives as a GET with query values.
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return await buildPdfResponse(url.searchParams.get('department') ?? '', url.searchParams.get('week_start') ?? '');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
