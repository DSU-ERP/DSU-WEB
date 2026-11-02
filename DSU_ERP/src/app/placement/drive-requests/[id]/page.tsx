import Link from "next/link";
import { notFound } from "next/navigation";
import { CampusError } from "@/shared/http/errors";
import { driveRequest } from "@/features/placement/lib/company";
import { STATUS_LABEL } from "@/features/placement/lib/company-types";
import { RequestSummary } from "@/features/placement/components/RequestSummary";
import { RequestReview } from "@/features/placement/components/CompanyRequests";

export default async function DriveRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let request;
  try {
    request = await driveRequest(id);
  } catch (error) {
    if (error instanceof CampusError && error.status === 404) notFound();
    throw error;
  }
  const when = (value: string | null) =>
    value ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "";
  return (
    <>
      <Link className="erp-back" href="/placement/drive-requests">
        ← Drive requests
      </Link>
      <p className="erp-eyebrow">{request.company.name}</p>
      <h1>
        {request.kind === "change" ? "Changes to: " : ""}
        {request.title || "Untitled drive"}
      </h1>
      <p className="erp-muted">
        <span className={`cp-status cp-status-${request.status}`}>{STATUS_LABEL[request.status]}</span>
        {request.submitted_at && ` · Submitted ${when(request.submitted_at)}`}
        {request.submittedBy && ` by ${request.submittedBy.name || request.submittedBy.email}`}
        {request.drive && (
          <>
            {" · "}
            <Link href={`/placement/drives/${request.drive.id}`}>Open the live drive</Link>
          </>
        )}
      </p>
      {request.review_comment && request.status !== "submitted" && (
        <p className="cp-note">
          <strong>Your comment:</strong> {request.review_comment}
        </p>
      )}
      <div className="cp-review-grid">
        <section className="erp-panel" aria-labelledby="cp-request-details">
          <h2 id="cp-request-details">{request.kind === "change" ? "Requested changes" : "Drive details"}</h2>
          {request.kind === "change" && <p className="erp-muted">Changed fields show the live value underneath.</p>}
          <RequestSummary request={request} live={request.kind === "change" ? request.live : null} jdFile={request.jd_file} />
        </section>
        <aside className="erp-panel cp-company-card" aria-labelledby="cp-company-title">
          <h2 id="cp-company-title">{request.company.name}</h2>
          {request.company.about && <p className="cp-preserve erp-muted">{request.company.about}</p>}
          <dl className="po-facts">
            <div>
              <dt>Industry</dt>
              <dd>{request.company.industry || "Not recorded"}</dd>
            </div>
            <div>
              <dt>Headquarters</dt>
              <dd>{request.company.headquarters || "Not recorded"}</dd>
            </div>
            <div>
              <dt>Website</dt>
              <dd>
                {request.company.website ? (
                  <a href={request.company.website} target="_blank" rel="noopener noreferrer">
                    {request.company.website.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  "Not recorded"
                )}
              </dd>
            </div>
          </dl>
          <Link className="erp-secondary" href={`/placement/companies/${request.company.id}`}>
            Company record
          </Link>
        </aside>
      </div>
      <RequestReview request={request} />
    </>
  );
}
