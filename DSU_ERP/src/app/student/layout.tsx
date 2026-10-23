import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { studentProfile } from "@/features/student/lib/server";
import { PATHNAME_HEADER, skillsGateRedirect, studentSegments } from "@/features/student/lib/skills";
import { StudentShell } from "@/features/student/components/StudentShell";
import { workspaceAccess } from "@/shared/auth/workspace";
import { CampusError } from "@/shared/http/errors";
import { describeFailure } from "@/shared/http/diagnostics";
import { signOut } from "../login/actions";
import { Suspense } from "react";
import Loading from "./loading";
import "../workspace.css";
import "./student.css";
import "./workspace-polish.css";
import "./interview/interview-workspace.css";
import "./skills.css";
export const dynamic = "force-dynamic";

/**
 * Skills onboarding gate for the requested page, decided before anything in
 * this segment renders. The proxy puts the pathname in a request header
 * because layouts do not receive it. Redirecting here, outside any Suspense
 * boundary, makes a full page load answer with a redirect and no page body,
 * so gated content is never streamed. Route handlers (/student/api and the
 * GitHub callback) do not use this layout. Failures are left to the
 * authenticated layout below, which explains them.
 */
async function gateTarget(): Promise<string | null> {
  const segments = studentSegments((await headers()).get(PATHNAME_HEADER));
  if (!segments) return null;
  try {
    return skillsGateRedirect(await workspaceAccess(), segments);
  } catch {
    return null;
  }
}

export default async function StudentLayout(props: { children: React.ReactNode; gate: React.ReactNode }) {
  const { children, gate } = props;
  const target = await gateTarget();
  if (target) redirect(target);
  // Layouts do not re-render on client navigation, so the parallel slot
  // (src/app/student/@gate) applies the same gate on every navigation.
  // The segment loading.tsx wraps pages, not this authenticated layout. Stream
  // its fallback as soon as the gate allows the page instead of holding the
  // entire screen for profile and workspace reads. Private content still waits
  // for the access checks.
  return <Suspense fallback={<Loading />}>{gate}<AuthenticatedStudentLayout>{children}</AuthenticatedStudentLayout></Suspense>;
}

async function AuthenticatedStudentLayout({ children }: { children: React.ReactNode }) {
  let profile;
  try {
    profile = await studentProfile();
  } catch (error) {
    if (!(error instanceof CampusError)) throw error;
    const failure = describeFailure(error);
    return (
      <main id="vision" className="erp-access-state">
        <p className="erp-eyebrow">STUDENT ACCESS</p>
        <h1>
          {error.status === 403
            ? "Student access is unavailable for this account."
            : "Unable to load your workspace."}
        </h1>
        <p>{error.status === 403 ? error.message : failure.message}</p>
        {error.status !== 403 && failure.hint && (
          <p className="erp-dev-hint" role="note">
            <strong>Developer detail:</strong> {failure.hint}
          </p>
        )}
        <div className="erp-actions">
          {/* A full page load re-runs this layout; client navigation would not. */}
          <a className="erp-secondary" href="/student">
            Try again
          </a>
          <form action={signOut}>
            <button className="erp-primary">Sign out</button>
          </form>
        </div>
      </main>
    );
  }
  return (
    <StudentShell
      name={profile.details.fullName || profile.official.full_name}
      usn={profile.official.enrollment_no}
      // While skills onboarding is required only the onboarding flow is
      // reachable, so the shell shows no workspace navigation.
      mode={profile.skillsOnboardingRequired ? "onboarding" : "full"}
    >
      {children}
    </StudentShell>
  );
}
