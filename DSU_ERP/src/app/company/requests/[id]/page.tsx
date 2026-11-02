import Link from "next/link";
import { notFound } from "next/navigation";
import { CampusError } from "@/shared/http/errors";
import { companyRequest } from "@/features/company/lib/server";
import { STATUS_LABEL } from "@/features/placement/lib/company-types";
import { RequestForm } from "@/features/company/components/RequestForm";
import { RequestActions } from "@/features/company/components/RequestActions";
import { RequestSummary } from "@/features/placement/components/RequestSummary";

export default async function CompanyRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { id } = await params;
  const { submitted } = await searchParams;
  let request;
  try {
    request = await companyRequest(id);
  } catch (error) {
    if (error instanceof CampusError && error.status === 404) notFound();
    throw error;
  }
  const editable = request.status === "draft" || request.status === "returned";
  const when = (value: string | null) =>
    value ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "";
  return (
    <>
      <Link className="erp-back" href="/company/drives">
        ← Drives
      </Link>
      <h1>
        {request.kind === "change" ? "Changes to: " : ""}
        {request.title || "Untitled drive"}
      </h1>
      <p className="erp-muted">
        <span className={`cp-status cp-status-${request.status}`}>{STATUS_LABEL[request.status]}</span>
        {request.submitted_at && request.status === "submitted" && ` · Submitted ${when(request.submitted_at)}`}
        {request.reviewed_at && request.status !== "submitted" && ` · Reviewed ${when(request.reviewed_at)}`}
        {request.drive && (
          <>
            {" · "}
            <Link href={`/company/drives/${request.drive.id}`}>Open the live drive</Link>
          </>
        )}
      </p>
      {submitted && request.status === "submitted" && (
        <p className="cp-note" role="status">
          Submitted. The placement office has been notified and will review it. You will get a notification when they decide.
        </p>
      )}
      {request.review_comment && (request.status === "returned" || request.status === "rejected" || request.status === "approved") && (
        <p className="cp-note">
          <strong>{request.status === "approved" ? "Note from the placement office:" : "The placement office says:"}</strong> {request.review_comment}
        </p>
      )}
      <RequestActions id={request.id} status={request.status} />
      {editable ? (
        <RequestForm request={request} driveTitle={request.kind === "change" ? request.drive?.title : undefined} />
      ) : (
        <section className="erp-panel">
          <h2>{request.kind === "change" ? "Requested changes" : "Drive details"}</h2>
          {request.status === "submitted" && <p className="erp-muted">This request is with the placement office. Withdraw it if you need to edit.</p>}
          {request.status === "rejected" && <p className="erp-muted">This request is closed. You can submit a new drive at any time.</p>}
          <RequestSummary request={request} jdFile={request.jd_file} />
        </section>
      )}
    </>
  );
}
