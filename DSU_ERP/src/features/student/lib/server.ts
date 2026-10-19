import "server-only";
import { cache } from "react";
import { backendApi } from "@/shared/http/backend";
import { signInAgain } from "@/shared/auth/session";
import { CampusError } from "@/shared/http/errors";
import type { ProfileState } from "./types";
import { requireWorkspace } from "@/shared/auth/workspace";

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
    await requireWorkspace("student");
    return (await backendApi<{ data: ProfileState }>("/student/profile")).data;
  } catch (error) {
    if (error instanceof CampusError && error.status === 401)
      signInAgain(error);
    throw error;
  }
});
