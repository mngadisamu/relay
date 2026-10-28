import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Google Gen AI client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Initialize Supabase server client (using service role or standard client)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ticketId, ticketContent, department, templateText, tone = 'formal' } = body;

    if (!ticketContent || !department) {
      return NextResponse.json(
        { error: 'Missing required fields: ticketContent or department' },
        { status: 400 }
      );
    }

    const prompt = `
You are an AI support agent for Kopano Freight.
Department: ${department}
Tone: ${tone}

Guidance Template:
"${templateText || 'Use standard helpful company tone.'}"

User's Ticket Request:
"${ticketContent}"

Instruction:
Write a polite, concise, and helpful response to the user's ticket based on the guidance template, tone, and department context above.
`;

    let draftText = '';

    try {
      // Create a 10-second timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API timeout')), 10000)
      );

      // Race Gemini call against the 10-second timeout
      const geminiPromise = ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const response: any = await Promise.race([geminiPromise, timeoutPromise]);
      draftText = response.text || templateText;
    } catch (aiError) {
      console.warn('Gemini failed or timed out, falling back to template:', aiError);
      // Fallback to template text if Gemini fails or takes > 10s
      draftText = templateText || `Dear Staff, thank you for your request regarding ${ticketContent}. We are looking into it.`;
    }

    // Save the draft into the responses table if a ticketId is provided
    if (ticketId) {
      await supabase.from('responses').insert([
        {
          ticket_id: ticketId,
          draft_text: draftText,
          tone: tone,
          status: 'draft',
        },
      ]);
    }

    return NextResponse.json({ draft: draftText });
  } catch (error) {
    console.error('Error in AI draft route:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI draft' },
      { status: 500 }
    );
  }
}