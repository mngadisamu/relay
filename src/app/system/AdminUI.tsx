import Link from "next/link";
import type { ReactNode } from "react";

// Shared pieces for the platform admin pages: the navy header band, company marks,
// number tiles, breadcrumbs and small icons. Same colours as the rest of Relay (globals.css)
// and the home page's transit-map lines (RoutingIllustration).

// The four line colours from the home page illustration, with a dark text colour for each,
// so a company mark is readable (all pairs pass 4.5:1).
const MARK_COLOURS = [
  { bg: "#ccfbf1", fg: "#115e59" },
  { bg: "#dbeafe", fg: "#0b4c94" },
  { bg: "#fef3c7", fg: "#854d0e" },
  { bg: "#ede9fe", fg: "#5b21b6" },
];

// The same company always gets the same colour.
function colourFor(name: string) {
  let sum = 0;
  for (const ch of name) sum = (sum + ch.charCodeAt(0)) % 997;
  return MARK_COLOURS[sum % MARK_COLOURS.length];
}

export function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

// A square with the company's (or person's) initials. Decorative: the name is always next to it.
export function Mark({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const c = colourFor(name);
  const box = size === "lg" ? "h-14 w-14 text-lg rounded-xl" : size === "sm" ? "h-9 w-9 text-xs rounded-lg" : "h-11 w-11 text-sm rounded-lg";
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center font-bold ${box}`} style={{ background: c.bg, color: c.fg }}>
      {initialsOf(name)}
    </span>
  );
}

// The navy band at the top of each admin page, with the transit lines drawn faintly behind.
export function AdminHero({
  eyebrow,
  title,
  description,
  leading,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  leading?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-navy px-5 py-7 text-white sm:px-8 sm:py-9">
      <HeroLines />
      <div className="relative flex min-w-0 items-start gap-4 md:max-w-[60%]">
        {leading}
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8cc4ff]">{eyebrow}</p>
          <h1 className="break-words text-2xl font-semibold leading-tight sm:text-[28px]">{title}</h1>
          {description && <div className="text-[15px] leading-6 text-[#d6e2f2]">{description}</div>}
          {children && <div className="pt-2">{children}</div>}
        </div>
      </div>
    </section>
  );
}

// Decorative lines: three stations on the left meet at a hub and leave for four teams.
function HeroLines() {
  const teams = [
    { y: 30, c: "#5eead4" },
    { y: 80, c: "#8cc4ff" },
    { y: 130, c: "#fcd34d" },
    { y: 180, c: "#c4b5fd" },
  ];
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 520 210"
      className="pointer-events-none absolute -right-10 top-1/2 hidden h-[220px] w-[540px] -translate-y-1/2 opacity-40 md:block"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g stroke="#ffffff" strokeOpacity="0.45" strokeWidth="5">
        <path d="M20 50 H120 L170 105 H210" />
        <path d="M20 105 H210" />
        <path d="M20 160 H120 L170 105 H210" />
      </g>
      {teams.map((t) => (
        <path key={t.y} d={`M270 105 H300 L350 ${t.y} H500`} stroke={t.c} strokeWidth="5" />
      ))}
      <rect x="208" y="80" width="64" height="50" rx="14" fill="#ffffff" fillOpacity="0.14" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2" />
      {teams.map((t) => (
        <circle key={`s${t.y}`} cx="500" cy={t.y} r="8" fill="#0b3d73" stroke={t.c} strokeWidth="4" />
      ))}
      {[50, 105, 160].map((y) => (
        <circle key={`o${y}`} cx="20" cy={y} r="7" fill="#0b3d73" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="3" />
      ))}
    </svg>
  );
}

// One number with its label and a small icon. The number is shown with South African spacing.
export function StatTile({ label, value, hint, icon }: { label: string; value: number | null; hint?: string; icon: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(22,25,29,0.04)]">
      <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <p className="text-2xl font-semibold tabular-nums text-ink">{value === null ? "–" : value.toLocaleString("en-ZA")}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}

// A white card with a heading. Used for each block on the admin pages.
export function Panel({
  id,
  title,
  description,
  action,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="min-w-0 rounded-xl border border-line bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line-soft px-5 py-4">
        <div className="space-y-0.5">
          <h2 id={id} className="text-base font-semibold text-ink">{title}</h2>
          {description && <p className="text-sm text-ink-2">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

// "Companies / Kopano Freight / Edit": where you are, with links back.
export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true" className="text-muted">/</span>}
            {item.href ? (
              <Link href={item.href} className="font-semibold text-brand hover:text-brand-dark">{item.label}</Link>
            ) : (
              <span aria-current="page" className="text-ink-2">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Status in words and colour (WCAG: never colour alone).
export function StatusTag({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f6ee] px-2.5 py-0.5 text-xs font-semibold text-[#0f6b3c]">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-page px-2.5 py-0.5 text-xs font-semibold text-muted">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-muted" />
      Removed
    </span>
  );
}

// The privacy promise, shown on every admin page.
export function PrivacyNote({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium text-white">
      <IconShield />
      {children}
    </p>
  );
}

// Small stroke icons (24px grid), decorative only.
const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const IconBuilding = () => (
  <svg {...iconProps}><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M3 21h18M8 8h3M8 12h3M8 16h3" /></svg>
);
export const IconPeople = () => (
  <svg {...iconProps}><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0M16 4.5a3 3 0 0 1 0 6M18 14.5a5 5 0 0 1 3 4.5" /></svg>
);
export const IconTicket = () => (
  <svg {...iconProps}><path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z" /><path d="M10 7v10" strokeDasharray="2 2" /></svg>
);
export const IconReply = () => (
  <svg {...iconProps}><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 6 6v4" /></svg>
);
export const IconMail = () => (
  <svg {...iconProps}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>
);
export const IconShield = () => (
  <svg {...iconProps} width={14} height={14}><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6Z" /><path d="m9 12 2 2 4-4" /></svg>
);
export const IconArrow = () => (
  <svg {...iconProps} width={18} height={18}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const IconPlus = () => (
  <svg {...iconProps} width={18} height={18}><path d="M12 5v14M5 12h14" /></svg>
);
