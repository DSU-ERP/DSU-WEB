"use client";
import { useRef, useState } from "react";
import { FileText, TriangleAlert } from "lucide-react";
import { ChangeForm } from "./Controls";
import { EMPLOYMENT_TYPES, JOB_CATEGORIES, label, type Row } from "../lib/types";
import {
  COMPANY_FIELD_LABELS,
  DRIVE_DEFAULT_LABELS,
  driveDefaultsFromImport,
  readDriveDefaults,
  type CompanyImportFields,
  type DriveDefaults,
  type DriveImportResult,
} from "../lib/driveImport";

const LIMIT = 10 * 1024 * 1024;
const FIELDS: [keyof CompanyImportFields, string, number][] = [
  ["name", "text", 200],
  ["short_name", "text", 50],
  ["industry", "text", 100],
  ["headquarters", "text", 200],
  ["website", "url", 200],
  ["hr_name", "text", 200],
  ["hr_email", "email", 200],
  ["hr_phone", "tel", 40],
];
type Values = Record<string, string | string[]>;

function companyValues(company: Row): Values {
  const values: Values = {};
  for (const [field] of FIELDS) values[field] = String(company[field] ?? "");
  values.hiring_roles = String(company.hiring_roles ?? "");
  values.about = String(company.about ?? "");
  values.job_categories = Array.isArray(company.job_categories) ? company.job_categories.map(String) : [];
  return values;
}

/**
 * The company editor. A recruiter PDF fills the company details and the role
 * it is hiring for (the company's default drive details). Nothing is saved
 * until the officer reviews the form and presses Save.
 */
