import "server-only";
import { cache } from "react";
import { backendApi } from "@/shared/http/backend";
import { CampusError } from "@/shared/http/errors";
import { signInAgain, userSession } from "@/shared/auth/session";
import type { Json, OfficerSession, Query } from "./types";
export async function placementRead<T>(
  resource: string,
  query: Query = {},
): Promise<T> {
  try {
    return (
      await backendApi<{ data: T }>(
        "/placement/" +
          encodeURIComponent(resource) +
          "?" +
          new URLSearchParams(query),
      )
    ).data;
  } catch (error) {
    if (error instanceof CampusError && error.status === 401)
      signInAgain(error);
    throw error;
  }
}
export const officerSession = cache(async () => {
  try {
    await userSession();
    return await placementRead<OfficerSession>("session");
  } catch (error) {
    if (error instanceof CampusError && error.status === 401)
      signInAgain(error);
    throw error;
  }
});
export async function placementMutate<T>(
  action: string,
  payload: Record<string, Json>,
  requestId: string,
): Promise<T> {
  await officerSession();
  return (
    await backendApi<{ data: T }>(
      "/placement/actions/" + encodeURIComponent(action),
      { method: "POST", body: JSON.stringify({ payload, requestId }) },
    )
  ).data;
}

export async function placementImportHistory<T>(): Promise<T> {
  await officerSession();
  return (await backendApi<{ data: T }>("/imports")).data;
}
export async function renameFridayConversation(
  id: string,
  title: string,
): Promise<import("./types").Row> {
  await officerSession();
  return (
    await backendApi<{ data: import("./types").Row }>(
      "/placement/friday/rename",
      { method: "POST", body: JSON.stringify({ id, title }) },
    )
  ).data;
}
