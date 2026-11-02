import { FileButton } from "@/shared/files/FileButton";
import { EMPLOYMENT_LABEL, WORK_MODE_LABEL, type RequestFields } from "@/features/placement/lib/company-types";

const money = (value: number | null | undefined, unit: string) =>
  value === null || value === undefined ? null : `${Number(value).toLocaleString("en-IN")} ${unit}`;

/** Every field of a drive request, with the live value beside it for a change request. */
export function RequestSummary({
  request,
  live,
  jdFile,
}: {
  request: RequestFields;
  live?: Record<string, unknown> | null;
  jdFile?: { id: string; filename: string } | null;
}) {
  const c = request.criteria || {};
  const rows: [string, keyof RequestFields | null, string | null][] = [
    ["Role", "title", request.title],
    ["Employment type", "employment_type", request.employment_type ? EMPLOYMENT_LABEL[request.employment_type] || request.employment_type : null],
    ["Job category", "job_category", request.job_category],
    ["Openings", "openings", request.openings === null ? null : String(request.openings)],
    ["Total CTC", "package_lpa", money(request.package_lpa, "LPA")],
    ["Fixed pay", "ctc_fixed_lpa", money(request.ctc_fixed_lpa, "LPA")],
    ["Variable pay", "ctc_variable_lpa", money(request.ctc_variable_lpa, "LPA")],
    ["Stipend", "stipend_monthly", request.stipend_monthly === null ? null : `₹${Number(request.stipend_monthly).toLocaleString("en-IN")} per month`],
    ["Internship length", "internship_months", request.internship_months === null ? null : `${request.internship_months} months`],
    ["Work mode", "work_mode", request.work_mode ? WORK_MODE_LABEL[request.work_mode] || request.work_mode : null],
    ["Location", "location", request.location],
    ["Joining", "joining_date", request.joining_date],
    [
      "Service agreement",
      "bond_months",
      request.bond_months === null ? request.bond_details : request.bond_months === 0 ? "No bond" : `${request.bond_months} months${request.bond_details ? `. ${request.bond_details}` : ""}`,
    ],
    ["Registration deadline", "registration_deadline", request.registration_deadline],
    ["Drive date", "drive_date", request.drive_date],
    ["Selection rounds", "rounds", request.rounds.length ? request.rounds.join(" → ") : null],
    ["Skills", "skills", request.skills || null],
    ["Documents to bring", "required_documents", request.required_documents || null],
  ];
  const changed = (key: keyof RequestFields | null) => {
    if (!live || !key) return false;
    const before = live[key];
    const after = request[key];
    return JSON.stringify(before ?? null) !== JSON.stringify(after === "" ? null : after ?? null) && !(before === "" && !after);
  };
  return (
    <>
      <dl className="po-facts cp-summary">
        {rows.map(([label, key, value]) => (
          <div key={label} data-changed={changed(key) || undefined}>
            <dt>{label}</dt>
            <dd>
              {value || <span className="erp-muted">Not given</span>}
              {changed(key) && (
                <small className="cp-was">
                  Live drive: {Array.isArray(live![key!]) ? (live![key!] as string[]).join(" → ") : String(live![key!] ?? "not set")}
                </small>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <h3>Who the company wants</h3>
      <dl className="po-facts">
        <div>
          <dt>Graduating batches</dt>
          <dd>{c.batches?.length ? c.batches.join(", ") : <span className="erp-muted">Not given</span>}</dd>
        </div>
        <div>
          <dt>Branches</dt>
          <dd>{c.branches?.length ? c.branches.join(", ") : "Any branch"}</dd>
        </div>
        <div>
          <dt>Minimum CGPA</dt>
          <dd>{c.min_cgpa ?? "No minimum"}</dd>
        </div>
        <div>
          <dt>Current backlogs allowed</dt>
          <dd>{c.max_backlogs ?? "Not stated"}</dd>
        </div>
        <div>
          <dt>Minimum attendance</dt>
          <dd>{c.min_attendance === undefined ? "Not stated" : `${c.min_attendance}%`}</dd>
        </div>
        <div>
          <dt>Other expectations</dt>
          <dd className="cp-preserve">{c.notes || "None"}</dd>
        </div>
      </dl>
      <h3>Job description</h3>
      {request.description ? <p className="cp-preserve cp-description">{request.description}</p> : <p className="erp-muted">No written description.</p>}
      {jdFile && <FileButton id={jdFile.id} label={`Open ${jdFile.filename}`} />}
    </>
  );
}
