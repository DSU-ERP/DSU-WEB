import Link from "next/link";
import { membership, CampusError } from "@/lib/campus-api";
import { signOut } from "../login/actions";
import "./portal.css";
export const dynamic = "force-dynamic";
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let access;
  try {
    access = await membership();
  } catch (error) {
    if (!(error instanceof CampusError)) throw error;
    return (
      <main id="vision" className="erp-access-state">
        <p className="erp-eyebrow">DSU / CAMPUS ACCESS</p>
        <h1>
          {error.status === 403
            ? "Your access is being prepared."
            : "We couldn’t connect."}
        </h1>
        <p>
          {error.status === 403
            ? "You are signed in. Your administrator needs to link your account before you can view university records."
            : error.message}
        </p>
        <div className="erp-actions">
          <Link href="/portal" className="erp-primary">
            Try again
          </Link>
          <form action={signOut}>
            <button className="erp-secondary">Sign out</button>
          </form>
        </div>
      </main>
    );
  }
  return (
    <div className="erp-shell">
      <aside className="erp-sidebar">
        <Link className="erp-wordmark" href="/">
          DSU <span>/ CAMPUS</span>
        </Link>
        <p className="erp-eyebrow">WORKSPACE</p>
        <nav aria-label="Campus navigation">
          <Link href="/portal">Overview</Link>
          {access.role !== "student" && (
            <Link href="/portal/students">Student directory</Link>
          )}
          {access.role === "admin" && (
            <Link href="/portal/imports">Data imports</Link>
          )}
        </nav>
        <div className="erp-sidebar-bottom">
          <span className="erp-role">{access.role}</span>
          <form action={signOut}>
            <button className="erp-secondary">Sign out ↗</button>
          </form>
        </div>
      </aside>
      <div className="erp-workspace">
        <header className="erp-topbar">
          <span>DAYANANDA SAGAR UNIVERSITY</span>
          <span className="erp-status">
            <i />
            Secure campus workspace
          </span>
        </header>
        <main id="vision" className="erp-main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
