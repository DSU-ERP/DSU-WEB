import { redirect } from "next/navigation";
import { studentProfile } from "@/features/student/lib/server";
import { skillsGateRedirect } from "@/features/student/lib/skills";
import { CampusError } from "@/shared/http/errors";
export default async function StudentPage() {
  let profile;
  try {
    profile = await studentProfile();
  } catch (error) {
    if (error instanceof CampusError) return null;
    throw error;
  }
  // One ordering for every entry point (skillsGateRedirect): registration at
  // /onboarding, then skills onboarding, then the dashboard.
  redirect(
    skillsGateRedirect(
      { role: "student", onboardingRequired: profile.skillsOnboardingRequired, registered: profile.onboarded },
      [],
    ) ?? "/student/dashboard",
  );
}
