import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  // Student handlers call userSession(), which verifies the user with Supabase
  // and can refresh cookies itself. Avoid another auth round trip here before
  // every answer, caption-related request and chat message. Pages still refresh
  // in the proxy because Server Components cannot write refreshed cookies.
  if (request.nextUrl.pathname.startsWith("/student/api/")) {
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url && key) {
    const client = createServerClient(url, key, {
      cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (values) => {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });
    // Session checks in pages/actions remain authoritative if refresh is unavailable.
    try {
      await client.auth.getUser();
    } catch {}
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/portal/:path*",
    "/placement/:path*",
    "/student/:path*",
    "/login",
    "/workspace",
    "/access",
    '/onboarding',
  ],
};
