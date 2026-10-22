import Link from "next/link";
import type { BatchView } from "@/features/campus/lib/batches";
import type { Filters } from "@/features/campus/lib/types";
import { filterQuery, formatCgpa, formatCount } from "@/features/campus/lib/filters";
import { DrilldownRow } from "./DrilldownRow";
import { QUOTA_COLUMNS, quotaCounts } from "@/features/campus/lib/placement";

export function DepartmentBreakdown({
  data,
  filters,
  canExport,
}: {
  data: BatchView;
  filters: Filters;
  canExport: boolean;
}) {
  if (!data.batch) return null;
  const departments = data.departments.map((d) => ({ ...d, quotas: quotaCounts(d.quotas) }));
  const target = `/portal/batch-analytics/${data.batch}`;
  const cohort = { ...filters, batch: data.batch };
  const showOtherGender =
    data.genderAvailable && (data.summary.gender_other ?? 0) > 0;
  const genderCount = (value: number | null) =>
    value === null ? "—" : formatCount(value);
  return (
    <section
      className="erp-panel erp-department-breakdown"
      id="batch-departments"
      aria-labelledby="department-breakdown-heading"
    >
      <div className="erp-section-heading">
        <div>
          <h2 id="department-breakdown-heading">
            Batch {data.batch} · Department breakdown
          </h2>
          <p className="erp-muted">
            {formatCount(data.summary.total)} students · Select a department to
            open its student details.
          </p>
        </div>
        <div className="erp-breakdown-actions">
          <Link
            className="erp-secondary"
            href={`${target}?${filterQuery(cohort)}`}
          >
            View all matching students ↗
          </Link>
          {canExport && (
            <a
              className="erp-secondary"
              href={`${target}/export?${filterQuery(cohort)}`}
            >
              Export students ↓
            </a>
          )}
        </div>
      </div>
      {data.departments.length ? (
        <div
          className="erp-table-scroll"
          tabIndex={0}
          role="region"
          aria-label={`Batch ${data.batch} department metrics`}
        >
          <table className="erp-table erp-batch-table erp-department-table">
            <caption className="erp-visually-hidden">
              Student counts by department, gender, admission quota and CGPA for
              batch {data.batch}.
            </caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Branch</th>
                <th scope="col">Total</th>
                <th scope="col">Male</th>
                <th scope="col">Female</th>
                {showOtherGender && <th scope="col">Other / not recorded</th>}
                {QUOTA_COLUMNS.map((q) => (
                  <th scope="col" key={q}>
                    {q}
                  </th>
                ))}
                <th scope="col">CGPA ≥ 6.0</th>
                <th scope="col">CGPA &lt; 6.0</th>
                <th scope="col">Unclassified</th>
                <th scope="col">Eligible</th>
                <th scope="col">Not Eligible</th>
                <th scope="col">Average CGPA</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d, index) => {
                const href = `${target}?${filterQuery({ ...cohort, department: d.department_short_name ?? "__missing__" })}`;
                return (
                  <DrilldownRow
                    key={d.department_short_name ?? "missing"}
                    href={href}
                  >
                    <td>{index + 1}</td>
                    <th scope="row">
                      <Link href={href}>
                        {d.department_short_name ?? "Not recorded"} ↗
                      </Link>
                    </th>
                    <td>{formatCount(d.total)}</td>
                    <td>{genderCount(d.male)}</td>
                    <td>{genderCount(d.female)}</td>
                    {showOtherGender && <td>{genderCount(d.gender_other)}</td>}
                    {QUOTA_COLUMNS.map((q) => (
                      <td key={q}>{formatCount(d.quotas[q] ?? 0)}</td>
                    ))}
                    <td>{formatCount(d.at_least_six)}</td>
                    <td>{formatCount(d.below_six)}</td>
                    <td>{formatCount(d.unclassified)}</td>
                    <td>{formatCount(d.eligible)}</td>
                    <td>{formatCount(d.not_eligible)}</td>
                    <td>{formatCgpa(d.average_cgpa)}</td>
                  </DrilldownRow>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td aria-hidden="true" />
                <th scope="row">Total</th>
                <td>{formatCount(data.summary.total)}</td>
                <td>{genderCount(data.summary.male)}</td>
                <td>{genderCount(data.summary.female)}</td>
                {showOtherGender && (
                  <td>{genderCount(data.summary.gender_other)}</td>
                )}
                {QUOTA_COLUMNS.map((q) => (
                  <td key={q}>
                    {formatCount(
                      departments.reduce(
                        (n, d) => n + (d.quotas[q] ?? 0),
                        0,
                      ),
                    )}
                  </td>
                ))}
                <td>{formatCount(data.summary.at_least_six)}</td>
                <td>{formatCount(data.summary.below_six)}</td>
                <td>{formatCount(data.summary.unclassified)}</td>
                <td>{formatCount(data.summary.eligible)}</td>
                <td>{formatCount(data.summary.not_eligible)}</td>
                <td>{formatCgpa(data.summary.average_cgpa)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="erp-empty">No departments match these filters.</p>
      )}
      <p className="erp-muted erp-breakdown-note">
        Placement eligible: {data.placementPolicy.label}. Students below this
        threshold are not eligible; missing or invalid CGPA is unclassified.
        The ≥ 6.0 and &lt; 6.0 columns are separate statistical counts.
        DSAT includes DSAT Online. Mgmt includes only explicit management quotas;
        other or unrecorded quotas appear under Other.
        {!data.genderAvailable &&
          " Gender information is restricted to administrators."}
      </p>
    </section>
  );
}
