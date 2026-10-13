import "server-only";
import { supabaseServer } from "./server";
import { CampusError } from "../campus-response";
import { portalRequest, exportCsv, supabaseReadError } from "./portal-contract";

/** Uses the signed-in user's JWT, never a service-role key or database password. */
export async function readSupabasePortal<T>(path: string): Promise<T> {
  const request = portalRequest(path);
  const client = await supabaseServer();
  const rpc =
    request.request_path === "/batches" ||
    request.request_path.startsWith("/batches/")
      ? "dsu_batch_read"
      : "dsu_portal_read";
  const { data, error } = await client
    .rpc(rpc, request)
    .abortSignal(AbortSignal.timeout(15000));
  if (error) {
    const failure = supabaseReadError(error.code);
    throw new CampusError(failure.status, failure.message);
  }
  if (!data || typeof data !== "object" || !("data" in data))
    throw new CampusError(502, "Supabase returned an incomplete response.");
  return (
    request.request_path.startsWith("/student-categories/") &&
    request.request_path.endsWith("/export")
      ? exportCsv(data)
      : data
  ) as T;
}
