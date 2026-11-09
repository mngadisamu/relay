"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Where the invite email's link (S2-25) and the password reset link (S2-36) land. Supabase's own email (the
// default template, which can't be edited without our own email server)
// first checks the link on Supabase's site, then sends the person here with
// their sign-in in the address after "#". Only the browser can read that part,
// so this page runs in the browser: it saves the sign-in (as cookies, so the
// server sees it too) and opens /welcome to choose a password.
// If the link carries ?token_hash instead (a custom template), it checks that.
// Public (middleware), because the person isn't signed in yet.
export default function ConfirmInvitePage() {
  useEffect(() => {
    const supabase = createClient();
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);

    async function finish() {
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const tokenHash = query.get("token_hash");

      let ok = false;
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        ok = !error;
      } else if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ type: "invite", token_hash: tokenHash });
        ok = !error;
      }
      // Where to go next: a password reset link (S2-36) asks for /reset-password;
      // an invite goes to /welcome. Only these two, so the link can't send
      // anyone somewhere else.
      const next = query.get("next") === "/reset-password" || hash.get("type") === "recovery" ? "/reset-password" : "/welcome";
      // A full page load (not a client jump), so the server reads the new cookies.
      // replace(): the link's address, with its sign-in, isn't kept in the history.
      window.location.replace(ok ? next : "/auth/link-expired");
    }
    finish();
  }, []);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy px-4">
      <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5" />
      <div aria-hidden="true" className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/5" />
      <p role="status" className="relative flex items-center gap-3 text-[15px] font-medium text-white">
        <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        Opening Relay…
      </p>
    </main>
  );
}
