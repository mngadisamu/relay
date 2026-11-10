import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth';
import { forecast, Department, HistoryDay } from '@/lib/forecast';
import { jsPDF } from 'jspdf';

const DEPARTMENTS = ['HR', 'IT', 'Finance', 'Operations'];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// Colours (RGB) for the PDF: navy for headings, blue for the AI label, grey for small text.
const NAVY: [number, number, number] = [15, 23, 42];
const BLUE: [number, number, number] = [29, 78, 216];
const INK: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [100, 116, 139];
const LINE: [number, number, number] = [226, 232, 240];
const PANEL: [number, number, number] = [248, 250, 252];
const AI_BG: [number, number, number] = [239, 246, 255];

const MARGIN = 14;
const WIDTH = 182; // A4 width (210 mm) minus two 14 mm margins
const PAGE_BOTTOM = 277; // leave room for the footer

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
  if (pct === null || pct === undefined) return 'no comparison';
  return `${pct > 0 ? '+' : ''}${pct}% vs previous period`;
}

// Starts a new page when the next block would run into the footer.
function room(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_BOTTOM) {
    doc.addPage();
    return 20;
  }
  return y;
}

// A section title with a blue rule under it.
function heading(doc: jsPDF, title: string, y: number): number {
  y = room(doc, y, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text(title, MARGIN, y);
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y + 2, MARGIN + WIDTH, y + 2);
  return y + 9;
}