export function CompanyEditorForm({
  company,
  newRecord,
  departments,
}: {
  company: Row;
  newRecord: boolean;
  departments: string[];
}) {
  const [values, setValues] = useState<Values>(() => companyValues(company));
  const [defaults, setDefaults] = useState<DriveDefaults>(() => readDriveDefaults(company.drive_defaults));
  const [version, setVersion] = useState(0);
  const [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<DriveImportResult | null>(null),
    [filled, setFilled] = useState<string[] | null>(null);
  // Set when the officer edits the form, so the PDF never silently replaces their work.
  const edited = useRef(false);

  const read = async () => {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) || !file.size || file.size > LIMIT) {
      setError("Choose a PDF of 10 MB or less.");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    setFilled(null);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
        reader.onerror = () => reject(new Error("This file could not be read."));
        reader.readAsDataURL(file);
      });
      const response = await fetch("/placement/company-import-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, data }),
        cache: "no-store",
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.data)
        throw new Error(body?.error || "The PDF could not be read. Fill in the form manually.");
      setResult(body.data as DriveImportResult);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // What the PDF found: company details (falling back to the role's company
  // name for older backends) and the role's default drive details.
  const found = (() => {
    if (!result) return null;
    const pdfCompany: Partial<CompanyImportFields> = result.company ?? { name: result.fields.company_name };
    const companyFound = (Object.keys(COMPANY_FIELD_LABELS) as (keyof CompanyImportFields)[]).filter((k) => {
      const v = pdfCompany[k];
      return Array.isArray(v) ? v.length > 0 : !!v;
    });
    const role = driveDefaultsFromImport(result.fields);
    return { pdfCompany, companyFound, role, roleFound: Object.keys(role) as (keyof DriveDefaults)[] };
  })();

  const apply = () => {
    if (!found) return;
    if (
      edited.current &&
      !window.confirm("Replace what you typed in the company form with the values from this PDF?")
    )
      return;
    const next: Values = { ...values };
    const changed: string[] = [];
    for (const k of found.companyFound) {
      // An existing record keeps its name; the officer renames it deliberately.
      if (k === "name" && !newRecord && values.name) continue;
      const v = found.pdfCompany[k];
      if (k === "job_categories") next.job_categories = [...new Set([...(values.job_categories as string[]), ...((v as string[]) || [])])];
      else next[k] = String(v);
      changed.push(COMPANY_FIELD_LABELS[k]);
    }
    setValues(next);
    setDefaults((current) => ({ ...current, ...found.role }));
    for (const k of found.roleFound) changed.push(DRIVE_DEFAULT_LABELS[k as keyof typeof DRIVE_DEFAULT_LABELS]);
    setFilled(changed);
    setVersion((v) => v + 1);
    edited.current = false;
  };

  const pdfName = found?.pdfCompany.name;
  const nameDiffers = !newRecord && !!pdfName && !!values.name && pdfName.trim().toLowerCase() !== String(values.name).trim().toLowerCase();
  const categories = [...new Set([...JOB_CATEGORIES, ...(values.job_categories as string[])])];
  const dates = result ? [result.fields.drive_date && `drive date ${result.fields.drive_date}`, result.fields.registration_deadline && `registration deadline ${result.fields.registration_deadline}`].filter(Boolean) : [];

  return (
    <>
      <section className="erp-panel po-import" aria-labelledby="po-import-title">
        <h2 id="po-import-title">Fill from a recruiter PDF · optional</h2>
        <p className="erp-muted">
          Upload the company’s drive notice or job description (PDF, up to 10 MB). AI reads the company details and the
          role it is hiring for, and fills the form below. Nothing is saved until you review it and press Save. The
          extracted text is kept for officers; the PDF itself is not stored.
        </p>
        <div className="po-import-row">
          <input
            type="file"
            accept="application/pdf,.pdf"
            aria-label="Recruiter PDF"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setResult(null);
              setError("");
            }}
          />
          <button type="button" className="erp-secondary" disabled={!file || busy} onClick={() => void read()}>
            <FileText size={14} aria-hidden="true" />
            {busy ? "Reading the PDF…" : "Read PDF"}
          </button>
        </div>
        <p role="status" aria-live="polite" className={error ? "erp-form-error" : "erp-muted"}>
          {error || (busy ? "Extracting text and suggesting details. This can take up to a minute." : "")}
        </p>
        {result && found && (
          <div className="po-import-review">
            <p>
              <strong>{result.document.filename}</strong> · {result.document.pageCount ?? "?"} page
              {result.document.pageCount === 1 ? "" : "s"} · {found.companyFound.length} company details and{" "}
              {found.roleFound.length} role details found
            </p>
            {!!result.warnings.length && (
              <ul className="po-import-warnings">
                {result.warnings.map((warning, index) => (
                  <li key={index}>
                    <TriangleAlert size={13} aria-hidden="true" /> {warning}
                  </li>
                ))}
              </ul>
            )}
            {nameDiffers && (
              <p className="po-import-warnings">
                <TriangleAlert size={13} aria-hidden="true" /> The PDF names “{pdfName}”. This record’s name is kept; rename
                it yourself if this PDF belongs to it.
              </p>
            )}
            <dl className="po-import-fields">
              {found.companyFound.map((k) => {
                const v = found.pdfCompany[k];
                return (
                  <div key={k}>
                    <dt>{COMPANY_FIELD_LABELS[k]}</dt>
                    <dd>{Array.isArray(v) ? v.join(", ") : String(v)}</dd>
                  </div>
                );
              })}
              {found.roleFound.map((k) => {
                const v = found.role[k];
                return (
                  <div key={k}>
                    <dt>{DRIVE_DEFAULT_LABELS[k as keyof typeof DRIVE_DEFAULT_LABELS]}</dt>
                    <dd>{Array.isArray(v) ? v.join(", ") : String(v)}</dd>
                  </div>
                );
              })}
            </dl>
            {!!dates.length && (
              <p className="erp-muted">
                The PDF also gives a {dates.join(" and ")}. Dates are not kept on the company; enter them on each drive.
              </p>
            )}
            {result.text && (
              <details>
                <summary>Extracted text</summary>
                <pre className="po-import-text">{result.text}</pre>
              </details>
            )}
            <div className="po-form-actions">
              <button
                type="button"
                className="erp-primary"
                onClick={apply}
                disabled={!found.companyFound.length && !found.roleFound.length}
              >
                {filled ? "Fill the form again" : "Fill the form with these details"}
              </button>
              <p className="erp-muted">Only fields found in the PDF are changed. You are asked before typed values are replaced.</p>
            </div>
          </div>
        )}
        {filled && (
          <p className="po-note" role="status">
            Filled {filled.length} {filled.length === 1 ? "field" : "fields"} from the PDF. Check them, then press Save.
          </p>
        )}
      </section>

      <section
        className="erp-panel"
        onInputCapture={() => (edited.current = true)}
        onChangeCapture={() => (edited.current = true)}
      >
        <h2>{newRecord ? "Company details" : "Edit company details"}</h2>
        <ChangeForm
          key={version}
          action="company.save"
          base={newRecord ? {} : { id: company.id, revision: company.revision }}
          destination="/placement/companies"
        >
          <div className="po-split">
            {FIELDS.map(([field, type, max]) => (
              <label key={field}>
                {COMPANY_FIELD_LABELS[field]}
                <input
                  name={field}
                  type={type}
                  defaultValue={String(values[field] || "")}
                  required={field === "name"}
                  maxLength={max}
                />
              </label>
            ))}
          </div>
          <label>
            Roles they hire for
            <textarea
              name="hiring_roles"
              maxLength={1000}
              placeholder="e.g. Software engineer, Data analyst, Graduate engineer trainee"
              defaultValue={String(values.hiring_roles || "")}
            />
          </label>
          <fieldset className="po-checks">
            <legend>Job categories</legend>
            <input type="hidden" name="job_categories_present" value="1" />
            {categories.map((value) => (
              <label key={value} className="po-checkbox">
                <input
                  type="checkbox"
                  name="job_categories"
                  value={value}
                  defaultChecked={(values.job_categories as string[]).includes(value)}
                />
                {value}
              </label>
            ))}
          </fieldset>
          <label>
            About the company
            <textarea
              name="about"
              maxLength={4000}
              placeholder="What the company does, locations, notes from past visits…"
              defaultValue={String(values.about || "")}
            />
          </label>
          <DriveDefaultsFields value={defaults} onChange={setDefaults} departments={departments} />
          <input type="hidden" name="active_present" value="true" />
          <label className="po-checkbox">
            <input type="checkbox" name="active" defaultChecked={newRecord || company.active === true} />
            Active recruiting company
          </label>
        </ChangeForm>
      </section>
    </>
  );
}

