import { redirect } from "next/navigation";
import Link from "next/link";
import { competencyTestingEnabled } from "@/features/competency/testing-config";
import { backendApi } from "@/shared/http/backend";
import { CampusError } from "@/shared/http/errors";
import { describeFailure } from "@/shared/http/diagnostics";
import { skillsProfile } from "@/features/student/lib/server";
import { initialNotifications } from "@/shared/notifications/server";
import {
  Dashboard,
  type DashboardData,
} from "@/features/student/components/Dashboard";
export default async function Page() {
  // Both reads travel together; the skills profile is optional for the page.
  const [dashboard, skills, notices] = await Promise.allSettled([
    backendApi<{ data: DashboardData }>("/student/dashboard"),
    skillsProfile(),
    initialNotifications(),
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
    <>
    <Dashboard
      data={dashboard.value.data}
      skills={skills.status === "fulfilled" ? skills.value : null}
      skillsError={skillsError}
      notices={notices.status === "fulfilled" ? notices.value : null}
    />
    {competencyTestingEnabled() && (
      <section className="st-panel">
        <h2>Career intelligence</h2>
        <p>Explore your competency evidence and role requirements, separately from academic grades.</p>
        <Link href="/student/career-intelligence">View evidence and career paths</Link>
      </section>
    )}
    </>
  );
}
