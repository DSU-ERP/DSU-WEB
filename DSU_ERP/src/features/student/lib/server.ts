import "server-only";
import { cache } from "react";
import { backendApi } from "@/shared/http/backend";
import { signInAgain } from "@/shared/auth/session";
import { CampusError } from "@/shared/http/errors";
import type { ProfileState } from "./types";
import { requireWorkspace } from "@/shared/auth/workspace";
import type { SkillsProfile } from "./skills";

export type StudentRecord = {
  id: string;
  enrollment_no: string;
  full_name: string;
  course_name: string | null;
  department_name: string | null;
  current_semester: string | null;
  source_batch: string;
  academic: Record<string, string | number | null> | null;
};
export const studentRecord = cache(async () => {
  try {
    return (await backendApi<{ data: StudentRecord }>("/student/me")).data;
  } catch (error) {
    if (error instanceof CampusError && error.status === 401)
      signInAgain(error);
    throw error;
  }
});
export const studentProfile = cache(async () => {
  try {
    // Independent authenticated reads can travel together. Access failures
    // still take precedence, so role redirects happen before any data renders.
    const [access, profile] = await Promise.allSettled([
      requireWorkspace("student"),
      backendApi<{ data: ProfileState }>("/student/profile"),
    ]);
    if (access.status === "rejected") throw access.reason;
    if (profile.status === "rejected") throw profile.reason;
    // /session decides whether skills onboarding still blocks the workspace.
    return {
      ...profile.value.data,
      skillsOnboardingRequired: access.value.onboardingRequired === true,
    };
  } catch (error) {
    if (error instanceof CampusError && error.status === 401)
      signInAgain(error);
    throw error;
  }
});

/** The canonical skills profile (GET /student/skills/profile), once per request. */
export const skillsProfile = cache(async () => {
  try {
    return (await backendApi<{ data: SkillsProfile }>("/student/skills/profile")).data;
  } catch (error) {
    if (error instanceof CampusError && error.status === 401)
      signInAgain(error);
    throw error;
  }
});
