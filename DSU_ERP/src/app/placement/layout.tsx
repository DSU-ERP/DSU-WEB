import Link from "next/link";
import { competencyTestingEnabled } from "@/features/competency/server";
import { officerSession } from "@/features/placement/lib/server";
import { requireWorkspace } from "@/shared/auth/workspace";
import { CampusError } from "@/shared/http/errors";
import { describeFailure } from "@/shared/http/diagnostics";
import { Workspace } from "@/features/placement/components/Workspace";
import { signOut } from "../login/actions";
import "../workspace.css";
import "./placement.css";
import "./overview.css";
import "./ranking.css";
import "./company-portal.css";
import "@/shared/notifications/notifications.css";
export const dynamic = "force-dynamic";
export default async function PlacementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireWorkspace("placement_officer");
    await officerSession();
  } catch (error) {
    if (!(error instanceof CampusError)) throw error;
    const failure = describeFailure(error);
    return (
      <main className="erp-access-state">
        <p className="erp-eyebrow">PLACEMENT OFFICER ACCESS</p>
        <h1>
          {error.status === 403
            ? "Officer access is required."
            : "Unable to load placements."}
        </h1>
        <p>{error.status === 403 ? error.message : failure.message}</p>
        {error.status !== 403 && failure.hint && (
          <p className="erp-dev-hint" role="note">
            <strong>Developer detail:</strong> {failure.hint}
          </p>
        )}
        <div className="erp-actions">
          <a className="erp-secondary" href="/placement">
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
  return <Workspace competencyTesting={competencyTestingEnabled()}>{children}</Workspace>;
}
