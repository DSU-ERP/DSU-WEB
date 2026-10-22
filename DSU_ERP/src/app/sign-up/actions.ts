"use server";
import { supabaseServer } from "@/shared/auth/supabase";
import { siteOrigin } from "@/shared/config/site";
import { redirect } from "next/navigation";
export async function signUp(
  _previous: { error: string; success: string },
  form: FormData,
) {
  const name = String(form.get("name") || "").trim(),
    email = String(form.get("email") || "").trim(),
    password = String(form.get("password") || "");
  if (
    name.length < 2 ||
    name.length > 200 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    password.length < 12 ||
    password.length > 256
  )
    return {
      error:
        "Enter your name, a valid university email and a password of at least 12 characters.",
      success: "",
    };
  if (password !== form.get("confirm"))
    return { error: "The passwords do not match.", success: "" };
  let signedIn = false;
  try {
    const client = await supabaseServer();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: siteOrigin() + "/auth/confirm",
        data: { full_name: name, requested_role: "student" },
      },
    });
    if (error)
      return {
        error:
          "Unable to create an account. Try again or contact your campus administrator.",
        success: "",
      };
    signedIn = !!data.session;
  } catch {
    return {
      error: "Account registration is temporarily unavailable.",
      success: "",
    };
  }
  if (signedIn) redirect("/onboarding");
  return {
    error: "",
    success:
      "Check your email to verify your account, then continue the five-step setup. Once verified, matching university records will be filled in automatically. If you already have an account, sign in instead.",
  };
}
export async function resendConfirmation(
  _previous: { error: string; success: string },
  form: FormData,
) {
  const email = String(form.get("email") || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    return {
      error: "Enter your email to request a confirmation.",
      success: "",
    };
  try {
    const client = await supabaseServer();
    const { error } = await client.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: siteOrigin() + "/auth/confirm" },
    });
    if (error)
      return {
        error: "Unable to resend right now. Wait a moment and try again.",
        success: "",
      };
    return {
      error: "",
      success:
        "If this account needs confirmation, a new link has been sent. Already confirmed? Sign in below.",
    };
  } catch {
    return {
      error: "Email confirmation is temporarily unavailable.",
      success: "",
    };
  }
}
