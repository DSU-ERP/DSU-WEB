import Link from "next/link";
import Image from "next/image";
import { LoginForm } from "./LoginForm";
import { redirect } from "next/navigation";
import { userSession } from "@/shared/auth/session";
import { CampusError } from "@/shared/http/errors";
import { workspaceDestination } from "@/shared/auth/portal";
import "../workspace.css";
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const query = await searchParams;
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
  // Without a portal, /workspace opens the home that the account's role allows.
  if (signedIn) redirect(workspaceDestination(null));
  return (
    <main id="vision" className="erp-login">
      <section className="erp-login-intro">
        <Link href="/" className="erp-login-logo" aria-label="Dayananda Sagar University — home">
          <Image
            src="/assets/college/dsu-official-logo-dark.png"
            alt="Dayananda Sagar University"
            width={2579}
            height={828}
            priority
          />
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
        <p className="erp-eyebrow">SIGN IN</p>
        <h2>Welcome back.</h2>
        <p className="erp-muted">
          Your preparation, placements and campus opportunities in one
          workspace.
        </p>
        {expired && (
          <p className="erp-form-error" role="alert">
            Your session could not be verified. Please sign in again.
          </p>
        )}
        <LoginForm />
        <Link className="erp-back" href="/sign-up">
          New student? Create an account ↗
        </Link>
      </section>
    </main>
  );
}
