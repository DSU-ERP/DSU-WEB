import Link from "next/link";
import { userSession } from "@/shared/auth/session";
import { CampusError } from "@/shared/http/errors";
import { AuthShell } from "../login/AuthShell";
import { ResetPasswordForm } from "./ResetPasswordForm";
import "../workspace.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Choose a new password · DSU", referrer: "no-referrer" };

// The reset email's link signs the account in through /auth/confirm, which
// sends it here. Without that session there is nothing to change.
export default async function ResetPasswordPage() {
  let email: string | null = null;
  try {
    email = (await userSession()).user.email ?? null;
  } catch (error) {
    if (!(error instanceof CampusError && error.status === 401)) throw error;
  }
  return (
    <AuthShell>
      <Link href="/login" className="erp-back">
        ← Back to sign in
      </Link>
      <p className="erp-eyebrow">NEW PASSWORD</p>
      {email ? (
        <>
          <h2>Choose a new password.</h2>
          <p className="erp-muted">
            For <strong>{email}</strong>. You stay signed in and go to your workspace after saving.
          </p>
          <ResetPasswordForm />
        </>
      ) : (
        <>
          <h2>This link has expired.</h2>
          <p className="erp-muted">
            Reset links work once, for about an hour, and only in the browser where you asked for them. Request a new link to continue.
          </p>
          <div className="erp-form">
            <Link className="erp-primary" href="/forgot-password">
              Request a new link
            </Link>
          </div>
        </>
      )}
    </AuthShell>
  );
}
