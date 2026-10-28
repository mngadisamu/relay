import { requireRole } from "@/lib/auth";
import { AgentHeader } from "@/components/AgentHeader";
import TemplateLibrary from "./TemplateLibrary";

// Template library (S1-27, mockup screen 8). Agents only; staff are sent home.
export default async function TemplatesPage() {
  const profile = await requireRole(["agent", "manager"]);

  return (
    <div className="min-h-screen bg-page">
      <AgentHeader profile={profile} current="templates" />
      <TemplateLibrary myDepartment={profile.role === "manager" ? null : profile.department} />
    </div>
  );
}
