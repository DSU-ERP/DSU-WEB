import Link from "next/link";
import { driveRequests } from "@/features/placement/lib/company";
import { EMPLOYMENT_LABEL, STATUS_LABEL, type RequestStatus } from "@/features/placement/lib/company-types";

const TABS: [RequestStatus, string][] = [
  ["submitted", "Awaiting review"],
  ["returned", "Returned"],
  ["approved", "Approved"],
  ["rejected", "Not approved"],
];
const date = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" }) : "";

export default async function DriveRequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const status = TABS.some(([key]) => key === raw.status) ? (raw.status as RequestStatus) : "submitted";
  const search = typeof raw.search === "string" ? raw.search.slice(0, 100) : "";
  const data = await driveRequests({ status, search });
  return (
    <>
      <p className="erp-eyebrow">COMPANY PORTAL</p>
      <h1>Drive requests</h1>
      <div className="co-section-head" style={{ marginTop: 0 }}>
        <p className="erp-muted cp-lede" style={{ margin: 0 }}>
          Drives that recruiting companies submit through the company portal. Nothing reaches students until you approve it and choose who
          receives it.
        </p>
        <Link className="erp-secondary" href="/placement/companies">
          Invite a company
        </Link>
      </div>
      <nav className="cp-tabs" aria-label="Request status">
        {TABS.map(([key, label]) => (
          <Link key={key} href={`/placement/drive-requests?status=${key}`} aria-current={key === status ? "page" : undefined}>
            {label}
            <span>{data.counts[key as keyof typeof data.counts] ?? 0}</span>
          </Link>
        ))}
      </nav>
      <form className="cp-search cp-search-wide" role="search">
        <input type="hidden" name="status" value={status} />
        <input name="search" defaultValue={search} placeholder="Search company or role" aria-label="Search requests" maxLength={100} />
        <button className="erp-secondary">Search</button>
      </form>
      {data.rows.length ? (
        <ul className="cp-request-list">
          {data.rows.map((row) => (
            <li key={row.id}>
              <Link href={`/placement/drive-requests/${row.id}`}>
                <div>
                  <span className="cp-request-company">{row.company}</span>
                  <strong>
                    {row.kind === "change" ? "Changes to: " : ""}
                    {row.title || "Untitled drive"}
                  </strong>
                  <span className="erp-muted">
                    {[
                      row.employmentType ? EMPLOYMENT_LABEL[row.employmentType] || row.employmentType : null,
                      row.packageLpa !== null ? `${row.packageLpa} LPA` : null,
                      row.openings ? `${row.openings} openings` : null,
                      row.batches?.length ? `Batch ${row.batches.join(", ")}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                <div className="cp-request-meta">
                  <span className={`cp-status cp-status-${row.status}`}>{STATUS_LABEL[row.status]}</span>
                  <small className="erp-muted">{row.status === "submitted" ? `Submitted ${date(row.submittedAt)}` : `Reviewed ${date(row.reviewedAt)}`}</small>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <section className="erp-panel">
          <h2>{status === "submitted" ? "Nothing waiting for review." : "No requests here."}</h2>
          <p className="erp-muted">
            {status === "submitted" ? (
              <>
                When a company submits a drive, it appears here and you get a notification. To invite a company, open it in{" "}
                <Link href="/placement/companies">Company management</Link> and use <strong>Company portal access</strong> to create an
                invitation link for their HR contact.
              </>
            ) : search
                ? "No request matches this search."
                : "Requests move here once they are reviewed."}
          </p>
        </section>
      )}
    </>
  );
}
