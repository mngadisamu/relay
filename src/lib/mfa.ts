import { createClient } from "@/lib/supabase/server";
import type { CurrentProfile } from "@/lib/auth";

// S4-17: managers and compliance officers must also give a code from their authenticator app.
// The page check (src/lib/supabase/middleware.ts) covers pages and server actions. /api routes
// skip that check, so each route that managers use calls this as well.
// Returns true when the second step is still missing for this signed-in person.
export async function secondStepMissing(profile: CurrentProfile): Promise<boolean> {
  if (profile.role !== "manager" && profile.role !== "compliance") return false;
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return !!data && data.currentLevel !== "aal2";
}
