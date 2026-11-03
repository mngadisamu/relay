import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: Request) {
  try {
    const { department, week_start } = await request.json();

    if (!department || !week_start) {
      return NextResponse.json(
        { error: 'Missing department or week_start parameters' },
        { status: 400 }
      );
    }

    // Call Mihlali's dashboard_metrics() function
    const { data: metricsData, error: metricsError } = await supabase.rpc(
      'dashboard_metrics',
      { target_department: department, target_week: week_start }
    );

    if (metricsError) throw new Error(`Metrics error: ${metricsError.message}`);

    // Call Elzel's forecast() function
    const { data: forecastData, error: forecastError } = await supabase.rpc(
      'forecast',
      { target_department: department }
    );

    if (forecastError) throw new Error(`Forecast error: ${forecastError.message}`);

    // Fetch oldest open tickets
    const { data: ticketsData, error: ticketsError } = await supabase
      .from('tickets')
      .select('reference, subject, created_at')
      .eq('department', department)
      .eq('status', 'open')
      .order('created_at', { ascending: true })
      .limit(5);

    if (ticketsError) throw new Error(`Tickets error: ${ticketsError.message}`);

    const prompt = `
      You are an expert operations analyst for Kopano Freight Relay. 
      Analyze the following weekly performance data for the ${department} department (Week of ${week_start}):
      
      KPI Metrics: ${JSON.stringify(metricsData)}
      4-Week Forecast: ${JSON.stringify(forecastData)}
      Oldest Unresolved Tickets Count: ${ticketsData?.length || 0}

      Write a concise, professional 3-5 sentence executive summary highlighting key operational performance trends, potential bottlenecks, and workload expectations for the upcoming weeks.
    `;

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const aiSummary = aiResponse.text || 'No AI summary generated.';

    const { data: insertedReport, error: insertError } = await supabase
      .from('reports')
      .insert({
        department,
        week_start,
        metrics: metricsData || {},
        ai_summary: aiSummary,
        forecast: forecastData || {},
      })
      .select()
      .single();

    if (insertError) throw new Error(`Database insert error: ${insertError.message}`);

    return NextResponse.json({
      success: true,
      message: 'Automated report generated and saved successfully!',
      report: insertedReport,
    });

  } catch (err: unknown) {
    console.error('Report generation failed:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}