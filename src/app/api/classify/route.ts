import { NextResponse } from "next/server";

// Classify API contract (agreed in Sprint 1 planning).
//
// Request:  POST /api/classify  { "subject": string, "description": string }
// Response: { "department": "HR" | "IT" | "Finance" | "Operations",
//             "confidence": number (0-1),
//             "needsReview": boolean,
//             "modelVersion": string }
//
// STUB: returns a keyword-based guess so the submit form (F3) and agent
// inbox (F4) can be built before the trained model (F2) is ready.
// S1-21 replaces this with the exported TF-IDF + logistic regression model
// from ml/model, keeping the same request and response shape.

const REVIEW_THRESHOLD = 0.6;

const KEYWORDS: Record<string, string[]> = {
  HR: ["leave", "payslip", "salary", "contract", "medical aid", "uif"],
  IT: ["laptop", "password", "scanner", "email", "printer", "login", "wifi"],
  Finance: ["invoice", "fuel card", "reimburse", "claim", "payment", "budget"],
  Operations: ["truck", "fleet", "delivery", "warehouse", "forklift", "route"],
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.subject || !body?.description) {
    return NextResponse.json(
      { error: "subject and description are required" },
      { status: 400 },
    );
  }

  const text = `${body.subject} ${body.description}`.toLowerCase();
  let department = "Operations";
  let hits = 0;
  for (const [dept, words] of Object.entries(KEYWORDS)) {
    const count = words.filter((w) => text.includes(w)).length;
    if (count > hits) {
      department = dept;
      hits = count;
    }
  }
  const confidence = hits === 0 ? 0.3 : Math.min(0.5 + hits * 0.2, 0.95);

  return NextResponse.json({
    department,
    confidence,
    needsReview: confidence < REVIEW_THRESHOLD,
    modelVersion: "stub-0",
  });
}
