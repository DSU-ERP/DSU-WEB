import Link from "next/link";
import { userSession } from "@/shared/auth/session";
import { CampusError } from "@/shared/http/errors";
import { describeFailure } from "@/shared/http/diagnostics";
import { adminSession } from "@/features/admin/lib/server";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { signOut } from "../login/actions";
import "../workspace.css";
import "../placement/placement.css";
import "../placement/company-portal.css";
import "../company/company.css";
import "./admin.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · DSU Agentic ERP", robots: { index: false } };

// Only accounts on the dedicated admin list (ops.admins) may open the portal.
// The backend checks the list again on every trace read.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let email = "Administrator";
  try {
    email = (await userSession()).user.email || email;
    await adminSession();
  } catch (error) {
    if (!(error instanceof CampusError)) throw error;
    if (error.status === 401) {
      return (
        <main className="erp-access-state">
          <p className="erp-eyebrow">ADMIN</p>
          <h1>Sign in to continue.</h1>
          <div className="erp-actions">
            <Link className="erp-primary" href="/login">
              Sign in
            </Link>
          </div>
        </main>
      );
    }
    const failure = describeFailure(error);
    return (
      <main className="erp-access-state">
        <p className="erp-eyebrow">ADMIN</p>
        <h1>{error.status === 403 ? "Admin access is required." : "Unable to load the admin portal."}</h1>
        <p>{error.status === 403 ? "This account is not on the admin list." : failure.message}</p>
        {error.status !== 403 && failure.hint && (
          <p className="erp-dev-hint" role="note">
            <strong>Developer detail:</strong> {failure.hint}
          </p>
        )}
        <div className="erp-actions">
          <Link className="erp-secondary" href="/workspace">
            Go to my workspace
          </Link>
          <form action={signOut}>
            <button className="erp-primary">Sign out</button>
          </form>
        </div>
      </main>
    );
  }
  return <AdminShell member={email}>{children}</AdminShell>;
}
