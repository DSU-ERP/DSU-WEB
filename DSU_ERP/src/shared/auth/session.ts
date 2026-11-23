import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { CampusError } from "@/shared/http/errors";
import { supabaseServer } from "./supabase";

// Verifies the access token locally against the project's cached signing keys
// (ES256 JWKS) instead of a network call to Supabase Auth on every request.
// getClaims() refreshes an expired session through getSession() first, and
// falls back to Supabase's /user endpoint only for symmetric (HS*) tokens.
export const userSession = cache(async () => {
  const client = await supabaseServer();
  const { data, error } = await client.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) throw new CampusError(401, "Sign in to continue.");
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) throw new CampusError(401, "Sign in to continue.");
  return {
    user: { id: claims.sub, email: typeof claims.email === "string" ? claims.email : undefined },
    token: session.access_token,
  };
});

// Not signed in: go to /login. If the backend rejected a session that Supabase
// still accepts (expired JWT, clock skew, project mismatch), the flag stops
// /login from bouncing straight back to /workspace, which would loop forever.
export function signInAgain(error?: unknown): never {
  const rejectedByBackend =
    error instanceof CampusError && error.code === "UNAUTHENTICATED";
  redirect(rejectedByBackend ? "/login?expired=1" : "/login");
}
