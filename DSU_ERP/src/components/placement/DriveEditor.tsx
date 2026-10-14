import { ChangeForm, RoundsInput } from "./Controls";
import type { Report, Row } from "@/lib/placement/types";
import { STATUSES, text } from "@/lib/placement/types";
export function DriveEditor({
  drive,
  companies,
  options,
}: {
  drive?: Row;
  companies: Row[];
  options: Report["options"];
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
            defaultValue={String(d.company_id || "")}
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
