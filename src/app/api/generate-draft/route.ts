import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

// Gemini key stays on the server only (never NEXT_PUBLIC_).
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const TONES = ["formal", "friendly", "urgent"] as const;
type Tone = (typeof TONES)[number];

// Drafts a reply with Gemini (S1-08, S1-13, S1-14) and saves it as the signed-in agent.
// Body: { ticketId: number, tone: "formal" | "friendly" | "urgent", templateText?: string }
export async function POST(request: Request) {
  // Only agents and managers may create drafts (staff can't insert into responses).
  const profile = await getCurrentProfile();
  if (!profile || !["agent", "manager"].includes(profile.role)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const ticketId = Number(body?.ticketId);
  const tone: Tone = TONES.includes(body?.tone) ? body.tone : "formal";
  const templateText: string = typeof body?.templateText === "string" ? body.templateText : "";
  if (!ticketId) return NextResponse.json({ error: "ticketId is required" }, { status: 400 });

  // Load the ticket here, as the agent, instead of trusting text sent from the browser.
  // Row-level security means this only works for tickets the agent may see.
  const supabase = await createClient();
  const [{ data: ticket }, { data: submitter }] = await Promise.all([
    supabase.from("tickets").select("subject, description, department, depot").eq("id", ticketId).maybeSingle(),
    supabase.rpc("ticket_submitter", { p_ticket_id: ticketId }).maybeSingle<{ full_name: string }>(),
  ]);
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const staffName = submitter?.full_name ?? "colleague";
  // Fill the template's [Staff Name] and [Subject] gaps, so neither the AI draft
  // nor the fallback ever goes out with brackets in it.
  const template = templateText.replaceAll("[Staff Name]", staffName).replaceAll("[Subject]", ticket.subject);

  const prompt = `
You are writing a reply for the ${ticket.department} team at Kopano Freight, a logistics company in Johannesburg.
Tone: ${tone}.
The reply goes to ${staffName}${ticket.depot ? ` at ${ticket.depot}` : ""}.

Start from this approved template, adapting it to the request:
"${template || "Thank the person, say what happens next, and when."}"

Their request (subject, then details):
"${ticket.subject}"
"${ticket.description}"

Write only the reply text: polite, clear and short (under 150 words). Use South African English.
Don't promise anything the template doesn't, don't invent names, numbers or dates, and leave no [placeholders].
Sign off as "${profile.fullName}, ${ticket.department} team".
`;

  // Gemini first; if it fails or takes over 10 seconds, use the template (S1-13).
  let draftText = "";
  let aiGenerated = true;
  try {
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Gemini timeout")), 10_000));
    const result = await Promise.race([
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        // No "thinking" step: a short reply doesn't need it, and it made drafts take several seconds.
        config: { thinkingConfig: { thinkingBudget: 0 } },
      }),
      timeout,
    ]);
    draftText = result.text?.trim() ?? "";
  } catch (error) {
    console.warn("Gemini failed or timed out, using the template instead:", error);
  }
  if (!draftText) {
    draftText = template || "Thank you for your request. We are looking into it and will get back to you soon.";
    aiGenerated = false;
  }

  // Save as the signed-in agent, so row-level security applies (migration 0004),
  // and note it in the audit log (Sprint 3 compliance).
  const { data, error } = await supabase
    .from("responses")
    .insert({ ticket_id: ticketId, tone, ai_draft: draftText, ai_generated: aiGenerated })
    .select("id")
    .single();
  if (error) {
    console.error("Could not save the draft:", error);
    return NextResponse.json({ error: "Could not save the draft" }, { status: 500 });
  }
  await supabase.from("audit_log").insert({
    actor: profile.id,
    action: "draft",
    ticket_id: ticketId,
    details: { tone, ai_generated: aiGenerated, response_id: data.id },
  });

  return NextResponse.json({ draft: draftText, responseId: data.id, aiGenerated });
}
