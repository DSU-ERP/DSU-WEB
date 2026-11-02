import Link from "next/link";
import { AuthShell } from "../login/AuthShell";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import "../workspace.css";

export const metadata = { title: "Reset your password · DSU" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <Link href="/login" className="erp-back">
        ← Back to sign in
      </Link>
      <p className="erp-eyebrow">FORGOT PASSWORD</p>
      <h2>Reset your password.</h2>
      <p className="erp-muted">Enter the email you sign in with. We will email you a link to choose a new password.</p>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
