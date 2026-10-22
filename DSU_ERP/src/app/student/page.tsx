import { redirect } from "next/navigation";
import { studentProfile } from "@/features/student/lib/server";
import { CampusError } from "@/shared/http/errors";
export default async function StudentPage() {
  let profile;
  try {
    profile = await studentProfile();
  } catch (error) {
    if (error instanceof CampusError) return null;
    throw error;
  }
  redirect(profile.onboarded ? "/student/dashboard" : "/student/onboarding");
}
