import Link from "next/link";
import { requireWorkspace } from "@/shared/auth/workspace";
import { CampusError } from "@/shared/http/errors";
import { describeFailure } from "@/shared/http/diagnostics";
import { companySession } from "@/features/company/lib/server";
import { CompanyShell } from "@/features/company/components/CompanyShell";
import { signOut } from "../login/actions";
import "../workspace.css";
import "../placement/placement.css";
import "../placement/company-portal.css";
import "@/shared/notifications/notifications.css";
import "./company.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Company portal · DSU Placements" };

export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
  let session;
  try {
    await requireWorkspace("company");
    session = await companySession();
  } catch (error) {
    if (!(error instanceof CampusError)) throw error;
    const failure = describeFailure(error);
    return (
      <main className="erp-access-state">
        <p className="erp-eyebrow">COMPANY PORTAL</p>
        <h1>{error.status === 403 ? "Company portal access is required." : "Unable to load the company portal."}</h1>
        <p>
          {error.status === 403
            ? "This account is not linked to a recruiting company. Open the invitation link the placement office sent you, or ask them for a new one."
            : failure.message}
        </p>
        {error.status !== 403 && failure.hint && (
          <p className="erp-dev-hint" role="note">
            <strong>Developer detail:</strong> {failure.hint}
          </p>
        )}
        <div className="erp-actions">
          <a className="erp-secondary" href="/company">
            Try again
          </a>
          <Link className="erp-secondary" href="/">
            Back to campus
          </Link>
          <form action={signOut}>
            <button className="erp-primary">Sign out</button>
          </form>
        </div>
      </main>
    );
  }
  return (
    <CompanyShell company={session.company.name} member={session.member?.name || session.member?.email || "Company member"}>
      {children}
    </CompanyShell>
  );
}
