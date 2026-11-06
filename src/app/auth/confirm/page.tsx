"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Where the invite email's link lands (S2-25). Supabase's own email (the
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
      // A full page load (not a client jump), so the server reads the new cookies.
      // replace(): the link's address, with its sign-in, isn't kept in the history.
      window.location.replace(ok ? "/welcome" : "/auth/link-expired");
    }
    finish();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-4">
      <p role="status" className="text-[15px] text-ink-2">
        Opening your invite…
      </p>
    </main>
  );
}
