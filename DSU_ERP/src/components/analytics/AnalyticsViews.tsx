import Link from "next/link";
import type {
  AnalyticsOptions,
  AnalyticsSummary,
  Filters,
} from "@/lib/analytics/types";
import {
  filterQuery,
  formatCgpa,
  formatCount,
  formatPercent,
} from "@/lib/analytics/filters";

export function AnalyticsFilters({
  filters,
  options,
  path,
}: {
  filters: Filters;
  options: AnalyticsOptions;
  path: string;
}) {
  return (
    <form
      className="erp-search erp-analytics-filters"
      action={path}
      role="search"
    >
      <label>
        Student name / USN
        <input
          name="search"
          defaultValue={filters.search || ""}
          placeholder="Search name or USN…"
          maxLength={100}
        />
      </label>
      <label>
        Batch
        <select name="batch" defaultValue={filters.batch || ""}>
          <option value="">All batches</option>
          {filters.batch && !options.batches.includes(filters.batch) && (
            <option value={filters.batch}>{filters.batch} (no records)</option>
          )}
          {options.batches.map((batch) => (
            <option key={batch}>{batch}</option>
          ))}
        </select>
      </label>
      <label>
        Department
        <select name="department" defaultValue={filters.department || ""}>
          <option value="">All departments</option>
          {filters.department &&
            !options.departments.includes(filters.department) &&
            filters.department !== "__missing__" && (
              <option value={filters.department}>
                {filters.department} (no records)
              </option>
            )}
          {options.departments.map((dept) => (
            <option key={dept}>{dept}</option>
          ))}
          {(options.missing_department ||
            filters.department === "__missing__") && (
            <option value="__missing__">Not recorded</option>
          )}
        </select>
      </label>
      <button className="erp-primary">Apply filters</button>
      <Link className="erp-secondary" href={path}>
        Clear
      </Link>
    </form>
  );
}

export function DataQuality({ summary }: { summary: AnalyticsSummary }) {
  return (
    <section
      className="erp-panel erp-data-quality"
      aria-label="CGPA data quality"
    >
      <div>
        <h2>Every student accounted for.</h2>
        <p className="erp-muted">
          {formatCount(summary.valid)} classified +{" "}
          {formatCount(summary.unclassified)} unclassified ={" "}
          {formatCount(summary.total)} students in the selected cohort.
        </p>
      </div>
      <dl>
        <div>
          <dt>Missing CGPA</dt>
          <dd>{formatCount(summary.missing)}</dd>
        </div>
        <div>
          <dt>Invalid CGPA</dt>
          <dd>{formatCount(summary.invalid)}</dd>
        </div>
      </dl>
      <p className="erp-muted">
        Valid scale: {summary.scale.min}–{summary.scale.max}. Percentages use
        all selected students, including unclassified records. Classification
        and ranking use stored precision; CGPA is displayed to two decimals.
      </p>
    </section>
  );
}

export function CategoryPanels({
  summary,
  filters,
}: {
  summary: AnalyticsSummary;
  filters: Filters;
}) {
  const query = filterQuery(filters);
  return (
    <>
      <div className="erp-category-grid">
        {summary.categories.map((category) => (
          <Link
            key={category.id}
            className="erp-category-panel"
            href={`/portal/student-categories/${category.id}?${query}`}
            aria-label={`View ${category.name} students`}
          >
            <div className="erp-category-heading">
              <h2>{category.name}</h2>
              <span aria-hidden="true">↗</span>
            </div>
            <p className="erp-category-range" title={category.conditionLabel}>
              {category.conditionLabel}
            </p>
            <strong className="erp-category-count">
              {formatCount(category.count)}
            </strong>
            <p className="erp-muted">
              {formatPercent(category.percentage)} of selected cohort
            </p>
            <dl className="erp-category-facts">
              <div>
                <dt>Average CGPA</dt>
                <dd>{formatCgpa(category.averageCgpa)}</dd>
              </div>
              <div>
                <dt>Placement-eligible students</dt>
                <dd>
                  {category.eligibleCount === null
                    ? "—"
                    : formatCount(category.eligibleCount)}
                </dd>
              </div>
              <div>
                <dt>Eligibility percentage</dt>
                <dd>{formatPercent(category.eligibilityPercentage)}</dd>
              </div>
            </dl>
            <span className="erp-category-action">
              View Students <span aria-hidden="true">→</span>
            </span>
          </Link>
        ))}
      </div>
      <p className="erp-muted erp-policy-note">
        Placement eligible: {summary.placementPolicy.label ?? "Policy unavailable"}.
        Missing or invalid CGPA remains unclassified. Eligibility percentages use
        the students within each category.
      </p>
    </>
  );
}

export function Distribution({ summary }: { summary: AnalyticsSummary }) {
  return (
    <section className="erp-panel">
      <h2>CGPA distribution</h2>
      <p className="erp-muted">
        Statistical bands, separate from the three performance categories.
      </p>
      <ul className="erp-distribution">
        {summary.distribution.map((band) => (
          <li key={band.id}>
            <span>{band.label}</span>
            <div aria-hidden="true">
              <i style={{ width: `${band.percentage}%` }} />
            </div>
            <strong>{formatCount(band.count)}</strong>
            <span>{formatPercent(band.percentage)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
