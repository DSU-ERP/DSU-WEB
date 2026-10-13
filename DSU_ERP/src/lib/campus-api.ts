import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";
import { CampusError, readCampusResponse } from "./campus-response";
import { readSupabasePortal } from "./supabase/portal-read";
export { CampusError } from "./campus-response";
export const campusSession = cache(async () => {
  const client = await supabaseServer();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) redirect("/login");
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) redirect("/login");
  return { user, token: session.access_token };
});
export async function campusApi<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: string } = {},
): Promise<T> {
  const { token } = await campusSession();
  // All portal reads go directly to Supabase. Render is used only for CSV ingestion.
  if (!options.method || options.method === "GET") {
    try {
      return await readSupabasePortal<T>(path);
    } catch (error) {
      if (error instanceof CampusError && error.status === 401) redirect("/login");
      throw error;
    }
  }
  const origin = process.env.DSU_BACKEND_URL;
  if (!origin)
    throw new CampusError(503, "Campus services have not been configured.");
  let base: URL;
  try {
    base = new URL(origin);
    if (
      !["http:", "https:"].includes(base.protocol) ||
      base.username || base.password || base.pathname !== "/" || base.search || base.hash
    ) throw new Error("Invalid backend origin");
  } catch {
    throw new CampusError(503, "Campus services have not been configured correctly.");
  }
  if (process.env.NODE_ENV === "production" && base.protocol !== "https:")
    throw new CampusError(503, "Campus services require a secure connection.");
  let response: Response;
  try {
    response = await fetch(new URL(`/api/v1${path}`, base), {
      method: options.method || "GET",
      body: options.body,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "text/csv" } : {}),
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(options.method === "POST" ? 45000 : 15000),
    });
  } catch {
    throw new CampusError(
      503,
      "Campus services are temporarily unavailable. Please try again.",
    );
  }
  if (response.status === 401) redirect("/login");
  return readCampusResponse<T>(response);
}
export type Membership = {
  id: string;
  role: "admin" | "staff" | "student";
  studentId: string | null;
};
export const membership = cache(
  async () => (await campusApi<{ data: Membership }>("/me")).data,
);
