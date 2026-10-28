import Link from "next/link";
import { signOut } from "@/app/login/actions";

// Top bar for staff pages: only the two pages staff can use (S1-18).
export function StaffNav({ current }: { current: "submit" | "requests" }) {
  const linkClass = (active: boolean) =>
    `border-b-2 px-1 pb-3 pt-1 text-sm ${
      active ? "border-blue-700 font-semibold text-blue-700" : "border-transparent text-gray-600 hover:text-gray-900"
    }`;

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-3">
        <span className="text-lg font-bold text-gray-900">Relay</span>
        <form action={signOut}>
          <button type="submit" className="py-2 text-sm font-medium text-blue-700 hover:underline">
            Sign out
          </button>
        </form>
      </div>
      <nav aria-label="Main" className="mx-auto flex max-w-3xl gap-6 px-4 pt-2">
        <Link href="/staff" aria-current={current === "submit" ? "page" : undefined} className={linkClass(current === "submit")}>
          Submit request
        </Link>
        <Link href="/staff/requests" aria-current={current === "requests" ? "page" : undefined} className={linkClass(current === "requests")}>
          My requests
        </Link>
      </nav>
    </header>
  );
}
