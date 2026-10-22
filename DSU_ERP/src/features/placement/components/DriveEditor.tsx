import { ChangeForm, RoundsInput } from "./Controls";
import type { Report, Row } from "@/features/placement/lib/types";
import { EMPLOYMENT_TYPES, JOB_CATEGORIES, STATUSES, label, text } from "@/features/placement/lib/types";
export function DriveEditor({
  drive,
  companies,
  options,
  defaultCompany,
}: {
  drive?: Row;
  companies: Row[];
  options: Report["options"];
  defaultCompany?: string;
}) {
  const d = drive || {},
    existing = !!drive;
  return (
    <ChangeForm
      action="drive.save"
      base={existing ? { id: d.id, revision: d.revision } : {}}
      destination={
        existing ? `/placement/drives/${d.id}` : "/placement/drives/:id"
      }
    >
      <div className="po-split">
        <label>
          Company
          <select
            aria-label="Company"
            name="company_id"
            defaultValue={String(d.company_id || defaultCompany || "")}
            required
          >
            <option value="">Select company</option>
            {companies.map((c) => (
              <option key={String(c.id)} value={String(c.id)}>
                {text(c.name)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Job role
          <input
            name="title"
            required
            maxLength={200}
            defaultValue={String(d.title || "")}
          />
        </label>
      </div>
      <div className="po-split">
        <label>
          Job category
          <input
            name="job_category"
            list="po-job-categories"
            maxLength={100}
            placeholder="e.g. Software / IT"
            defaultValue={String(d.job_category || "")}
          />
          <datalist id="po-job-categories">
            {JOB_CATEGORIES.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </label>
        <label>
          Employment type
          <select name="employment_type" defaultValue={String(d.employment_type || "")}>
            <option value="">Not specified</option>
            {EMPLOYMENT_TYPES.map((v) => (
              <option key={v} value={v}>
                {v === "internship-ppo" ? "Internship + PPO" : label(v)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Openings (people to hire) · optional
          <input
            name="openings"
            type="number"
            min="1"
            max="99999"
            step="1"
            placeholder="Not specified"
            defaultValue={d.openings === null || d.openings === undefined ? "" : String(d.openings)}
          />
        </label>
      </div>
      <label>
        Description
        <textarea
          name="description"
          maxLength={12000}
          defaultValue={String(d.description || "")}
        />
      </label>
      <div className="po-split">
        <label>
          Salary package (LPA)
          <input
            name="package_lpa"
            type="number"
            min="0"
            max="10000"
            step="any"
            required
            defaultValue={String(d.package_lpa ?? "")}
          />
        </label>
        <label>
          Academic year
          <input
            name="academic_year"
            pattern="20[0-9]{2}-([0-9]{2}|20[0-9]{2})"
            placeholder="2026-27"
            required
            defaultValue={String(d.academic_year || "")}
          />
        </label>
        <label>
          Passing-out batch
          <select
            aria-label="Passing-out batch"
            name="batch"
            required
            defaultValue={String(d.batch || "")}
          >
            <option value="">Select batch</option>
            {options.batches.map((batch) => (
              <option key={batch}>{batch}</option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select name="status" defaultValue={String(d.status || "upcoming")}>
            {STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <label>
          Minimum CGPA
          <input
            name="min_cgpa"
            type="number"
            min="0"
            max="10"
            step="any"
            required
            defaultValue={String(d.min_cgpa ?? options.policy.minimumCgpa)}
          />
        </label>
        <label>
          Maximum current backlogs
          <input
            name="max_backlogs"
            type="number"
            min="0"
            max="100"
            step="1"
            required
            defaultValue={String(d.max_backlogs ?? 0)}
          />
        </label>
        <label>
          Minimum attendance % · optional
          <input
            name="min_attendance"
            type="number"
            min="0"
            max="100"
            step="any"
            placeholder="No limit"
            defaultValue={
              d.min_attendance === null || d.min_attendance === undefined
                ? ""
                : String(d.min_attendance)
            }
          />
        </label>
        <label>
          Drive date
          <input
            name="drive_date"
            type="date"
            defaultValue={String(d.drive_date || "")}
          />
        </label>
        <label>
          Registration deadline
          <input
            name="registration_deadline"
            type="date"
            defaultValue={String(d.registration_deadline || "")}
          />
        </label>
      </div>
      <label>
        Permitted branches · leave unselected for all
        <select
          name="branches"
          multiple
          defaultValue={Array.isArray(d.branches) ? d.branches.map(String) : []}
        >
          {options.departments
            .filter((v) => v !== "__missing__")
            .map((v) => (
              <option key={v}>{v}</option>
            ))}
        </select>
      </label>
      <input type="hidden" name="published_present" value="1"/>
      <label><input type="checkbox" name="published" value="true" defaultChecked={!!d.published}/> Publish to students in this batch and notify everyone who meets these criteria</label>
      <p className="po-note">
        Only students who meet every limit above (batch, minimum CGPA, current
        backlogs, branches, attendance and the upward-only offer rule) get a
        notification. Relaxing a limit later notifies the newly eligible
        students; nobody is notified twice.
      </p>
      <label>Location<input name="location" defaultValue={String(d.location||'')} maxLength={200}/></label>
      <label>Required skills<input name="skills" defaultValue={String(d.skills||'')} maxLength={2000}/></label>
      <label>Required documents<input name="required_documents" defaultValue={String(d.required_documents||'')} maxLength={2000}/></label>
      <label>Original drive PDF URL<input type="url" name="original_pdf_url" defaultValue={String(d.original_pdf_url||'')} placeholder="https://…"/></label>
      <RoundsInput
        initial={Array.isArray(d.rounds) ? d.rounds.map(String) : undefined}
      />
      <p className="po-note">
        Company, batch and round order are locked once registration starts.
        Interest override never bypasses academic, branch, deadline or
        upward-only restrictions.
      </p>
    </ChangeForm>
  );
}
