import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadTemplates } from "@/lib/reply-templates";
import { AgentHeader } from "@/components/AgentHeader";
import TemplateLibrary from "./TemplateLibrary";

// Template library (S1-27, mockup screen 8). Agents only; staff are sent home.
// Templates come from the database, so saved edits are what the AI drafts from.
export default async function TemplatesPage() {
  const profile = await requireRole(["agent", "manager"]);
  const supabase = await createClient();
  const templates = await loadTemplates(supabase);

  return (
    <div className="min-h-screen bg-page">
      <AgentHeader profile={profile} current="templates" />
      <TemplateLibrary templates={templates} myDepartment={profile.role === "manager" ? null : profile.department} />
    </div>
  );
}
