import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { CampusError } from "@/lib/campus-response";
import type { Json, OfficerSession, Query, Row } from "./types";

function failure(error: { code?: string; message?: string }): never {
  const code = error.code ?? "";
  const status: Record<string, number> = {
    PT400: 400,
    PT401: 401,
    PT403: 403,
    PT404: 404,
    PT409: 409,
    PT413: 413,
    PT429: 429,
  };
  if (code === "PGRST202")
    throw new CampusError(
      503,
      "The Placement Officer database update has not been installed yet.",
    );
  if (code in status)
    throw new CampusError(
      status[code],
      error.message || "The request could not be completed.",
    );
  throw new CampusError(
    503,
    "Placement services are temporarily unavailable. Please try again.",
  );
}
export async function placementRead<T>(
  resource: string,
  query: Query = {},
): Promise<T> {
  const client = await supabaseServer();
  const { data, error } = await client
    .rpc("dsu_placement_read", { resource, query })
    .abortSignal(AbortSignal.timeout(20000));
  if (error) failure(error);
  if (!data || !("data" in data))
    throw new CampusError(502, "The placement response is incomplete.");
  return data.data as T;
}
export const officerSession = cache(async () => {
  const client = await supabaseServer();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) redirect("/login?portal=placement-officer");
  return placementRead<OfficerSession>("session");
});
export async function placementImportHistory<T>(): Promise<T> {
  await officerSession();
  const client = await supabaseServer();
  const { data, error } = await client
    .rpc("dsu_placement_imports")
    .abortSignal(AbortSignal.timeout(15000));
  if (error) failure(error);
  if (!data || !Array.isArray(data.data))
    throw new CampusError(502, "The import history response is incomplete.");
  return data.data as T;
}
export async function placementMutate<T>(
  action: string,
  payload: Record<string, Json>,
  requestId: string,
): Promise<T> {
  await officerSession();
  const client = await supabaseServer();
  const { data, error } = await client
    .rpc("dsu_placement_mutate", { action, payload, request_id: requestId })
    .abortSignal(AbortSignal.timeout(25000));
  if (error) failure(error);
  if (!data || !("data" in data))
    throw new CampusError(502, "The placement response is incomplete.");
  return data.data as T;
}

export async function renameFridayConversation(id: string, title: string): Promise<Row> {
  await officerSession();
  const client = await supabaseServer();
  const { data, error } = await client.rpc("dsu_friday_rename", {
    conversation_id: id, new_title: title,
  }).abortSignal(AbortSignal.timeout(15000));
  if (error) failure(error);
  if (!data?.data) throw new CampusError(502, "The rename response is incomplete.");
  return data.data as Row;
}
