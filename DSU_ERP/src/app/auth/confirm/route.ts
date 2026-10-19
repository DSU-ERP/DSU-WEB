import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/auth/supabase";
import { siteOrigin } from "@/shared/config/site";
function confirmationRedirect(path: string, origin: string) {
  const response = NextResponse.redirect(new URL(path, origin));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
export async function GET(request: NextRequest) {
  const origin = siteOrigin(),
    code = request.nextUrl.searchParams.get("code"),
    hash = request.nextUrl.searchParams.get("token_hash");
  try {
    const client = await supabaseServer();
    const result = code
      ? await client.auth.exchangeCodeForSession(code)
      : hash
        ? await client.auth.verifyOtp({ token_hash: hash, type: "email" })
        : null;
    if (result && !result.error)
      return confirmationRedirect("/workspace?portal=student", origin);
  } catch {}
  return confirmationRedirect("/sign-up?verification=failed", origin);
}
