import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Runs before every page request.
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

// Skip files that never need a session: Next.js internals, images and the favicon.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};