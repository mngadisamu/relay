import { signOut } from "@/app/login/actions";
import type { CurrentProfile } from "@/lib/auth";

type Props = {
  title: string;
  description: string;
  profile: CurrentProfile;
};

// The shared layout for every role's home screen.
export function RoleHome({ title, description, profile }: Props) {
  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm opacity-70">Relay · Kopano Freight</p>
            <h1 className="text-2xl font-semibold">{title}</h1>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-gray-400 px-3 py-1.5 text-sm"
            >
              Sign out
            </button>
          </form>
        </header>

        <p>{description}</p>

        <dl className="rounded-md border border-gray-300 p-4 text-sm space-y-1">
          <div>
            <dt className="inline font-medium">Signed in as: </dt>
            <dd className="inline">{profile.email}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Role: </dt>
            <dd className="inline">{profile.role}</dd>
          </div>
          {profile.department && (
            <div>
              <dt className="inline font-medium">Department: </dt>
              <dd className="inline">{profile.department}</dd>
            </div>
          )}
        </dl>
      </div>
    </main>
  );
}