import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RoleHeader } from "@/components/RoleHeader";
import { MANAGER_MENU } from "@/lib/menus";
import { AddPersonForm } from "./AddPersonForm";
import { PersonRow, type Person } from "./PersonRow";

// Manage users (S2-25): managers add people and set their role and department,
// so nobody has to open the Supabase dashboard. Agents and others are sent
// back to their own home by requireRole.
export default async function ManageUsersPage() {
  const profile = await requireRole(["manager"]);

  // Everyone, with their email (list_people(), migration 0012: managers only).
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_people");
  const everyone = (data ?? []) as Person[];
  const people = everyone.filter((p) => p.active);
  const left = everyone.filter((p) => !p.active); // removed from Relay (S2-35)

  return (
    <div className="min-h-screen bg-page">
      <RoleHeader profile={profile} home="/manager" menu={MANAGER_MENU} current="/manager/users" />
      <main className="mx-auto max-w-[1100px] space-y-6 px-4 pb-12 pt-7 sm:px-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-ink">Manage users</h1>
          <p className="text-[15px] text-ink-2">
            Add people to Relay and choose what they can do. New people get an email to set their password.
            {profile.department
              ? ` As the ${profile.department} manager, you can add staff and ${profile.department} agents.`
              : " A manager with no department sees every department."}
          </p>
        </div>

        <AddPersonForm myDepartment={profile.department} />

        <section aria-labelledby="people-heading" className="space-y-3">
          <h2 id="people-heading" className="text-lg font-semibold text-ink">
            People ({people.length})
          </h2>
          {error ? (
            <p role="alert" className="rounded-md border border-[#f0c8c3] bg-[#fdf1ef] px-3 py-2.5 text-sm text-[#a4231a]">
              The list couldn&apos;t be loaded: {error.message}
            </p>
          ) : (
            <ul className="divide-y divide-line-soft rounded-[10px] border border-line bg-white">
              {people.map((p) => (
                <PersonRow key={p.id} person={p} isMe={p.id === profile.id} />
              ))}
            </ul>
          )}
        </section>

        {left.length > 0 && (
          <section aria-labelledby="left-heading" className="space-y-3">
            <div className="space-y-1">
              <h2 id="left-heading" className="text-lg font-semibold text-ink">
                Left Relay ({left.length})
              </h2>
              <p className="text-sm text-ink-2">
                They can&apos;t sign in. Their tickets, replies and audit history stay, so nothing is lost.
              </p>
            </div>
            <ul className="divide-y divide-line-soft rounded-[10px] border border-line bg-white">
              {left.map((p) => (
                <PersonRow key={p.id} person={p} isMe={false} />
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
