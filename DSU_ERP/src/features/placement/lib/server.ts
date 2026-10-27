import "server-only";
import { cache } from "react";
import { backendApi } from "@/shared/http/backend";
import { CampusError } from "@/shared/http/errors";
import { signInAgain, userSession } from "@/shared/auth/session";
import type { Json, OfficerSession, Query } from "./types";
import type {
  CategoriesResponse,
  CategoryId,
  DirectoryQuery,
  DirectoryResponse,
  OverviewCharts,
  StudentIntelligence,
} from "./intelligence";
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

// ---- Student Skills Intelligence (officer reads) ----------------------------
// Each endpoint validates its query strictly, so callers pass only the keys
// documented for it. Path segments are always encoded.
async function officerGet<T>(path: string, query: Record<string, string | undefined> = {}): Promise<T> {
  const q = new URLSearchParams(
    Object.entries(query).filter((e): e is [string, string] => !!e[1]),
  );
  try {
    return (await backendApi<{ data: T }>(path + (q.size ? `?${q}` : ""))).data;
  } catch (error) {
    if (error instanceof CampusError && error.status === 401) signInAgain(error);
    throw error;
  }
}
export const placementCategories = (query: { batch?: string; department?: string }) =>
  officerGet<CategoriesResponse>("/placement/categories", query);
export const placementRankedStudents = (
  category: CategoryId,
  query: DirectoryQuery & { limit?: string; export?: "true" },
) =>
  officerGet<DirectoryResponse>(
    "/placement/categories/" + encodeURIComponent(category) + "/students",
    query,
  );
export const placementOverviewCharts = (query: { batch?: string; department?: string; search?: string }) =>
  officerGet<OverviewCharts>("/placement/overview/charts", query);
export const placementStudentIntelligence = (id: string) =>
  officerGet<StudentIntelligence>(
    "/placement/students/" + encodeURIComponent(id) + "/profile",
    { purpose: "officer" },
  );
