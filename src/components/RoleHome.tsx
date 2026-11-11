import Link from "next/link";
import type { CurrentProfile } from "@/lib/auth";
import { RoleHeader, type MenuItem } from "@/components/RoleHeader";

type Props = {
  title: string;
  description: string;
  profile: CurrentProfile;
  home: string;
  menu: MenuItem[];
};

// Home page for managers and compliance (S2-02): the role's menu bar, then one card
// per page in the menu.
export function RoleHome({ title, description, profile, home, menu }: Props) {
  const firstName = profile.fullName.split(" ")[0];

  return (
    <div className="min-h-screen bg-page">
      <RoleHeader profile={profile} home={home} menu={menu} />
      <main className="mx-auto max-w-[1360px] space-y-6 px-4 pb-12 pt-7 sm:px-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-ink sm:text-2xl">{title}</h1>
          <p className="text-[15px] text-ink-2">
            Hi {firstName}. {description}
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {menu.map((item) => (
            <li key={item.href}>
              <MenuCard item={item} />
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

// One card: a link when the page is ready, plain text when it's still being built.
// Status is shown in words and colour, not colour alone (WCAG).
function MenuCard({ item }: { item: MenuItem }) {
  const cardClass = "flex h-full flex-col gap-2 rounded-lg border border-line bg-white p-5";
  const status = item.ready ? "Open" : "Coming this sprint";
  const statusClass = item.ready ? "bg-brand-soft text-brand-dark" : "bg-page text-muted";

  const content = (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">{item.label}</h2>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}`}>{status}</span>
      </div>
      <p className="text-sm leading-5 text-ink-2">{item.description}</p>
    </div>
  );

  if (item.ready) {
    return (
      <Link prefetch href={item.href} className={`${cardClass} hover:border-brand`}>
        {content}
      </Link>
    );
  }
  return <div className={cardClass}>{content}</div>;
}