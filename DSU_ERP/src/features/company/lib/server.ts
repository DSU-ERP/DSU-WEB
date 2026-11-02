import "server-only";
import { cache } from "react";
import { backendApi } from "@/shared/http/backend";
import { CampusError } from "@/shared/http/errors";
import { signInAgain } from "@/shared/auth/session";
import type { Applicants, CompanyDrive, CompanyRequest, CompanySession } from "./types";

// Every read runs as the signed-in member; the backend's company.* functions
// return only this member's own company records.
async function companyGet<T>(path: string): Promise<T> {
  try {
    return (await backendApi<{ data: T }>(path)).data;
  } catch (error) {
    if (error instanceof CampusError && error.status === 401) signInAgain(error);
    throw error;
  }
}
const id = (value: string) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new CampusError(404, "Not found.");
  return value;
};
export const companySession = cache(() => companyGet<CompanySession>("/company/session"));
export const companyRequests = cache(() => companyGet<CompanyRequest[]>("/company/requests"));
export const companyDrives = cache(() => companyGet<CompanyDrive[]>("/company/drives"));
export const companyRequest = (value: string) => companyGet<CompanyRequest>(`/company/requests/${id(value)}`);
export const companyDrive = (value: string) => companyGet<CompanyDrive>(`/company/drives/${id(value)}`);
export const companyApplicants = (value: string) => companyGet<Applicants>(`/company/drives/${id(value)}/applicants`);
