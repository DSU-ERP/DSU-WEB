import "server-only";
import { backendApi } from "@/shared/http/backend";
import { CampusError } from "@/shared/http/errors";
import { signInAgain } from "@/shared/auth/session";
import { officerSession } from "./server";
import type { AudienceState, CompanyAccess, DriveRequest, DriveRequestList } from "./company-types";

async function officerGet<T>(path: string): Promise<T> {
  await officerSession();
  try {
    return (await backendApi<{ data: T }>(path)).data;
  } catch (error) {
    if (error instanceof CampusError && error.status === 401) signInAgain(error);
    throw error;
  }
}
const uuid = (value: string) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new CampusError(404, "Not found.");
  return value;
};

export function driveRequests(query: { status?: string; search?: string } = {}) {
  const q = new URLSearchParams(Object.entries(query).filter((e): e is [string, string] => !!e[1]));
  return officerGet<DriveRequestList>(`/placement/company-requests${q.size ? `?${q}` : ""}`);
}
export function driveRequest(id: string) {
  return officerGet<DriveRequest>(`/placement/company-requests/${uuid(id)}`);
}
export function driveAudience(id: string) {
  return officerGet<AudienceState>(`/placement/drives/${uuid(id)}/audience`);
}
export function companyAccess(id: string) {
  return officerGet<CompanyAccess>(`/placement/companies/${uuid(id)}/access`);
}
