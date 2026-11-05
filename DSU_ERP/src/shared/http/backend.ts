import "server-only";
import { userSession } from "@/shared/auth/session";
import { backendOrigin } from "@/shared/config/env";
import { CampusError, readCampusResponse } from "./errors";

export async function backendApi<T>(
  path: string,
  options: {
    method?: "GET" | "POST"; body?: string; contentType?: string; timeoutMs?: number;
    // A session the caller already verified in this request. Route handlers
    // pass it so several backend calls verify the user only once.
    session?: { token: string };
  } = {},
): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//")) throw new CampusError(400, "Invalid resource.");
  const { token } = options.session ?? (await userSession());
  let origin: URL;
  try { origin = backendOrigin(); }
  catch { throw new CampusError(503, "Campus services have not been configured correctly.", "BACKEND_NOT_CONFIGURED"); }
  const method = options.method || "GET";
  // A sleeping hosted backend takes about 40s to wake. Reads keep retrying
  // within this window; writes are never repeated.
  const deadline = Date.now() + (Number(process.env.DSU_BACKEND_WAKE_MS) || 60000);
  const send = async (): Promise<Response> => {
    try {
      return await fetch(new URL(`/api/v1${path}`, origin), {
        method, body: options.body,
        headers: { Authorization: `Bearer ${token}`, ...(options.body ? { "Content-Type": options.contentType || "application/json" } : {}) },
        cache: "no-store", redirect: "error",
        signal: AbortSignal.timeout(options.timeoutMs ?? (method === "POST" ? 45000 : 20000)),
      });
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
      if (process.env.NODE_ENV === "development") {
        const cause = error instanceof Error ? error.cause as { code?: string } | undefined : undefined;
        console.warn("Campus backend transport failed", { method, timedOut, code: cause?.code });
      }
      if (method === "GET" && Date.now() + 2000 < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return send();
      }
      throw new CampusError(503, "Campus services are temporarily unavailable. Please try again.", timedOut ? "BACKEND_TIMEOUT" : "BACKEND_UNREACHABLE");
    }
  };
  let response = await send();
  // While a hosted backend wakes up or redeploys, its proxy answers with an
  // HTML holding page that never reached the API. Reads are retried with
  // growing pauses until the wake window closes.
  for (let pause = 1500; !isJson(response) && method === "GET" && Date.now() + pause < deadline; pause = Math.min(pause * 2, 8000)) {
    logNonJson(path, response, false);
    await response.body?.cancel().catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, pause));
    response = await send();
  }
  if (!isJson(response)) logNonJson(path, response, method === "GET");
  return readCampusResponse<T>(response);
}

function isJson(response: Response) {
  const type = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  return type === "application/json" || !!type?.endsWith("+json");
}
// Status and content type only: the body, query string and record ids are never logged.
function logNonJson(path: string, response: Response, retried: boolean) {
  console.warn("Campus backend returned a non-JSON response", {
    route: path.split("?")[0].replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id"), status: response.status, contentType: response.headers.get("content-type") || "none", retried,
  });
}
