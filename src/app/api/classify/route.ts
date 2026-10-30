import { NextResponse } from "next/server";
import { classify } from "@/lib/classifier";

// Classify API contract (agreed in Sprint 1 planning). Shape unchanged in S1-21.
//
// Request:  POST /api/classify  { "subject": string, "description": string }
// Response: { "department": "HR" | "IT" | "Finance" | "Operations",
//             "confidence": number (0-1),
//             "needsReview": boolean,      // true when confidence < 0.6
//             "modelVersion": string }     // e.g. "tfidf-logreg-v2"
//
// Backed by the trained TF-IDF + logistic regression model (S1-21).
// The model lives in src/lib/classifier.ts and classifier-model.json.

// S1-21: uses the trained TF-IDF + logistic regression model (src/lib/classifier.ts),
// which replaced the keyword stub. The submit form calls classify() directly;
// this route is for other screens and for testing with curl.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (typeof body?.subject !== "string" || typeof body?.description !== "string" || !body.subject || !body.description) {
    return NextResponse.json({ error: "subject and description are required" }, { status: 400 });
  }

  return NextResponse.json(classify(body.subject, body.description));
}
  return NextResponse.json(classify(body.subject, body.description));
}
