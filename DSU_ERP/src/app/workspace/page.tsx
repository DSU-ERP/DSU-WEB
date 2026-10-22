import Link from "next/link";
import { redirect } from "next/navigation";
import { workspaceAccess } from "@/shared/auth/workspace";
import { CampusError } from "@/shared/http/errors";
import { describeFailure, type Failure } from "@/shared/http/diagnostics";
import { signOut } from "../login/actions";
import { selectedPortal } from "@/shared/auth/portal";
import "../workspace.css";

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ portal?: string }>;
}) {
  const portal = selectedPortal((await searchParams).portal);
  let access,
    failure: Failure | null = null;
  try {
    access = await workspaceAccess();
  } catch (error) {
    if (!(error instanceof CampusError)) throw error;
    failure = describeFailure(error);
  }
  const mismatch =
    access &&
    portal &&
    (portal === "student"
      ? access.role === "placement_officer" || access.home === "/access"
      : access.role !== "placement_officer");
  if (access && !mismatch && access.home !== "/access") redirect(access.home);
  return (
    <main className="erp-access-state">
      <p className="erp-eyebrow">DSU WORKSPACE</p>
      <h1>
        {failure
          ? "Unable to open your workspace."
          : mismatch
            ? `This account does not have ${portal === "student" ? "student" : "placement officer"} access.`
            : "Your account needs a workspace assignment."}
      </h1>
      <p>
        {failure
          ? failure.message
          : mismatch
            ? "Use the account assigned to this role, or open the workspace available to your current account."
            : "You are signed in, but this account has no active student or placement officer access. Ask your campus administrator to connect your account to your existing university record."}
      </p>
      {failure?.hint && (
        <p className="erp-dev-hint" role="note">
          <strong>Developer detail:</strong> {failure.hint}
        </p>
      )}
      <div className="erp-actions">
        <Link
          className="erp-secondary"
          href={
            mismatch && access
              ? access.home
              : portal
                ? `/workspace?portal=${portal}`
                : "/workspace"
          }
        >
          {mismatch
            ? access?.home === "/onboarding"
              ? "Set up student account"
              : "Open my workspace"
            : "Try again"}
        </Link>
        <form action={signOut}>
          <button className="erp-primary">Sign out</button>
        </form>
      </div>
    </main>
  );
}
