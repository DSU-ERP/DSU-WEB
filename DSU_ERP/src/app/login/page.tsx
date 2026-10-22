import Link from "next/link";
import { LoginForm } from "./LoginForm";
import { redirect } from "next/navigation";
import { userSession } from "@/shared/auth/session";
import { CampusError } from "@/shared/http/errors";
import { selectedPortal, workspaceDestination } from "@/shared/auth/portal";
import "../workspace.css";
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ portal?: string; expired?: string }>;
}) {
  const query = await searchParams;
  const portal = selectedPortal(query.portal) || "student";
  // After the backend rejected the session, show the form instead of
  // redirecting back to /workspace (which would loop).
  const expired = query.expired === "1";
  let signedIn = false;
  if (!expired) {
    try {
      await userSession();
      signedIn = true;
    } catch (error) {
      if (!(error instanceof CampusError && error.status === 401)) throw error;
    }
  }
  if (signedIn) redirect(workspaceDestination(portal));
  return (
    <main id="vision" className="erp-login">
      <section className="erp-login-intro">
        <Link href="/" className="erp-wordmark">
          DSU <span>/ AGENTIC ERP</span>
        </Link>
        <div>
          <p className="erp-eyebrow">YOUR CONNECTED CAMPUS</p>
          <h1>
            One place.
            <br />
            Every possibility.
          </h1>
          <p>
            Your academic life, connected.
            <br />
            Secure access for the university community.
          </p>
        </div>
        <span className="erp-small">DAYANANDA SAGAR UNIVERSITY</span>
      </section>
      <section className="erp-login-form">
        <Link href="/" className="erp-back">
          ← Back to campus
        </Link>
        <nav className="erp-portal-options" aria-label="Choose sign-in portal">
          <Link
            href="/login?portal=student"
            aria-current={portal === "student" ? "page" : undefined}
          >
            Student
          </Link>
          <Link
            href="/login?portal=placement-officer"
            aria-current={portal === "placement-officer" ? "page" : undefined}
          >
            Placement Officer
          </Link>
        </nav>
        <p className="erp-eyebrow">
          {portal === "student"
            ? "STUDENT SIGN IN"
            : "PLACEMENT OFFICER SIGN IN"}
        </p>
        <h2>Welcome back.</h2>
        <p className="erp-muted">
          {portal === "student"
            ? "Your preparation, academic progress and opportunities in one workspace."
            : "Manage student records, placement drives and campus opportunities."}
        </p>
        {expired && (
          <p className="erp-form-error" role="alert">
            Your session could not be verified. Please sign in again.
          </p>
        )}
        <LoginForm portal={portal} />
        {portal === "student" && (
          <Link className="erp-back" href="/sign-up">
            Create a student account ↗
          </Link>
        )}
      </section>
    </main>
  );
}
