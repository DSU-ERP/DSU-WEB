import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { backendApi } from "@/shared/http/backend";
import { signInAgain } from "@/shared/auth/session";
import { CampusError } from "@/shared/http/errors";

export type WorkspaceRole = "student" | "placement_officer";
export type WorkspaceAccess = {
  role: WorkspaceRole | null;
  home: "/student" | "/student/onboarding" | "/placement" | "/access" | "/onboarding";
  // Students only: skills onboarding (docs/STUDENT-INTELLIGENCE.md section 4)
  // must be completed before the rest of the student workspace. Older backends
  // omit it, which means nothing is required.
  onboardingRequired?: boolean;
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

