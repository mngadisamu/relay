import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isDemoAccount } from "@/lib/demo";
import { companySlugFromHost } from "@/lib/company-host";

// Pages anyone can open without signing in. /auth/... is where an invite
// email's link lands, before the person has a session (S2-25).
// /forgot-password asks for a reset email (S2-36). /reset-password is not public:
// the email's link signs the person in first.
const PUBLIC_PATHS = ["/", "/login", "/demo", "/forgot-password", "/auth/confirm", "/auth/link-expired"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Checks who is signed in, and refreshes their session if it is about to expire.
  // getClaims() verifies the token locally instead of a round trip to Supabase Auth
  // on every page, which was a big part of the slow page loads.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.includes(path) || path.startsWith("/api");

  // Not signed in and trying to open a private page: send them to the login page.
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // S4-17: managers and compliance officers also need a code from their authenticator app.
  // Until they have given it this session, every private page sends them to the second step.
  // The /mfa pages themselves are left open, or the redirect would loop.
  // A new person sets their password here before their second step (invite or reset link),
  // so these pages are open to a signed-in person who has not finished the second step.
  const SETUP_PATHS = ["/welcome", "/reset-password"];
  if (user && !isPublic && !path.startsWith("/mfa") && !SETUP_PATHS.includes(path)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.sub)
      .single();

    // P7 and the company's two-step setting (migration 0030). Before 0030 runs this lookup
    // fails, and then the company is unknown: the two-step rule below stays on (fail closed).
    const { data: membership, error: membershipError } = await supabase
      .from("profiles")
      .select("companies(slug, require_two_step)")
      .eq("id", user.sub)
      .single();
    const company = membershipError
      ? null
      : ((membership?.companies ?? null) as unknown as { slug: string; require_two_step: boolean } | null);

    // A company's address (kopano.<base>) only lets in its own people. The check is done on the
    // server, on every private page. Only active when RELAY_BASE_DOMAIN is set.
    const siteCompany = companySlugFromHost(request.headers.get("host"), process.env.RELAY_BASE_DOMAIN);
    if (siteCompany && (membershipError || company?.slug !== siteCompany)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // Demo accounts (Kopano Freight) skip the second step. See lib/demo.ts.
    const demo = isDemoAccount(String(user.email ?? ""));
    // The company's setting decides the second step for managers and compliance (unknown company: on).
    const requireTwoStep = company ? company.require_two_step : true;
    if (profile && !demo && requireTwoStep && (profile.role === "manager" || profile.role === "compliance")) {
      const { data: level } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (level && level.currentLevel !== "aal2") {
        // Has an app set up already: ask for a code. Not set up yet: start set-up.
        const url = request.nextUrl.clone();
        url.pathname = level.nextLevel === "aal2" ? "/mfa/verify" : "/mfa/enrol";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}