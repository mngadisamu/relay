import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { jsPDF } from 'jspdf';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // 1. Verify manager role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden: Managers only' }, { status: 403 });
    }

    const body = await request.json();
    const { department, weekStart } = body;

    if (!department || !weekStart) {
      return NextResponse.json({ error: 'Missing department or weekStart' }, { status: 400 });
    }

    // 2. Fetch the saved report or metrics data
    const { data: reportData, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('department', department)
      .eq('week_start', weekStart)
      .single();

    if (reportError || !reportData) {
      return NextResponse.json({ error: 'Report not found for this department and week' }, { status: 404 });
    }

    // 2b. The AI summary saved on the dashboard for this department and week (S2-28).
    // Read here, the same way the report preview reads it, so the PDF and the preview match.
    const { data: insight } = await supabase
      .from('insights')
      .select('summary, status')
      .eq('week_start', weekStart)
      .eq('department', department)
      .maybeSingle();
    const hasSummary = insight?.status === 'ok' && !!insight.summary;

    // 3. Generate PDF using jsPDF
    const doc = new jsPDF();
    
    // Header styling (Relay Branding)
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('Relay Help Desk - Weekly Report', 14, 19);

    // Metadata
    doc.setTextColor(51, 65, 85); // Slate 700
    doc.setFontSize(12);
    doc.text(`Department: ${department}`, 14, 42);
    doc.text(`Week Starting: ${weekStart}`, 14, 50);

    // Metrics Section
    doc.setFontSize(14);
    doc.text('Summary Metrics', 14, 64);
    doc.setFontSize(10);
    
    const metrics = reportData.metrics || {};
    let yPos = 72;
    Object.entries(metrics).forEach(([key, value]) => {
      doc.text(`${key}: ${JSON.stringify(value)}`, 14, yPos);
      yPos += 8;
    });

    // AI Summary Section
    yPos += 10;
    doc.setFontSize(14);
    doc.text('AI Weekly Summary', 14, yPos);
    yPos += 8;
    doc.setFontSize(10);
    if (hasSummary) {
      const splitSummary = doc.splitTextToSize(insight!.summary as string, 180);
      doc.text(splitSummary, 14, yPos);
      yPos += splitSummary.length * 5 + 6;
      // Label the AI text in the PDF too, as the screen does (AiNote).
      doc.setFontSize(9);
      doc.setTextColor(11, 76, 148);
      doc.text('Summary written by AI - check it against the numbers', 14, yPos);
    } else {
      doc.text('No AI summary is saved for this department and week.', 14, yPos);
    }

    // Output PDF bytes
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // 4. Record the download in audit_log
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'report_download',
      details: { department, week_start: weekStart }
    });

    // 5. Return the PDF response
    const filename = `Relay-${department}-${weekStart}.pdf`;
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}