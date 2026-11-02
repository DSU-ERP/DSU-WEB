import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
// The student layout reads this request header to apply the skills onboarding
// gate before any page renders (layouts do not receive the pathname). It is
// always set here from the URL, so a value sent by the browser never survives.
const PATHNAME_HEADER = "x-dsu-pathname";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/student" || path.startsWith("/student/")) request.headers.set(PATHNAME_HEADER, path);
  else request.headers.delete(PATHNAME_HEADER);
  let response = NextResponse.next({ request });
  // Student handlers call userSession(), which verifies the user with Supabase
  // and can refresh cookies itself. Avoid another auth round trip here before
  // every answer, caption-related request and chat message. Pages still refresh
  // in the proxy because Server Components cannot write refreshed cookies.
  if (path.startsWith("/student/api/") || path.startsWith("/company/api/") || path.startsWith("/admin/api/")) {
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
    "/company/:path*",
    "/admin/:path*",
    "/join/:path*",
    "/login",
    "/workspace",
    "/access",
    '/onboarding',
  ],
};
