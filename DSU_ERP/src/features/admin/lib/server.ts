import "server-only";
import { cache } from "react";
import { backendApi } from "@/shared/http/backend";
import { CampusError } from "@/shared/http/errors";
import { signInAgain } from "@/shared/auth/session";
import { officerWorkflow } from "./officer-workflow";
import type { Assistant, RunDetail, RunList, Workflow } from "./types";

// Every read is authorized by the backend against the dedicated admin list.
async function adminGet<T>(path: string): Promise<T> {
  try {
    return (await backendApi<{ data: T }>(path)).data;
  } catch (error) {
    if (error instanceof CampusError && error.status === 401) signInAgain(error);
    throw error;
  }
}
export const adminSession = cache(() => adminGet<{ admin: boolean }>("/admin/session"));
export async function agentWorkflows(): Promise<Record<Assistant, Workflow>> {
  const backend = await adminGet<Record<"student" | "company", Workflow>>("/admin/agent-workflows");
  return { student: backend.student, officer: officerWorkflow(), company: backend.company };
}
export function agentRuns(query: Record<string, string | undefined> = {}) {
  const q = new URLSearchParams(Object.entries(query).filter((e): e is [string, string] => !!e[1]));
  return adminGet<RunList>(`/admin/agent-runs${q.size ? `?${q}` : ""}`);
}
export function agentRun(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new CampusError(404, "Not found.");
  return adminGet<RunDetail>(`/admin/agent-runs/${id}`);
}
