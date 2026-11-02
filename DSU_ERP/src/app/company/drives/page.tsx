import Link from "next/link";
import { companyDrives, companyRequests } from "@/features/company/lib/server";
import { EMPLOYMENT_LABEL, STATUS_LABEL } from "@/features/placement/lib/company-types";
import { DRIVE_STATUS } from "@/features/company/lib/types";

const day = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" }) : null;

export default async function CompanyDrivesPage() {
  const [drives, requests] = await Promise.all([companyDrives(), companyRequests()]);
  const submissions = requests.filter((r) => r.status !== "approved");
  return (
    <>
      <h1>Drives</h1>
      <p className="erp-muted cp-lede">Live drives the placement office approved, and the drive details you have submitted or are still drafting.</p>
      <div className="co-section-head">
        <h2>Live drives</h2>
        <span className="erp-muted">{drives.length}</span>
      </div>
      {drives.length ? (
        <ul className="cp-request-list">
          {drives.map((drive) => (
            <li key={drive.id}>
              <Link href={`/company/drives/${drive.id}`}>
                <div>
                  <strong>{drive.title}</strong>
                  <span className="erp-muted">
                    {[
                      drive.employmentType ? EMPLOYMENT_LABEL[drive.employmentType] || drive.employmentType : null,
                      `${drive.packageLpa} LPA`,
                      drive.driveDate ? `Drive on ${day(drive.driveDate)}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <span className="erp-muted">
                    {drive.released
                      ? `${drive.applicants} applicant${drive.applicants === 1 ? "" : "s"} shared · ${drive.selected} selected`
                      : "The placement office has not shared applicants yet"}
                    {drive.openChange ? ` · Change request: ${STATUS_LABEL[drive.openChange.status].toLowerCase()}` : ""}
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
        <p className="erp-muted">No live drives yet. A drive appears here once the placement office approves it.</p>
      )}
      <div className="co-section-head" id="submissions">
        <h2>Submissions and drafts</h2>
        <Link className="erp-secondary" href="/company/requests/new">
          Submit a drive
        </Link>
      </div>
      {submissions.length ? (
        <ul className="cp-request-list">
          {submissions.map((request) => (
            <li key={request.id}>
              <Link href={`/company/requests/${request.id}`}>
                <div>
                  <strong>
                    {request.kind === "change" ? "Changes to: " : ""}
                    {request.title || "Untitled drive"}
                  </strong>
                  <span className="erp-muted">
                    {request.status === "submitted"
                      ? `Submitted ${day(request.submitted_at)}`
                      : request.status === "returned" || request.status === "rejected"
                        ? request.review_comment || "See the placement office's comment."
                        : `Last saved ${day(request.updated_at)}`}
                  </span>
                </div>
                <div className="cp-request-meta">
                  <span className={`cp-status cp-status-${request.status}`}>{STATUS_LABEL[request.status]}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="erp-muted">Nothing in progress.</p>
      )}
    </>
  );
}
