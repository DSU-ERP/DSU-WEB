import { redirect } from "next/navigation";
import { backendApi } from "@/shared/http/backend";
import { CampusError } from "@/shared/http/errors";
import { describeFailure } from "@/shared/http/diagnostics";
import { skillsProfile } from "@/features/student/lib/server";
import {
  Dashboard,
  type DashboardData,
} from "@/features/student/components/Dashboard";
export default async function Page() {
  // Both reads travel together; the skills profile is optional for the page.
  const [dashboard, skills] = await Promise.allSettled([
    backendApi<{ data: DashboardData }>("/student/dashboard"),
    skillsProfile(),
  ]);
  if (dashboard.status === "rejected") {
    const error = dashboard.reason;
    // Skills onboarding comes first; the backend enforces it too.
    if (error instanceof CampusError && error.code === "ONBOARDING_REQUIRED") redirect("/student/onboarding");
    throw error;
  }
  const skillsError =
    skills.status === "rejected"
      ? skills.reason instanceof CampusError
        ? describeFailure(skills.reason).message
        : "Your skills profile is unavailable right now."
      : undefined;
  return (
    <Dashboard
      data={dashboard.value.data}
      skills={skills.status === "fulfilled" ? skills.value : null}
      skillsError={skillsError}
    />
  );
}
