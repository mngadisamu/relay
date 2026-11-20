import Link from "next/link";

// Tabs for Manage users (story P4). "Company" shows only to general managers.
export function CompanyTabs({ current, isGeneral }: { current: "people" | "company"; isGeneral: boolean }) {
  const tab = (active: boolean) =>
    `rounded-md px-3 py-2 text-sm font-semibold ${active ? "bg-brand text-white" : "text-ink-2 hover:bg-accent"}`;
  return (
    <nav aria-label="Manage users sections" className="flex gap-2">
      <Link href="/manager/users" className={tab(current === "people")} aria-current={current === "people" ? "page" : undefined}>
        People
      </Link>
      {isGeneral && (
        <Link href="/manager/company" className={tab(current === "company")} aria-current={current === "company" ? "page" : undefined}>
          Company
        </Link>
      )}
    </nav>
  );
}
