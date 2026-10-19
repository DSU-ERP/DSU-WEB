import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { backendApi } from "@/shared/http/backend";
import { signInAgain } from "@/shared/auth/session";
import { CampusError } from "@/shared/http/errors";

export type WorkspaceRole = "student" | "placement_officer";
export type WorkspaceAccess = {
  role: WorkspaceRole | null;
  home: "/student" | "/placement" | "/access" | "/onboarding";
};
export const workspaceAccess = cache(async () => {
  try {
    return (await backendApi<{ data: WorkspaceAccess }>("/session")).data;
  } catch (error) {
    if (error instanceof CampusError && error.status === 401)
      signInAgain(error);
    throw error;
  }
});
export async function requireWorkspace(role: WorkspaceRole) {
  const access = await workspaceAccess();
  if (access.role !== role) redirect(access.home);
  return access;
}
