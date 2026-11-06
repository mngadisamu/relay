import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages anyone can open without signing in. /auth/... is where an invite
// email's link lands, before the person has a session (S2-25).
// /forgot-password asks for a reset email (S2-36). /reset-password is not public:
// the email's link signs the person in first.
const PUBLIC_PATHS = ["/", "/login", "/forgot-password", "/auth/confirm", "/auth/link-expired"];

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

  return response;
}