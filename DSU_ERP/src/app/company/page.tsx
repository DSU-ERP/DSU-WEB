import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import { companyDrives, companyRequests, companySession } from "@/features/company/lib/server";
import { initialNotifications } from "@/shared/notifications/server";
import { NotificationsPanel } from "@/shared/notifications/Notifications";
import { STATUS_LABEL } from "@/features/placement/lib/company-types";
import { DRIVE_STATUS } from "@/features/company/lib/types";

export default async function CompanyDashboard() {
  const [session, requests, drives, notices] = await Promise.all([companySession(), companyRequests(), companyDrives(), initialNotifications()]);
  const count = (status: string) => requests.filter((r) => r.status === status).length;
  const open = requests.filter((r) => ["draft", "submitted", "returned"].includes(r.status));
  const live = drives.filter((d) => d.status === "upcoming" || d.status === "ongoing");
  const firstName = session.member?.name?.split(" ")[0];
  return (
    <>
      <p className="erp-eyebrow">{session.company.name}</p>
      <div className="co-section-head" style={{ marginTop: 0 }}>
        <h1 style={{ margin: 0 }}>{firstName ? `Welcome, ${firstName}.` : "Your campus hiring."}</h1>
        <Link className="erp-primary" href="/company/requests/new">
          <FilePlus2 size={15} aria-hidden="true" />
          &nbsp;Submit a drive
        </Link>
      </div>
      <p className="erp-muted cp-lede">
        Send the details of a campus drive to the DSU placement office. They review it, decide which students receive it and share
        applicants with you when they are ready.
      </p>
      <div className="co-stats">
        <Link href="/company/drives">
          <span>Live drives</span>
          <strong>{live.length}</strong>
        </Link>
        <Link href="/company/drives#submissions">
          <span>With the placement office</span>
          <strong>{count("submitted")}</strong>
        </Link>
        <Link href="/company/drives#submissions">
          <span>Returned for changes</span>
          <strong>{count("returned")}</strong>
        </Link>
        <Link href="/company/drives#submissions">
          <span>Drafts</span>
          <strong>{count("draft")}</strong>
        </Link>
      </div>
      <div className="co-dashboard">
        <div>
          {open.length > 0 && (
            <section className="erp-panel">
              <h2>Needs your attention</h2>
              <ul className="cp-request-list">
                {open.slice(0, 6).map((request) => (
                  <li key={request.id}>
                    <Link href={`/company/requests/${request.id}`}>
                      <div>
                        <strong>
                          {request.kind === "change" ? "Changes to: " : ""}
                          {request.title || "Untitled drive"}
                        </strong>
                        <span className="erp-muted">
                          {request.status === "returned"
                            ? request.review_comment || "The placement office asked for changes."
                            : request.status === "submitted"
                              ? "Waiting for the placement office to review."
                              : "Draft. Submit it when the details are complete."}
                        </span>
                      </div>
                      <div className="cp-request-meta">
                        <span className={`cp-status cp-status-${request.status}`}>{STATUS_LABEL[request.status]}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="erp-panel">
            <h2>Your drives</h2>
            {drives.length ? (
              <ul className="cp-request-list">
                {drives.slice(0, 6).map((drive) => (
                  <li key={drive.id}>
                    <Link href={`/company/drives/${drive.id}`}>
                      <div>
                        <strong>{drive.title}</strong>
                        <span className="erp-muted">
                          {[
                            `${drive.packageLpa} LPA`,
                            drive.registrationDeadline ? `Applications close ${drive.registrationDeadline}` : null,
                            drive.released ? `${drive.applicants} applicant${drive.applicants === 1 ? "" : "s"} shared` : "Applicants not shared yet",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                      <div className="cp-request-meta">
                        <span className={`cp-status cp-status-${drive.status === "cancelled" ? "rejected" : "live"}`}>{DRIVE_STATUS[drive.status]}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <p className="erp-muted">No live drives yet. This is how a drive goes live:</p>
                <ol className="co-steps">
                  <li>
                    <strong>Submit the drive.</strong> Upload your job description PDF to fill the form, check the details and send it.
                  </li>
                  <li>
                    <strong>The placement office reviews it.</strong> They approve it, ask for changes or explain why it cannot go ahead.
                  </li>
                  <li>
                    <strong>Students apply.</strong> Only the students the placement office selects see the drive and can apply.
                  </li>
                  <li>
                    <strong>You see applicants.</strong> Once the office releases them, you can view profiles and resumes and record round
                    results.
                  </li>
                </ol>
              </>
            )}
          </section>
        </div>
        <NotificationsPanel initial={notices} empty="You are all caught up. Review decisions and released applicants will appear here." />
      </div>
    </>
  );
}
