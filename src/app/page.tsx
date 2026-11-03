import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { RoutingIllustration } from "@/components/RoutingIllustration";

// What happens to a request, in order (so numbering it is right).
const STEPS = [
  { title: "Ask", text: "Write what you need, from your desk, a site or the road. No forms to pick, no team to guess." },
  { title: "Routed", text: "Relay reads the request and sends it to the right team. Anything it isn't sure about is marked for a person to check." },
  { title: "Answered", text: "The team gets an AI-drafted reply to start from, checks and edits it, and sends it. You see every update." },
];

// Public home page (S2-02): what Relay does, and Sign in.
// Text colours on the navy and white backgrounds meet WCAG 2.1 AA contrast.
export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <section className="relative overflow-hidden bg-navy text-white">
        {/* Faint dot grid behind the hero (decoration only) */}
        <svg aria-hidden="true" className="absolute inset-0 h-full w-full">
          <defs>
            <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.3" fill="#ffffff" fillOpacity="0.09" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>

        <div className="relative mx-auto max-w-[1200px] px-5 pb-14 pt-6 sm:px-8 lg:pb-20">
          <header className="flex items-center justify-between">
            <BrandMark size="md" inverted />
            <Link href="/login" className="rounded-md px-2 py-2 text-sm font-semibold text-white hover:text-[#d6e2f2]">
              Sign in
            </Link>
          </header>

          <div className="mt-12 grid items-center gap-12 lg:mt-16 lg:grid-cols-[1fr_1.15fr]">
            <div className="max-w-[520px] space-y-6">
              <h1 className="text-[40px] font-bold leading-[1.05] tracking-[-0.02em] sm:text-[56px]">
                Every request finds its way.
              </h1>
              <p className="text-[17px] leading-7 text-[#d6e2f2] sm:text-lg">
                Relay is the help desk that sorts itself. Staff ask in their own words, Relay sends each request to the
                team that can answer it, and that team replies fast with an AI-drafted reply they check first.
              </p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
                <Button asChild size="lg" className="h-12 bg-white px-7 text-base text-navy hover:bg-[#e7f0fb]">
                  <Link href="/login">Sign in</Link>
                </Button>
                <p className="text-sm text-[#b9cce6]">No account yet? Your company&apos;s Relay admin adds you.</p>
              </div>
            </div>

            <div className="mx-auto w-full max-w-[600px]">
              <RoutingIllustration />
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="how-it-works" className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8 lg:py-20">
        <h2 id="how-it-works" className="text-2xl font-bold tracking-[-0.01em] text-ink">
          How a request travels
        </h2>
        <ol className="mt-8 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((step, i) => (
            <li key={step.title} className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="text-lg font-semibold text-ink">{step.title}</h3>
              </div>
              <p className="max-w-[340px] text-[15px] leading-6 text-ink-2">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-muted sm:px-8">
          <BrandMark size="sm" />
          <p>Built by the Relay team at the CAPACITI AI Bootcamp, 2026.</p>
        </div>
      </footer>
    </div>
  );
}