/**
 * The role a company recruits for. Its inputs carry no form names; the whole
 * set is sent as one JSON value, so it cannot collide with company fields.
 */
function DriveDefaultsFields({
  value,
  onChange,
  departments,
}: {
  value: DriveDefaults;
  onChange: (next: DriveDefaults) => void;
  departments: string[];
}) {
  const set = (key: keyof DriveDefaults, next: string | string[]) => {
    const copy = { ...value };
    if (Array.isArray(next) ? next.length : String(next).trim() !== "") copy[key] = next;
    else delete copy[key];
    onChange(copy);
  };
  const text = (key: keyof DriveDefaults) => {
    const v = value[key];
    return Array.isArray(v) ? v.join(", ") : v === undefined ? "" : String(v);
  };
  const branches = Array.isArray(value.branches) ? value.branches.map(String) : [];
  const options = [...new Set([...departments.filter((d) => d !== "__missing__"), ...branches])];
  const number = (key: keyof DriveDefaults, title: string, min: number, max: number, step: string) => (
    <label>
      {title}
      <input type="number" min={min} max={max} step={step} value={text(key)} onChange={(e) => set(key, e.target.value)} />
    </label>
  );
  return (
    <fieldset className="po-drive-defaults">
      <legend>Default drive details</legend>
      <p className="erp-muted">
        Used to fill a new drive for this company. Batch, academic year, drive date and registration deadline are entered
        on each drive.
      </p>
      <input type="hidden" name="drive_defaults" value={JSON.stringify(value)} />
      <div className="po-split">
        <label>
          {DRIVE_DEFAULT_LABELS.title}
          <input value={text("title")} maxLength={200} onChange={(e) => set("title", e.target.value)} />
        </label>
        <label>
          {DRIVE_DEFAULT_LABELS.job_category}
          <input
            list="po-default-job-categories"
            value={text("job_category")}
            maxLength={100}
            placeholder="e.g. Software / IT"
            onChange={(e) => set("job_category", e.target.value)}
          />
          <datalist id="po-default-job-categories">
            {JOB_CATEGORIES.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </label>
        <label>
          {DRIVE_DEFAULT_LABELS.employment_type}
          <select value={text("employment_type")} onChange={(e) => set("employment_type", e.target.value)}>
            <option value="">Not specified</option>
            {EMPLOYMENT_TYPES.map((v) => (
              <option key={v} value={v}>
                {v === "internship-ppo" ? "Internship + PPO" : label(v)}
              </option>
            ))}
          </select>
        </label>
        {number("openings", DRIVE_DEFAULT_LABELS.openings, 1, 99999, "1")}
        {number("package_lpa", DRIVE_DEFAULT_LABELS.package_lpa, 0, 10000, "any")}
        <label>
          {DRIVE_DEFAULT_LABELS.location}
          <input value={text("location")} maxLength={200} onChange={(e) => set("location", e.target.value)} />
        </label>
        {number("min_cgpa", DRIVE_DEFAULT_LABELS.min_cgpa, 0, 10, "any")}
        {number("max_backlogs", DRIVE_DEFAULT_LABELS.max_backlogs, 0, 100, "1")}
        {number("min_attendance", DRIVE_DEFAULT_LABELS.min_attendance, 0, 100, "any")}
      </div>
      <label>
        {DRIVE_DEFAULT_LABELS.branches} · leave unselected for all
        <select
          multiple
          value={branches}
          onChange={(e) => set("branches", Array.from(e.currentTarget.selectedOptions, (o) => o.value))}
        >
          {options.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <label>
        {DRIVE_DEFAULT_LABELS.skills}
        <input value={text("skills")} maxLength={2000} onChange={(e) => set("skills", e.target.value)} />
      </label>
      <label>
        {DRIVE_DEFAULT_LABELS.required_documents}
        <input value={text("required_documents")} maxLength={2000} onChange={(e) => set("required_documents", e.target.value)} />
      </label>
      <label>
        {DRIVE_DEFAULT_LABELS.description}
        <textarea value={text("description")} maxLength={12000} onChange={(e) => set("description", e.target.value)} />
      </label>
      <label>
        {DRIVE_DEFAULT_LABELS.rounds} · one per line, in order
        <textarea
          value={Array.isArray(value.rounds) ? value.rounds.join("\n") : ""}
          onChange={(e) => set("rounds", e.target.value.split("\n").map((r) => r.trimStart()).filter((r, i, all) => r || i === all.length - 1))}
          onBlur={(e) => set("rounds", e.target.value.split("\n").map((r) => r.trim()).filter(Boolean))}
        />
      </label>
    </fieldset>
  );
}
