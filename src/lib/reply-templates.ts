import { departmentTemplates } from "@/lib/templates";
import type { createClient } from "@/lib/supabase/server";

// Reply templates now live in the database (S1-27), so an agent's edits are used
// by the next AI draft. The text in src/lib/templates.ts is only a fallback for
// when the table is empty (before supabase/seed/templates.sql has been run).

export type Tone = "formal" | "friendly" | "urgent";
export const TONES: Tone[] = ["formal", "friendly", "urgent"];

export type ReplyTemplate = {
  id: number | null; // null = built-in fallback, not saved in the database yet
  department: string;
  name: string; // "Formal", "Friendly" or "Urgent": matches the reply tone
  body: string;
  updated_at: string | null;
};

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Template name for a tone, e.g. "formal" → "Formal".
export function nameForTone(tone: Tone) {
  return tone.charAt(0).toUpperCase() + tone.slice(1);
}

function fallback(department: string): ReplyTemplate[] {
  const texts = (departmentTemplates as Record<string, string[]>)[department] ?? [];
  return TONES.map((tone, i) => ({ id: null, department, name: nameForTone(tone), body: texts[i] ?? "", updated_at: null }));
}

// All templates (for the library), or one department's (for a ticket).
// Row-level security (migration 0004) lets agents, managers and compliance read them.
export async function loadTemplates(supabase: Supabase, department?: string): Promise<ReplyTemplate[]> {
  let query = supabase.from("templates").select("id, department, name, body, updated_at").order("department").order("name");
  if (department) query = query.eq("department", department);
  const { data } = await query;
  const rows = (data ?? []) as ReplyTemplate[];

  // Use the saved templates; fill any department that has none with the built-in text.
  const departments = department ? [department] : ["HR", "IT", "Finance", "Operations"];
  return departments.flatMap((d) => {
    const saved = rows.filter((r) => r.department === d);
    return saved.length > 0 ? saved : fallback(d);
  });
}

// The template to start a draft from: the one whose name matches the tone.
export function templateForTone(templates: ReplyTemplate[], tone: Tone): ReplyTemplate | undefined {
  return templates.find((t) => t.name.toLowerCase() === tone) ?? templates[0];
}
