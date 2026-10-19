import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { CampusError } from "@/shared/http/errors";
import { supabaseServer } from "./supabase";

export const userSession = cache(async () => {
  const client = await supabaseServer();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) throw new CampusError(401, "Sign in to continue.");
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) throw new CampusError(401, "Sign in to continue.");
  return { user, token: session.access_token };
});

// Not signed in: go to /login. If the backend rejected a session that Supabase
// still accepts (expired JWT, clock skew, project mismatch), the flag stops
// /login from bouncing straight back to /workspace, which would loop forever.
export function signInAgain(error?: unknown): never {
  const rejectedByBackend =
    error instanceof CampusError && error.code === "UNAUTHENTICATED";
  redirect(rejectedByBackend ? "/login?expired=1" : "/login");
}
