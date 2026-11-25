import Link from "next/link";
import { label, text, type Row } from "../lib/types";

const blank = (value: unknown) => value === null || value === undefined || value === "";
const list = (value: unknown) =>
  Array.isArray(value) ? value.map(String).filter(Boolean) : [];
/** Skills and documents are stored as free text; split on commas, semicolons or new lines. */
const items = (value: unknown) =>
  typeof value === "string" ? value.split(/[\n,;]+/).map((v) => v.trim()).filter(Boolean) : list(value);
const employment = (value: unknown) =>
  value === "internship-ppo" ? "Internship + PPO" : blank(value) ? "—" : label(String(value));
const safeUrl = (value: unknown) =>
  typeof value === "string" && /^https?:\/\//i.test(value) ? value : null;

/**
 * Everything recorded about a drive's role, read-only, so an officer opening
 * it from a company sees the complete picture without opening the editor.
 */
export function DriveDetails({ drive, company }: { drive: Row; company: unknown }) {
  const rounds = list(drive.rounds);
  const branches = list(drive.branches);
  const skills = items(drive.skills);
  const documents = items(drive.required_documents);
  const pdf = safeUrl(drive.original_pdf_url);
  const description = typeof drive.description === "string" ? drive.description.trim() : "";

  const role: [string, React.ReactNode][] = [
    [
      "Company",
      blank(drive.company_id) ? text(company) : (
        <Link href={`/placement/companies/${drive.company_id}`}>{text(company)}</Link>
      ),
    ],
    ["Role", text(drive.title)],
    ["Job category", text(drive.job_category)],
    ["Employment type", employment(drive.employment_type)],
    ["Package", blank(drive.package_lpa) ? "—" : `${text(drive.package_lpa)} LPA`],
    ["Package category", blank(drive.category) ? "—" : label(String(drive.category))],
    ["Openings", blank(drive.openings) ? "Not recorded" : text(drive.openings)],
    ["Location", text(drive.location)],
  ];
  const schedule: [string, React.ReactNode][] = [
    ["Passing-out batch", text(drive.batch)],
    ["Academic year", text(drive.academic_year)],
    ["Drive date", text(drive.drive_date)],
    ["Registration deadline", text(drive.registration_deadline)],
    ["Status", blank(drive.status) ? "—" : label(String(drive.status))],
    ["Visible to students", drive.published ? "Published" : "Not published"],
  ];
  const eligibility: [string, React.ReactNode][] = [
    ["Minimum CGPA", text(drive.min_cgpa)],
    ["Maximum current backlogs", text(drive.max_backlogs)],
    ["Minimum attendance", blank(drive.min_attendance) ? "No limit" : `${text(drive.min_attendance)}%`],
    ["Branches", branches.length ? branches.join(", ") : "All branches"],
  ];

  return (
    <section className="erp-panel po-drive-details" aria-labelledby="drive-details-heading">
      <h2 id="drive-details-heading">Role details</h2>
      <div className="po-drive-details-grid">
        <Facts title="The role" rows={role} />
        <Facts title="Schedule" rows={schedule} />
        <Facts title="Eligibility" rows={eligibility} />
      </div>

      <div className="po-drive-details-block">
        <h3>Job description</h3>
        {description ? <p className="po-drive-description">{description}</p> : <p className="erp-muted">No description recorded.</p>}
      </div>

      <div className="po-drive-details-grid">
        <div className="po-drive-details-block">
          <h3>Selection rounds</h3>
          {rounds.length ? (
            <ol className="po-drive-rounds">{rounds.map((r, i) => <li key={`${i}-${r}`}>{r}</li>)}</ol>
          ) : <p className="erp-muted">No rounds recorded.</p>}
        </div>
        <div className="po-drive-details-block">
          <h3>Required skills</h3>
          {skills.length ? (
            <ul className="po-drive-tags">{skills.map((s) => <li key={s}>{s}</li>)}</ul>
          ) : <p className="erp-muted">None recorded.</p>}
        </div>
        <div className="po-drive-details-block">
          <h3>Required documents</h3>
          {documents.length ? (
            <ul className="po-drive-list">{documents.map((d) => <li key={d}>{d}</li>)}</ul>
          ) : <p className="erp-muted">None recorded.</p>}
          {pdf && <p className="po-drive-pdf"><a href={pdf} target="_blank" rel="noopener noreferrer">Original drive PDF ↗</a></p>}
        </div>
      </div>
    </section>
  );
}

function Facts({ title, rows }: { title: string; rows: [string, React.ReactNode][] }) {
  return (
    <div className="po-drive-details-block">
      <h3>{title}</h3>
      <dl className="po-facts">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
