import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

// Gemini key stays on the server only (never NEXT_PUBLIC_).
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const TONES = ["formal", "friendly", "urgent"] as const;
type Tone = (typeof TONES)[number];

// Drafts a reply with Gemini (S1-08, S1-13, S1-14) and saves it as the signed-in agent.
export async function POST(request: Request) {
  // Only agents and managers may create drafts (staff can't insert into responses).
  const profile = await getCurrentProfile();
  if (!profile || !["agent", "manager"].includes(profile.role)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const { ticketId, ticketContent, department, templateText } = body ?? {};
  const tone: Tone = TONES.includes(body?.tone) ? body.tone : "formal";

  if (!ticketContent || !department) {
    return NextResponse.json(
      { error: "Missing required fields: ticketContent or department" },
      { status: 400 },
    );
  }

  const prompt = `
You are an AI support agent for Kopano Freight.
Department: ${department}
Tone: ${tone}

Guidance template:
"${templateText || "Use the standard helpful company tone."}"

The staff member's request:
"${ticketContent}"

Write a polite, concise and helpful reply based on the template, tone and department above.
`;

  // Gemini first; if it fails or takes over 10 seconds, use the template (S1-13).
  let draftText = "";
  let aiGenerated = true;
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini timeout")), 10_000),
    );
    const result = await Promise.race([
      ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt }),
      timeout,
    ]);
    draftText = result.text ?? "";
  } catch (error) {
    console.warn("Gemini failed or timed out, using the template instead:", error);
  }
  if (!draftText) {
    draftText = templateText || "Thank you for your request. We are looking into it.";
    aiGenerated = false;
  }

  // Save as the signed-in agent, so row-level security applies (migration 0004).
  let responseId: number | null = null;
  if (ticketId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("responses")
      .insert({ ticket_id: ticketId, tone, ai_draft: draftText, ai_generated: aiGenerated })
      .select("id")
      .single();
    if (error) {
      console.error("Could not save the draft:", error);
      return NextResponse.json({ error: "Could not save the draft" }, { status: 500 });
    }
    responseId = data.id;
  }

  return NextResponse.json({ draft: draftText, responseId, aiGenerated });
}