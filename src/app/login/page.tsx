"use client";

import { useActionState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

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

// Sign in (S1-09, mockup screens 1 and 1b): navy band on phones, split screen on desktop.
export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(signIn, initialState);

  return (
    <div className="flex min-h-screen flex-col bg-page lg:flex-row">
      <section aria-label="About Relay" className="relative overflow-hidden bg-navy px-6 pb-40 pt-16 text-white lg:flex lg:min-h-screen lg:flex-1 lg:flex-col lg:justify-between lg:px-16 lg:py-14">
        <RouteMap />
        <div className="relative space-y-2">
          <BrandMark size="lg" inverted />
          <p className="text-[15px] leading-[21px] text-[#d6e2f2] lg:hidden">Kopano Freight help desk for HR, IT, Finance and Operations</p>
        </div>
        <div className="relative hidden max-w-[460px] space-y-[18px] lg:block">
          <h2 className="text-[38px] font-bold leading-[46px] tracking-tight">One place to ask for help at Kopano Freight.</h2>
          <p className="text-[17px] leading-[26px] text-[#d6e2f2]">
            Send a request from the depot, the road or the office. Relay gets it to the right team and keeps you posted until it&apos;s sorted.
          </p>
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
          {/* Built from the shared shadcn/ui components (S1-12), in Relay's colours. */}
          <Card className="gap-5 py-6 shadow-[0_8px_24px_rgba(11,35,66,0.10)] lg:py-9">
            <CardHeader className="gap-1.5 px-5 lg:px-8">
              {/* The page's main heading, so it's an h1 rather than CardTitle's h2. */}
              <h1 className="text-xl font-semibold text-ink lg:text-2xl">Sign in</h1>
              <CardDescription>Use your Kopano Freight work email.</CardDescription>
            </CardHeader>
            <CardContent className="px-5 lg:px-8">
              <form action={formAction} className="space-y-5">
                {state.error && (
                  <p role="alert" className="rounded-md border border-[#f4c7c2] bg-[#fdecea] px-3 py-2.5 text-sm leading-5 text-destructive">
                    {state.error}
                  </p>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email">Work email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    aria-invalid={state.error ? true : undefined}
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    aria-invalid={state.error ? true : undefined}
                    className="h-12 text-base"
                  />
                </div>

                <Button type="submit" size="lg" disabled={isPending} className="h-12 w-full text-base">
                  {isPending ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mx-auto max-w-[300px] text-center text-sm leading-5 text-muted lg:max-w-none">
            No account yet, or forgot your password? Ask your manager or the IT desk on ext. 2204.
          </p>
          <p className="text-center text-xs text-muted lg:hidden">Kopano Freight (Pty) Ltd · Johannesburg</p>
        </div>
      </section>
    </div>
  );
}
