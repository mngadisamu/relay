import { NextResponse } from "next/server";
import { classify } from "@/lib/classifier";

// Classify API contract (agreed in Sprint 1 planning).
//
// Request:  POST /api/classify  { "subject": string, "description": string }
// Response: { "department": "HR" | "IT" | "Finance" | "Operations",
//             "confidence": number (0-1),
//             "needsReview": boolean,
//             "modelVersion": string }
//
// Backed by the trained TF-IDF + logistic regression model (S1-21).
// The model lives in src/lib/classifier.ts and classifier-model.json.

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.subject || !body?.description) {
    return NextResponse.json(
      { error: "subject and description are required" },
      { status: 400 },
    );
  }

  return NextResponse.json(classify(body.subject, body.description));
}