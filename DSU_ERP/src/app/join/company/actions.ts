"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/auth/supabase";
import { siteOrigin } from "@/shared/config/site";
import { backendApi } from "@/shared/http/backend";
import { CampusError } from "@/shared/http/errors";

export type JoinState = { error: string; success: string };
const TOKEN = /^[A-Za-z0-9_-]{40,64}$/;
const joinPath = (token: string) => `/join/company?token=${encodeURIComponent(token)}`;
// Remembers a pending invitation while the contact confirms their email, so the
// confirmation link (the same allowlisted /auth/confirm students use) can bring
// them back here. Only the one-time token is stored, for at most seven days.
const INVITE_COOKIE = "dsu-company-invite";
async function rememberInvite(token: string) {
  (await cookies()).set(INVITE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

/** Links the signed-in account to the company that invited it. */
export async function acceptInvite(_previous: JoinState, form: FormData): Promise<JoinState> {
  const token = String(form.get("token") || "");
  if (!TOKEN.test(token)) return { error: "This invitation link is incomplete. Open the full link from the email.", success: "" };
  try {
    await backendApi("/company/invites/accept", { method: "POST", body: JSON.stringify({ token }) });
    (await cookies()).delete(INVITE_COOKIE);
  } catch (error) {
    return { error: error instanceof CampusError ? error.message : "The invitation could not be accepted. Try again.", success: "" };
  }
  redirect("/company");
}

export async function companySignIn(_previous: JoinState, form: FormData): Promise<JoinState> {
  const token = String(form.get("token") || "");
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  if (!TOKEN.test(token)) return { error: "This invitation link is incomplete.", success: "" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) return { error: "Enter your email address and password.", success: "" };
  try {
    const client = await supabaseServer();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { error: "Unable to sign in. Check your email and password.", success: "" };
  } catch {
    return { error: "Sign in is temporarily unavailable. Try again.", success: "" };
  }
  redirect(joinPath(token));
}

export async function companySignUp(_previous: JoinState, form: FormData): Promise<JoinState> {
  const token = String(form.get("token") || "");
  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  if (!TOKEN.test(token)) return { error: "This invitation link is incomplete.", success: "" };
  if (name.length < 2 || name.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    return { error: "Enter your name and the email address the invitation was sent to.", success: "" };
  if (password.length < 12 || password.length > 256) return { error: "Use a password of at least 12 characters.", success: "" };
  if (password !== form.get("confirm")) return { error: "The passwords do not match.", success: "" };
  let signedIn = false;
  try {
    await rememberInvite(token);
    const client = await supabaseServer();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteOrigin()}/auth/confirm`,
        data: { full_name: name, requested_role: "company" },
      },
    });
    if (error) return { error: "Unable to create the account. If you already have one, sign in instead.", success: "" };
    signedIn = !!data.session;
  } catch {
    return { error: "Account creation is temporarily unavailable. Try again.", success: "" };
  }
  if (signedIn) redirect(joinPath(token));
  return { error: "", success: "Check your email to confirm your address. The confirmation link brings you back here to finish joining." };
}
