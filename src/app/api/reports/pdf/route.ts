import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth';
import { jsPDF } from 'jspdf';

const DEPARTMENTS = ['HR', 'IT', 'Finance', 'Operations'];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// The PDF is built the same way as the preview: the numbers come from the same
// dashboard_metrics() call, so the PDF matches what the manager saw. It does not need
// a row in `reports` (a failed save used to make the PDF return 404).
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

  // 1. The numbers for this department and week (the same call the preview makes)
  const { data: metrics, error: metricsError } = await supabase.rpc('dashboard_metrics', {
    p_from: weekStart,
    p_to: weekEnd,
    p_department: department,
  });
  if (metricsError) {
    return NextResponse.json({ error: metricsError.message }, { status: 500 });
  }

  // 2. The AI summary written on the dashboard for exactly this period (S2-28)
  const { data: insight } = await supabase
    .from('insights')
    .select('summary, status')
    .eq('period_from', weekStart)
    .eq('period_to', weekEnd)
    .eq('department', department)
    .maybeSingle<{ summary: string | null; status: string }>();
  const summary = insight?.status === 'ok' && insight.summary ? insight.summary : null;

  // 3. Build the PDF
  const doc = new jsPDF();

  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('Relay Help Desk - Weekly Report', 14, 19);

  doc.setTextColor(51, 65, 85); // Slate 700
  doc.setFontSize(12);
  doc.text(`Department: ${department}`, 14, 42);
  doc.text(`Week: ${weekStart} to ${weekEnd}`, 14, 50);

  // Numbers: say "no data" rather than a zero when a value is missing
  doc.setFontSize(14);
  doc.text('Summary Metrics', 14, 64);
  doc.setFontSize(10);
  const cards = (metrics as {
    cards?: {
      tickets?: { value?: number | null };
      first_reply_hours?: { value?: number | null };
      open_tickets?: { value?: number | null };
      needs_review?: { count?: number | null };
    };
  } | null)?.cards;
  const lines = cards
    ? [
        `Total tickets: ${cards.tickets?.value ?? 'no data'}`,
        `Average first reply (hours): ${cards.first_reply_hours?.value ?? 'no data'}`,
        `Open tickets: ${cards.open_tickets?.value ?? 'no data'}`,
        `Needing review: ${cards.needs_review?.count ?? 'no data'}`,
      ]
    : ['No numbers for this period.'];
  let yPos = 72;
  for (const line of lines) {
    doc.text(line, 14, yPos);
    yPos += 8;
  }

  // AI summary, labelled as AI on screen and in the PDF
  yPos += 10;
  doc.setFontSize(14);
  doc.text('AI Weekly Summary', 14, yPos);
  yPos += 8;
  doc.setFontSize(10);
  if (summary) {
    const splitSummary = doc.splitTextToSize(summary, 180);
    doc.text(splitSummary, 14, yPos);
    yPos += splitSummary.length * 5 + 6;
    doc.setFontSize(9);
    doc.setTextColor(11, 76, 148);
    doc.text('Summary written by AI - check it against the numbers', 14, yPos);
  } else {
    doc.text('No AI summary is saved for this department and period.', 14, yPos);
  }

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

  // 4. Record the download. The column is `actor` (audit_log, migration 0001).
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

  // 5. Return the PDF
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
