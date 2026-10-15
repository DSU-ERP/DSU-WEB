import Link from "next/link";
import { officerSession } from "@/lib/placement/server";
import { CampusError } from "@/lib/campus-response";
import { Workspace } from "@/components/placement/Workspace";
import { signOut } from "../login/actions";
import "../workspace.css";
import "./placement.css";
export const dynamic = "force-dynamic";
export default async function PlacementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await officerSession();
  } catch (error) {
    if (!(error instanceof CampusError)) throw error;
    return (
      <main className="erp-access-state">
        <p className="erp-eyebrow">PLACEMENT OFFICER ACCESS</p>
        <h1>
          {error.status === 403
            ? "Officer access is required."
            : "Unable to load placements."}
        </h1>
        <p>{error.message}</p>
        <div className="erp-actions">
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
  return <Workspace>{children}</Workspace>;
}
