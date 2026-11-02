"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/auth/supabase";

export type NewPasswordState = { error: string };

/** Sets a new password for the account signed in by the reset link, then opens the workspace. */
export async function updatePassword(_previous: NewPasswordState, form: FormData): Promise<NewPasswordState> {
  const password = String(form.get("password") || "");
  if (password.length < 12 || password.length > 256) return { error: "Use a password of at least 12 characters." };
  if (password !== form.get("confirm")) return { error: "The passwords do not match." };
  try {
    const client = await supabaseServer();
    const { error } = await client.auth.updateUser({ password });
    if (error)
      return {
        error: /session/i.test(error.message || "")
          ? "This reset link has expired or was opened in a different browser. Request a new link."
          : "The password could not be changed. Choose a different password and try again.",
      };
    (await cookies()).delete("dsu-password-reset");
  } catch {
    return { error: "Password reset is temporarily unavailable. Please try again." };
  }
  redirect("/workspace");
}
