// Student categories: the three CGPA category cards and the ranked directory.
// Ranks always come from the backend (dense rank by official CGPA within the
// passing-out batch); filters only hide rows, so ranks hold across pages.
import Link from "next/link";
import { Download, ListOrdered } from "lucide-react";
import {
  directoryHref,
  eligibilityLabel,
  exactCgpa,
  formatCgpa,
  formatCount,
  formatPercent,
  rankReason,
  rankedExportHref,
  skillStatusDetail,
  skillStatusLabel,
  type CategoriesResponse,
  type CategoryCard,
  type DirectoryQuery,
  type DirectoryResponse,
} from "@/features/placement/lib/intelligence";

type Cohort = { batch?: string; department?: string };

export function CategoryCards({
  cards,
  cohort,
}: {
  cards: CategoryCard[];
  cohort: Cohort;
}) {
  return (
    <div className="po-card-grid po-category-cards">
      {cards.map((c) => (
        <article key={c.id} className="po-card po-category-card" aria-labelledby={`po-cat-${c.id}`}>
          <h2 id={`po-cat-${c.id}`}>{c.name}</h2>
          <p className="erp-muted">CGPA {c.range}</p>
          <strong>
            {formatCount(c.total)} <small>students</small>
          </strong>
          <dl className="po-facts">
            <div>
              <dt>Share of cohort</dt>
              <dd>{formatPercent(c.cohortPercentage, 1)}</dd>
            </div>
            <div>
              <dt>Average CGPA</dt>
              <dd>{c.total ? formatCgpa(c.averageCgpa) : "No students"}</dd>
            </div>
            <div>
              <dt>Placement eligible</dt>
              <dd>{formatCount(c.eligible)}</dd>
            </div>
            <div>
              <dt>Eligibility rate</dt>
              <dd>{c.total ? formatPercent(c.eligibilityPercentage, 1) : "No students"}</dd>
            </div>
          </dl>
          <div className="po-card-actions">
            <Link className="erp-primary" href={directoryHref(c.id, cohort)}>
              <ListOrdered size={14} aria-hidden="true" /> View ranked students
            </Link>
            <a
              className="erp-secondary"
              href={rankedExportHref(c.id, cohort)}
              download
              aria-label={`Export ${c.name} ranked students as CSV`}
            >
              <Download size={14} aria-hidden="true" /> Export CSV
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}

export function CohortFilters({
  action,
  batches,
  departments,
  query,
  extra,
}: {
  action: string;
  batches: string[];
  departments: string[];
  query: DirectoryQuery;
  extra?: boolean;
}) {
  const select = (name: keyof DirectoryQuery, title: string, options: [string, string][], all?: string) => (
    <label>
      {title}
      <select name={name} defaultValue={query[name] ?? ""}>
        {all !== undefined && <option value="">{all}</option>}
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <form key={JSON.stringify(query)} action={action} className="po-filters" role="search">
      {extra && (
        <label>
          Search
          <input
            name="search"
            type="search"
            defaultValue={query.search ?? ""}
            placeholder="Name or USN"
            maxLength={100}
            autoComplete="off"
          />
        </label>
      )}
      {select("batch", "Passing-out batch", batches.map((b) => [b, b]), batches.length ? undefined : "Current batch")}
      {select(
        "department",
        "Department",
        departments.map((d) => [d, d === "__missing__" ? "Not recorded" : d]),
        "All departments",
      )}
      {extra && (
        <>
          {select("eligibility", "Placement eligibility", [["eligible", "Eligible"], ["ineligible", "Not eligible"]], "All")}
          {select(
            "skill",
            "Skill profile",
            [["complete", "Complete"], ["incomplete", "Incomplete"], ["not_started", "Not started"]],
            "All",
          )}
          {select("sort", "Sort by", [["rank", "Rank"], ["name", "Name"], ["usn", "USN"], ["cgpa", "CGPA"]])}
          {select("direction", "Order", [["asc", "Ascending"], ["desc", "Descending"]], "Default")}
        </>
      )}
      <div className="po-filter-actions">
        <button className="erp-primary">Apply filters</button>
        <Link className="erp-secondary" href={action}>
          Clear
        </Link>
      </div>
    </form>
  );
}

export function RankedDirectory({
  data,
  query,
  category,
}: {
  data: DirectoryResponse;
  query: DirectoryQuery;
  category: string;
}) {
  const { total, page, limit } = data.pagination;
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = total ? (page - 1) * limit + 1 : 0,
    to = Math.min(total, page * limit);
  const rule =
    data.scope?.rule ||
    "Dense rank by official CGPA within the passing-out batch and category. Filters do not change ranks.";
  return (
    <section className="erp-panel po-directory" aria-labelledby="po-directory-heading">
      <h2 id="po-directory-heading">Ranked students</h2>
      <p className="po-note" id="po-rank-rule">
        <strong>How ranks work.</strong> {rule} Batch rank uses the same rule
        across every category in batch {data.scope?.batch ?? "selected"}.
        Students with equal CGPA share a rank. A student without an official
        CGPA is not ranked.
      </p>
      <p className="po-note" id="po-skill-rule">
        <strong>Skill profile.</strong> Complete means skills onboarding is
        finished and every required platform (GitHub, LeetCode, LinkedIn)
        LinkedIn) is linked or declared not used. A profile becomes Incomplete
        again if a required platform is later disconnected.
      </p>
      {!data.rows.length ? (
        <p className="erp-empty">
          {page > 1
            ? "This page is past the last result. Go back to the first page."
            : "No students in this category match these filters."}
        </p>
      ) : (
        <div className="erp-table-scroll" tabIndex={0} role="region" aria-label="Ranked students">
          <table className="erp-table po-table po-ranked-table">
            <caption className="erp-visually-hidden">
              Ranked students, page {page} of {pages}. {rule}
            </caption>
            <thead>
              <tr>
                <th scope="col" aria-describedby="po-rank-rule" title={rule}>
                  Category rank
                  <small>by CGPA in category</small>
                </th>
                <th scope="col" aria-describedby="po-rank-rule" title={rule}>
                  Batch rank
                  <small>by CGPA, whole batch</small>
                </th>
                <th scope="col">Name</th>
                <th scope="col">USN</th>
                <th scope="col">Department</th>
                <th scope="col">Batch</th>
                <th scope="col">Semester</th>
                <th scope="col">CGPA</th>
                <th scope="col">Placement eligibility</th>
                <th scope="col" aria-describedby="po-skill-rule">Skill profile</th>
                <th scope="col">Profile</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id}>
                  <td className="po-rank" title={r.categoryRank == null ? rankReason(r.cgpa) : undefined}>{r.categoryRank ?? "Not ranked"}</td>
                  <td className="po-rank" title={r.batchRank == null ? rankReason(r.cgpa) : undefined}>{r.batchRank ?? "Not ranked"}</td>
                  <td>{r.name}</td>
                  <td>{r.usn}</td>
                  <td>{r.department || "Not recorded"}</td>
                  <td>{r.batch || "Not recorded"}</td>
                  <td>{r.semester ?? "Not recorded"}</td>
                  <td>{exactCgpa(r.cgpa)}</td>
                  <td>{eligibilityLabel(r.eligible)}</td>
                  <td>
                    <span className={`po-status po-status-${r.skillStatus}`} title={skillStatusDetail(r.skillStatus)}>
                      {skillStatusLabel(r.skillStatus)}
                    </span>
                  </td>
                  <td>
                    <Link href={`/placement/students/${encodeURIComponent(r.id)}`} aria-label={`View profile of ${r.name}`}>
                      View profile
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <nav className="erp-pagination" aria-label="Ranked students pages">
        <span>
          {total ? `Showing ${from} to ${to} of ${formatCount(total)} students` : "0 students"} · Page {page} of {pages}
        </span>
        <div>
          {page > 1 && (
            <Link href={directoryHref(category, { ...query, page: page - 1 > 1 ? String(page - 1) : undefined })}>
              ← Previous
            </Link>
          )}
          {page < pages && (
            <Link href={directoryHref(category, { ...query, page: String(page + 1) })}>Next →</Link>
          )}
        </div>
      </nav>
    </section>
  );
}

export function CategorySummary({ data }: { data: CategoriesResponse }) {
  return (
    <p className="po-note">
      {formatCount(data.total)} students in passing-out batch {data.batch ?? "not set"}
      {data.unclassified
        ? `. ${formatCount(data.unclassified)} without a valid official CGPA are unclassified and not shown in any category.`
        : ". Every student has a valid official CGPA."}{" "}
      Categories use official CGPA only: Advanced 8.50 and above, Medium 6.75
      – 8.49, Needs Improvement below 6.75. Placement eligible means a
      valid CGPA of 6.75 or above.
    </p>
  );
}
