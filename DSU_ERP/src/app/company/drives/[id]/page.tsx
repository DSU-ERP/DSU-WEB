import Link from "next/link";
import { notFound } from "next/navigation";
import { CampusError } from "@/shared/http/errors";
import { companyApplicants, companyDrive } from "@/features/company/lib/server";
import { DRIVE_STATUS } from "@/features/company/lib/types";
import { EMPLOYMENT_LABEL, STATUS_LABEL, WORK_MODE_LABEL } from "@/features/placement/lib/company-types";
import { ApplicantsPanel } from "@/features/company/components/Applicants";
import { RequestChangeButton } from "@/features/company/components/RequestActions";
import { FileButton } from "@/shared/files/FileButton";

const day = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "long", year: "numeric" }) : null;

export default async function CompanyDrivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let drive, applicants;
  try {
    [drive, applicants] = await Promise.all([companyDrive(id), companyApplicants(id)]);
  } catch (error) {
    if (error instanceof CampusError && error.status === 404) notFound();
    throw error;
  }
  const facts: [string, string | null][] = [
    ["Employment type", drive.employmentType ? EMPLOYMENT_LABEL[drive.employmentType] || drive.employmentType : null],
    ["Openings", drive.openings ? String(drive.openings) : null],
    ["Total CTC", `${drive.packageLpa} LPA`],
    ["Fixed and variable", drive.ctcFixedLpa !== null || drive.ctcVariableLpa !== null ? `${drive.ctcFixedLpa ?? "Not given"} LPA fixed, ${drive.ctcVariableLpa ?? "not given"} LPA variable` : null],
    ["Stipend", drive.stipendMonthly !== null ? `₹${Number(drive.stipendMonthly).toLocaleString("en-IN")} per month${drive.internshipMonths ? ` for ${drive.internshipMonths} months` : ""}` : null],
    ["Work mode", drive.workMode ? WORK_MODE_LABEL[drive.workMode] || drive.workMode : null],
    ["Location", drive.location],
    ["Joining", day(drive.joiningDate)],
    ["Service agreement", drive.bondMonths === null ? drive.bondDetails : drive.bondMonths === 0 ? "No bond" : `${drive.bondMonths} months${drive.bondDetails ? `. ${drive.bondDetails}` : ""}`],
    ["Applications close", day(drive.registrationDeadline)],
    ["Drive date", day(drive.driveDate)],
    ["Selection rounds", drive.rounds.join(" → ")],
  ];
  return (
    <>
      <Link className="erp-back" href="/company/drives">
        ← Drives
      </Link>
      <h1>{drive.title}</h1>
      <p className="erp-muted">
        <span className={`cp-status cp-status-${drive.status === "cancelled" ? "rejected" : "live"}`}>{DRIVE_STATUS[drive.status]}</span>
        {drive.openChange && ` · Change request ${STATUS_LABEL[drive.openChange.status].toLowerCase()}`}
      </p>
      <div className="cp-decisions" style={{ marginTop: 0, marginBottom: "1.5rem" }}>
        {drive.status !== "completed" && drive.status !== "cancelled" && <RequestChangeButton driveId={drive.id} openChange={drive.openChange} />}
        {drive.jdFile && <FileButton id={drive.jdFile.id} label="Job description PDF" />}
      </div>
      <ApplicantsPanel driveId={drive.id} data={applicants} title={drive.title} />
      <section className="erp-panel">
        <h2>Drive details</h2>
        <dl className="po-facts">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || <span className="erp-muted">Not given</span>}</dd>
            </div>
          ))}
        </dl>
        {drive.description && (
          <>
            <h3 className="co-subhead">Job description</h3>
            <p className="cp-preserve cp-description">{drive.description}</p>
          </>
        )}
      </section>
    </>
  );
}
