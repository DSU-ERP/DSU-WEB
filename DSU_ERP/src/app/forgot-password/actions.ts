"use server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/shared/auth/supabase";
import { siteOrigin } from "@/shared/config/site";

export type ResetRequestState = { error: string; success: string };

// The reset link returns through the same allowlisted /auth/confirm route as
// sign-up confirmations. This short-lived marker tells that route to open the
// new-password page instead of the workspace.
const RESET_COOKIE = "dsu-password-reset";
const SENT =
  "If an account uses that email, a link to reset the password is on its way. Check your inbox and spam folder; the link works once and expires in about an hour.";

/** Sends a password reset email. The reply never reveals whether the account exists. */
export async function requestPasswordReset(_previous: ResetRequestState, form: FormData): Promise<ResetRequestState> {
  const email = String(form.get("email") || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    return { error: "Enter a valid email address.", success: "" };
  try {
    (await cookies()).set(RESET_COOKIE, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });
    const client = await supabaseServer();
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${siteOrigin()}/auth/confirm` });
    if (error && (error as { status?: number }).status === 429)
      return { error: "Too many reset requests. Please wait a minute and try again.", success: "" };
  } catch {
    return { error: "Password reset is temporarily unavailable. Please try again.", success: "" };
  }
  return { error: "", success: SENT };
}
