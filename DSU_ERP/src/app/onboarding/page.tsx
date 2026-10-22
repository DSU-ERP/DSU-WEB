import Link from "next/link";
import { redirect } from "next/navigation";
import { backendApi } from "@/shared/http/backend";
import { CampusError } from "@/shared/http/errors";
import { describeFailure, type Failure } from "@/shared/http/diagnostics";
import { RegistrationWizard } from "@/features/student/components/RegistrationWizard";
import type { RegistrationState } from "@/features/student/lib/registration-types";
import { signOut } from "../login/actions";
import "../student/student.css";
export const dynamic = "force-dynamic";
export default async function Page() {
  let initial: RegistrationState | undefined, failure: Failure | undefined;
  try {
    initial = (await backendApi<{ data: RegistrationState }>("/onboarding"))
      .data;
  } catch (error) {
    if (error instanceof CampusError && error.status === 401)
      redirect("/sign-up");
    if (!(error instanceof CampusError)) throw error;
    failure = describeFailure(error);
  }
  if (initial?.state === "officer") redirect("/placement");
  if (initial?.state === "restricted") redirect("/access");
  if (initial?.profile?.onboarded) redirect("/student/dashboard");
  return (
    <main className="st-app st-registration">
      <header>
        <Link className="st-brand" href="/">
          DSU <small>/ YOUR WORKSPACE</small>
        </Link>
        <form action={signOut}>
          <button className="st-button st-button-secondary">Sign out</button>
        </form>
      </header>
      {!initial ? (
        <section className="st-panel">
          <h1>Unable to load student setup.</h1>
          <p>
            {failure?.message ||
              "Campus services may be unavailable or the student database update is pending."}
          </p>
          {failure?.hint && (
            <p className="st-muted" role="note">
              <strong>Developer detail:</strong> {failure.hint}
            </p>
          )}
          <Link className="st-button" href="/onboarding">
            Try again
          </Link>
        </section>
      ) : initial.state === "verify_email" ? (
        <section className="st-panel">
          <h1>Verify your email to continue.</h1>
          <p>
            Open the confirmation sent to {initial.email}, then return here.
            Your university details are only shown after verification.
          </p>
          <Link className="st-button" href="/onboarding">
            I’ve verified my email
          </Link>
        </section>
      ) : (
        <RegistrationWizard initial={initial} />
      )}
    </main>
  );
}
