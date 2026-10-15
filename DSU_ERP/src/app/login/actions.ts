"use server";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
export async function signIn(_previous: { error: string }, form: FormData) {
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    password.length < 1 ||
    password.length > 256
  )
    return { error: "Enter a valid email address and password." };
  try {
    const client = await supabaseServer();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error)
      return {
        error:
          "Unable to sign in. Check your details or contact your campus administrator.",
      };
  } catch {
    return { error: "Sign in is temporarily unavailable. Please try again." };
  }
  redirect("/placement");
}
export async function signOut() {
  const client = await supabaseServer();
  await client.auth.signOut();
  redirect("/login");
}
