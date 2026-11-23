import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { backendApi } from "@/shared/http/backend";
import { signInAgain } from "@/shared/auth/session";
import { CampusError } from "@/shared/http/errors";

export type WorkspaceRole = "student" | "placement_officer" | "company" | "admin";
export type WorkspaceAccess = {
  role: WorkspaceRole | null;
  home: "/student" | "/student/onboarding" | "/placement" | "/company" | "/admin" | "/access" | "/onboarding";
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


/**
 * Runs the workspace role check and the workspace's own session read in
 * parallel (they are independent backend calls), while keeping the role
 * check's outcome first: a wrong role still redirects home even if the other
 * read failed.
 */
export async function requireWorkspaceWith<T>(role: WorkspaceRole, load: () => Promise<T>): Promise<T> {
  const [access, loaded] = await Promise.allSettled([requireWorkspace(role), load()]);
  if (access.status === "rejected") throw access.reason;
  if (loaded.status === "rejected") throw loaded.reason;
  return loaded.value;
}
