import { NextResponse } from "next/server";
import { classify } from "@/lib/classifier";
import { getCurrentProfile } from "@/lib/auth";

// Classify API contract (agreed in Sprint 1 planning). Shape unchanged.
//
// Request:  POST /api/classify  { "subject": string, "description": string }
// Response: { "department": "HR" | "IT" | "Finance" | "Operations",
//             "confidence": number (0-1),
//             "needsReview": boolean,      // true when confidence < 0.6
//             "modelVersion": string }     // e.g. "tfidf-logreg-v2"
//
// S1-21: uses the trained TF-IDF + logistic regression model (src/lib/classifier.ts),
// which replaced the keyword stub. The submit form calls classify() directly;
// this route is for other screens and for testing with curl.
//
// Sign-in (S2-31 review): /api is open to signed-out visitors (middleware), so this
// route checks the caller itself. Only signed-in Relay users may use it.
export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (typeof body?.subject !== "string" || typeof body?.description !== "string" || !body.subject || !body.description) {
    return NextResponse.json({ error: "subject and description are required" }, { status: 400 });
  }
  return NextResponse.json(classify(body.subject, body.description));
}
