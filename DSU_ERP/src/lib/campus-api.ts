import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";

export class CampusError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
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
  const origin = process.env.DSU_BACKEND_URL;
  if (!origin)
    throw new CampusError(503, "Campus services have not been configured.");
  const base = new URL(origin);
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
      signal: AbortSignal.timeout(options.method === "POST" ? 45000 : 15000),
    });
  } catch {
    throw new CampusError(
      503,
      "Campus services are temporarily unavailable. Please try again.",
    );
  }
  if (response.status === 401) redirect("/login");
  const payload = await response.json();
  if (!response.ok)
    throw new CampusError(
      response.status,
      payload.error?.message || "Unable to load campus information.",
    );
  return payload as T;
}
export type Membership = {
  id: string;
  role: "admin" | "staff" | "student";
  studentId: string | null;
};
export const membership = cache(
  async () => (await campusApi<{ data: Membership }>("/me")).data,
);
