import "server-only";
import { userSession } from "@/shared/auth/session";
import { backendOrigin } from "@/shared/config/env";
import { CampusError, readCampusResponse } from "./errors";

export async function backendApi<T>(path: string, options: { method?: "GET" | "POST"; body?: string; contentType?: string; timeoutMs?: number } = {}): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//")) throw new CampusError(400, "Invalid resource.");
  const { token } = await userSession();
  let origin: URL;
  try { origin = backendOrigin(); }
  catch { throw new CampusError(503, "Campus services have not been configured correctly.", "BACKEND_NOT_CONFIGURED"); }
  let response: Response;
  try {
    response = await fetch(new URL(`/api/v1${path}`, origin), {
      method: options.method || "GET", body: options.body,
      headers: { Authorization: `Bearer ${token}`, ...(options.body ? { "Content-Type": options.contentType || "application/json" } : {}) },
      cache: "no-store", redirect: "error",
      signal: AbortSignal.timeout(options.timeoutMs ?? (options.method === "POST" ? 45000 : 20000)),
    });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    if (process.env.NODE_ENV === "development") {
      const cause = error instanceof Error ? error.cause as { code?: string } | undefined : undefined;
      console.warn("Campus backend transport failed", { method: options.method || "GET", timedOut, code: cause?.code });
    }
    throw new CampusError(503, "Campus services are temporarily unavailable. Please try again.", timedOut ? "BACKEND_TIMEOUT" : "BACKEND_UNREACHABLE");
  }
  return readCampusResponse<T>(response);
}
