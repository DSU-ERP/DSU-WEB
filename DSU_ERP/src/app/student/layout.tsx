import { studentProfile } from "@/features/student/lib/server";
import { StudentShell } from "@/features/student/components/StudentShell";
import { CampusError } from "@/shared/http/errors";
import { describeFailure } from "@/shared/http/diagnostics";
import { signOut } from "../login/actions";
import { Suspense } from "react";
import Loading from "./loading";
import "../workspace.css";
import "./student.css";
import "./workspace-polish.css";
import "./interview/interview-workspace.css";
export const dynamic = "force-dynamic";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The segment loading.tsx wraps pages, not this authenticated layout. Stream
  // its fallback immediately instead of holding the entire screen for profile
  // and workspace reads. Private content still waits for the access checks.
  return <Suspense fallback={<Loading />}><AuthenticatedStudentLayout>{children}</AuthenticatedStudentLayout></Suspense>;
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
    >
      {children}
    </StudentShell>
  );
}
