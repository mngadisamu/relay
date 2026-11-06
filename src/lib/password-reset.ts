import { headers } from "next/headers";
import { createClient as createPlainClient } from "@supabase/supabase-js";

// "Choose a new password" emails (S2-36), for Forgot your password and for a
// manager's Send password reset.
//
// The link must work in whatever browser or phone the person opens it on, so
// this uses Supabase's "implicit" link (the sign-in comes back in the link
// itself), not the default one tied to the browser that asked. It uses only
// the public (publishable) key: Supabase sends the email itself, and nothing
// here can read or change an account.

// This site's address (live, preview or local), so the link comes back here.
export async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function sendPasswordResetEmail(email: string) {
  const supabase = createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false },
  });
  // The link opens /auth/confirm, which signs them in and opens /reset-password.
  const redirectTo = `${await siteOrigin()}/auth/confirm?next=/reset-password`;
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}
