// invite-user: a Supabase Edge Function for Manage users (S2-25). Owner: Samukelo.
//
// Why this lives in Supabase and not in Relay: sending an invite email needs
// Supabase's secret (service-role) key, and Relay's rule is that the secret key
// never goes in the app's code. Supabase gives every Edge Function that key
// itself (SUPABASE_SERVICE_ROLE_KEY), so nobody copies it anywhere.
//
// What it does, for a manager signed in to Relay:
//   1. checks the caller is a manager (from their own sign-in token);
//   2. sends the invite email (Supabase adds the person to auth.users, and the
//      0002 trigger gives them a profile with role staff);
//   3. sets their role and department with set_user_role() (migration 0012),
//      called AS THE MANAGER, so the same rules and the user_create audit entry
//      apply as everywhere else. If that step is refused, the invite is undone.
//
// Deploy: Supabase dashboard → Edge Functions → Deploy a new function → Via editor,
// name it invite-user, paste this file, Deploy. Then, in its Details, switch
// "Verify JWT with legacy secret" OFF: this function checks the token itself (step 1).
//
// Relay calls it from src/app/manager/users/actions.ts with:
//   supabase.functions.invoke("invite-user", { body: { email, fullName, role, department, redirectTo } })

import { createClient } from "npm:@supabase/supabase-js@2";

const ROLES = ["staff", "agent", "manager", "compliance"];
const DEPARTMENTS = ["HR", "IT", "Finance", "Operations"];

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return reply(405, { error: "Use POST" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // 1. Who is calling? Their sign-in token comes in the Authorization header.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return reply(401, { error: "Sign in first" });

  // "admin" uses the secret key: only for the invite and its undo.
  const admin = createClient(url, secretKey, { auth: { persistSession: false } });
  // "asCaller" acts as the signed-in manager, so row-level security and the
  // database functions treat it exactly like Relay does.
  const asCaller = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return reply(401, { error: "Sign in first" });

  // A manager who has been removed from Relay (S2-35, migration 0013) may still
  // hold a sign-in token for up to an hour, so "active" is checked too.
  const { data: me } = await asCaller.from("profiles").select("role, active").eq("id", userData.user.id).single();
  if (me?.role !== "manager" || !me.active) return reply(403, { error: "Only managers can add people" });

  // 2. Check what was sent before inviting anyone.
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const fullName = String(body?.fullName ?? "").trim();
  const role = String(body?.role ?? "");
  const department = body?.department ? String(body.department) : null;
  const redirectTo = typeof body?.redirectTo === "string" ? body.redirectTo : undefined;

  if (!fullName) return reply(400, { error: "Enter their full name", field: "fullName" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(400, { error: "Enter a valid email address", field: "email" });
  if (!ROLES.includes(role)) return reply(400, { error: "Choose a role", field: "role" });
  if (department && !DEPARTMENTS.includes(department)) return reply(400, { error: "Choose a department", field: "department" });
  if (role === "agent" && !department) return reply(400, { error: "Choose a department for this agent", field: "department" });

  // 3. Send the invite. The email's link opens Relay's /auth/confirm page.
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo,
  });
  if (inviteError || !invited.user) {
    const taken = /already|registered|exists/i.test(inviteError?.message ?? "");
    return reply(400, {
      error: taken ? "Someone with this email is already in Relay. Change their role in the list instead." : `The invite couldn't be sent: ${inviteError?.message}`,
      field: taken ? "email" : undefined,
    });
  }

  // 4. Their role and department, as the manager (rules and audit entry in 0012).
  const { error: roleError } = await asCaller.rpc("set_user_role", {
    p_user_id: invited.user.id,
    p_role: role,
    p_department: department,
    p_new: true,
  });
  if (roleError) {
    // Undo the invite, so nobody is left half-added as staff.
    await admin.auth.admin.deleteUser(invited.user.id);
    return reply(400, { error: roleError.message, field: /department/i.test(roleError.message) ? "department" : undefined });
  }

  return reply(200, { userId: invited.user.id });
});
