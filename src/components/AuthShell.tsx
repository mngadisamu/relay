import type { ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";

// The look of every page someone sees before they're in Relay: sign in, the
// invite's Welcome, forgot and reset password, and an expired link.
// A navy panel with a faint route map between Kopano Freight's three sites
// (the login design, S1-09), and the page's card beside it (below it on phones).

// Faint route map between the three Kopano Freight sites (decoration only).
function RouteMap() {
  return (
    <svg aria-hidden="true" viewBox="0 0 720 900" preserveAspectRatio="xMidYMid slice" fill="none" className="absolute inset-0 h-full w-full">
      <g stroke="#FFFFFF" strokeOpacity="0.07" strokeWidth="1">
        <path d="M-40 760 C 80 700, 180 730, 280 650 S 520 560, 780 600" />
        <path d="M-40 790 C 90 732, 190 760, 296 680 S 536 592, 780 632" />
        <path d="M-40 820 C 100 764, 200 790, 312 710 S 552 624, 780 664" />
        <path d="M-40 160 C 60 200, 200 170, 300 230 S 560 250, 780 190" />
        <path d="M-40 130 C 70 168, 210 140, 316 200 S 572 220, 780 160" />
      </g>
      <g stroke="#FFFFFF" strokeOpacity="0.24" strokeWidth="1.5" strokeDasharray="5 7" strokeLinecap="round">
        <path d="M140 752 L 380 700 L 590 770" />
        <path d="M380 700 L 620 660" />
      </g>
      <g fill="#0B3D73" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="2">
        <circle cx="140" cy="752" r="9" />
        <circle cx="380" cy="700" r="11" />
        <circle cx="590" cy="770" r="9" />
        <circle cx="620" cy="660" r="7" />
      </g>
      <g fill="#FFFFFF" fillOpacity="0.5" fontFamily="Inter, system-ui, sans-serif" fontSize="12" fontWeight="600" letterSpacing="1">
        <text x="104" y="784">CITY DEEP</text>
        <text x="336" y="736">HEAD OFFICE</text>
        <text x="556" y="802">POMONA</text>
      </g>
    </svg>
  );
}

// A small picture at the top of the card: a key for passwords, an envelope
// for emails, a clock for expired links, a wave for welcome.
const ICONS = {
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l9-9M17 6l2 2M15 8l2 2" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  hello: (
    <>
      <path d="M5 12l4 4L19 6" />
    </>
  ),
};

export function AuthShell({
  heading,
  blurb,
  icon,
  children,
  footer,
}: {
  heading: string; // the big line on the navy panel (desktop)
  blurb: string; // the line under it, also shown on phones
  icon?: keyof typeof ICONS;
  children: ReactNode; // the card's content, starting with its h1
  footer?: ReactNode; // small print under the card
}) {
  return (
    <div className="flex min-h-screen flex-col bg-page lg:flex-row">
      <section
        aria-label="About Relay"
        className="relative overflow-hidden bg-navy px-6 pb-40 pt-16 text-white lg:flex lg:min-h-screen lg:flex-1 lg:flex-col lg:justify-between lg:px-16 lg:py-14"
      >
        <RouteMap />
        <div className="relative space-y-2">
          <BrandMark size="lg" inverted />
          <p className="text-[15px] leading-[21px] text-[#d6e2f2] lg:hidden">{blurb}</p>
        </div>
        <div className="relative hidden max-w-[460px] space-y-[18px] lg:block">
          <h2 className="text-[38px] font-bold leading-[46px] tracking-tight">{heading}</h2>
          <p className="text-[17px] leading-[26px] text-[#d6e2f2]">{blurb}</p>
          <div className="flex flex-wrap gap-2 pt-1.5">
            {["HR", "IT", "Finance", "Operations"].map((d) => (
              <span key={d} className="rounded-full border border-white/35 px-3 py-1.5 text-[13px] font-medium">
                {d}
              </span>
            ))}
          </div>
        </div>
        <p className="relative hidden text-[13px] text-[#b9cce6] lg:block">Kopano Freight (Pty) Ltd · Johannesburg</p>
      </section>

      <section className="-mt-28 flex flex-1 items-start justify-center px-6 pb-8 lg:mt-0 lg:items-center lg:px-6 lg:py-12">
        <div className="relative w-full max-w-[420px] space-y-6">
          <div className="space-y-5 rounded-xl border border-line bg-white px-5 py-6 shadow-[0_8px_24px_rgba(11,35,66,0.10)] lg:px-8 lg:py-9">
            {icon && (
              <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e8f0fb] text-brand">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {ICONS[icon]}
                </svg>
              </span>
            )}
            {children}
          </div>
          {footer}
          <p className="text-center text-xs text-muted lg:hidden">Kopano Freight (Pty) Ltd · Johannesburg</p>
        </div>
      </section>
    </div>
  );
}