// A simple table: navy header row, light stripes, text inside each column.
function table(doc: jsPDF, y: number, head: string[], widths: number[], rows: string[][]): number {
  y = room(doc, y, 16);
  doc.setFillColor(...NAVY);
  doc.rect(MARGIN, y, WIDTH, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  let x = MARGIN;
  head.forEach((h, i) => {
    doc.text(h, x + 3, y + 5.5);
    x += widths[i];
  });
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  rows.forEach((row, index) => {
    y = room(doc, y, 8);
    if (index % 2 === 1) {
      doc.setFillColor(...PANEL);
      doc.rect(MARGIN, y, WIDTH, 8, 'F');
    }
    let cx = MARGIN;
    row.forEach((cell, i) => {
      doc.text(cell, cx + 3, y + 5.5, { maxWidth: widths[i] - 6 });
      cx += widths[i];
    });
    y += 8;
  });
  return y + 6;
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
    { data: historyRows },
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
    supabase.from('tickets').select('created_at').eq('department', department).order('created_at', { ascending: true }),
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

  // The four-week forecast, worked out the same way as the preview.
  const countMap: Record<string, number> = {};
  for (const row of historyRows ?? []) {
    const day = (row.created_at as string).slice(0, 10);
    countMap[day] = (countMap[day] || 0) + 1;
  }
  const history: HistoryDay[] = Object.entries(countMap).map(([date, tickets]) => ({ date, tickets }));
  if (history.length === 0) history.push({ date: weekStart, tickets: 0 });
  const forecastDays = forecast(department as Department, history).days as unknown as { date?: string; expected?: number }[];

  // ---- Build the PDF ----
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setProperties({ title: `Relay ${department} report ${weekStart}`, author: 'Relay' });

  // Header band with a blue stripe underneath
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 210, 36, 'F');
  doc.setFillColor(...BLUE);
  doc.rect(0, 36, 210, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(147, 197, 253);
  doc.text('KOPANO FREIGHT RELAY', MARGIN, 12);
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('Weekly Department Report', MARGIN, 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text(`${department}   |   Week of ${weekStart} to ${weekEnd}`, MARGIN, 31);

  // 1. Key numbers: four boxes
  let y = heading(doc, 'Key numbers', 50);
  const cards = metrics.cards ?? {};
  const boxes = [
    { label: 'TOTAL TICKETS', value: show(cards.tickets?.value), sub: changeText(cards.tickets?.change_pct) },
    { label: 'AVG FIRST REPLY', value: show(cards.first_reply_hours?.value, ' h'), sub: changeText(cards.first_reply_hours?.change_pct) },
    { label: 'OPEN TICKETS', value: show(cards.open_tickets?.value), sub: `Previous: ${show(cards.open_tickets?.previous)}` },
    { label: 'NEEDING REVIEW', value: show(cards.needs_review?.count), sub: 'flagged by the AI' },
  ];
  const boxWidth = (WIDTH - 3 * 4) / 4;
  boxes.forEach((box, i) => {
    const x = MARGIN + i * (boxWidth + 4);
    doc.setFillColor(...PANEL);
    doc.setDrawColor(...LINE);
    doc.roundedRect(x, y, boxWidth, 26, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(box.label, x + 3, y + 6);
    doc.setFontSize(16);
    doc.setTextColor(...NAVY);
    doc.text(box.value, x + 3, y + 15, { maxWidth: boxWidth - 6 });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(box.sub, x + 3, y + 21, { maxWidth: boxWidth - 6 });
  });
  y += 36;

  // 2. Resolution and priority
  y = heading(doc, 'Resolution and priority', y);
  const resolutionRows: string[][] = [
    ['Average resolution time', show(metrics.resolution_hours?.value, ' h'), `Previous: ${show(metrics.resolution_hours?.previous)}`],
  ];
  const priority = metrics.by_priority;
  if (Array.isArray(priority)) {
    for (const r of priority as Record<string, unknown>[]) {
      resolutionRows.push([show(r.priority ?? r.name), show(r.count ?? r.value), '']);
    }
  } else if (priority && typeof priority === 'object') {
    for (const [name, value] of Object.entries(priority as Record<string, unknown>)) {
      resolutionRows.push([name, show(value), '']);
    }
  }
  y = table(doc, y, ['Measure', 'Value', 'Detail'], [84, 40, 58], resolutionRows);

  // 3. AI summary, labelled as AI
  y = heading(doc, 'AI weekly summary', y);
  const summaryText = summary ?? 'No AI summary is saved for this department and period. Write one on the Relay dashboard, then download the report again.';
  const lines = doc.splitTextToSize(summaryText, WIDTH - 12);
  const boxHeight = lines.length * 4.8 + (summary ? 14 : 8);
  y = room(doc, y, boxHeight + 4);
  doc.setFillColor(...AI_BG);
  doc.rect(MARGIN, y, WIDTH, boxHeight, 'F');
  doc.setFillColor(...BLUE);
  doc.rect(MARGIN, y, 1.6, boxHeight, 'F');
  doc.setFont('helvetica', summary ? 'italic' : 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(lines, MARGIN + 6, y + 7);
  if (summary) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...BLUE);
    doc.text('Summary written by AI - check it against the numbers', MARGIN + 6, y + boxHeight - 4);
  }
  y += boxHeight + 10;

  // 4. Four-week forecast: the expected requests for each week
  y = heading(doc, 'Four-week workload forecast', y);
  const weeklyRows: string[][] = [];
  for (let w = 0; w < 4; w++) {
    const days = forecastDays.slice(w * 7, w * 7 + 7);
    if (days.length === 0) break;
    const total = days.reduce((sum, d) => sum + (d.expected ?? 0), 0);
    const first = days[0].date ?? '';
    const last = days[days.length - 1].date ?? '';
    weeklyRows.push([`Week ${w + 1}`, `${first} to ${last}`, `${Math.round(total)} requests expected`]);
  }
  y = table(doc, y, ['Week', 'Dates', 'Expected'], [30, 80, 72], weeklyRows.length ? weeklyRows : [['No forecast', '', '']]);

  // 5. Oldest unresolved tickets (top 5), no names
  y = heading(doc, 'Oldest unresolved tickets', y);
  const now = Date.now();
  const oldestRows = (oldestOpen ?? []).map((t) => [
    String(t.reference),
    String(t.subject),
    String(Math.floor((now - new Date(t.created_at as string).getTime()) / 86_400_000)),
  ]);
  y = table(
    doc,
    y,
    ['Reference', 'Subject', 'Age (days)'],
    [40, 112, 30],
    oldestRows.length ? oldestRows : [['No unresolved tickets for this department.', '', '']],
  );

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...LINE);
    doc.line(MARGIN, 285, MARGIN + WIDTH, 285);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('Relay Internal System Report · Confidential', MARGIN, 290);
    doc.text(`Page ${p} of ${pages}`, MARGIN + WIDTH, 290, { align: 'right' });
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
