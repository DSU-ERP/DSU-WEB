import Link from "next/link";
import type { Query, Row, Report } from "@/features/placement/lib/types";
import { label, number, text, href } from "@/features/placement/lib/types";
export type Column = {
  key: string;
  title?: string;
  numeric?: boolean;
  precision?: number;
  link?: (row: Row) => string;
  render?: (row: Row) => React.ReactNode;
};
export function Table({
  rows,
  columns,
  caption,
  details,
}: {
  rows: Row[];
  columns: Column[];
  caption: string;
  details?: (row: Row) => React.ReactNode;
}) {
  if (!rows.length)
    return (
      <p className="erp-empty">No recorded data matches this selection.</p>
    );
  return (
    <div
      className="erp-table-scroll"
      tabIndex={0}
      role="region"
      aria-label={caption}
    >
      <table className="erp-table po-table">
        <caption className="erp-visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col">
                {c.title || label(c.key)}
              </th>
            ))}
            {details && <th scope="col">Details</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={text(r.id || r.student_id || r.department || i)}>
              {columns.map((c) => (
                <td key={c.key}>
                  {c.render ? (
                    c.render(r)
                  ) : c.link ? (
                    <Link href={c.link(r)}>{text(r[c.key])} ↗</Link>
                  ) : c.numeric ? (
                    number(r[c.key], c.precision ?? 2)
                  ) : (
                    text(r[c.key])
                  )}
                </td>
              ))}
              {details && (
                <td>
                  <details>
                    <summary>Expand</summary>
                    <div className="po-inline-detail">{details(r)}</div>
                  </details>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Metrics({ data, keys }: { data?: Row; keys: string[] }) {
  return (
    <div className="po-metrics">
      {keys.map((key) => (
        <article key={key}>
          <span>{label(key)}</span>
          <strong>
            {number(data?.[key], 2)}
            {key.endsWith("percentage") && data?.[key] !== null ? "%" : ""}
          </strong>
        </article>
      ))}
    </div>
  );
}
export function Facts({ data }: { data: Row }) {
  return (
    <dl className="po-facts">
      {Object.entries(data).map(([key, value]) => (
        <div key={key}>
          <dt>{label(key)}</dt>
          <dd>
            {Array.isArray(value)
              ? value
                  .map((v) =>
                    typeof v === "object" ? JSON.stringify(v) : String(v),
                  )
                  .join(", ") || "—"
              : text(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
export function Pagination({
  report,
  path,
  query,
}: {
  report: Report;
  path: string;
  query: Query;
}) {
  const { total, page, limit } = report.pagination,
    pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="erp-pagination">
      <span>
        {number(total)} records · Page {page} of {pages}
      </span>
      <div>
        {page > 1 && (
          <Link href={href(path, query, { page: String(page - 1) })}>
            ← Previous
          </Link>
        )}
        {page < pages && (
          <Link href={href(path, query, { page: String(page + 1) })}>
            Next →
          </Link>
        )}
      </div>
    </div>
  );
}
export type Filter = {
  key: string;
  title?: string;
  options?: string[];
  defaultValue?: string;
  /** Display text per option value; the URL keeps the raw value. */
  optionLabels?: Record<string, string>;
  /** Text for the empty option, or null when every choice is explicit. */
  allLabel?: string | null;
  placeholder?: string;
};
export function Filters({
  path,
  query,
  fields,
  hidden = {},
}: {
  path: string;
  query: Query;
  fields: Filter[];
  hidden?: Query;
}) {
  return (
    <form
      key={JSON.stringify(query)}
      action={`/placement/${path}`}
      className="po-filters"
      role="search"
    >
      {Object.entries({
        ...Object.fromEntries(
          Object.entries(query).filter(
            ([key]) => !["page", ...fields.map((f) => f.key)].includes(key),
          ),
        ),
        ...hidden,
      }).map(([key, v]) => (
        <input type="hidden" key={key} name={key} value={v} />
      ))}
      {fields.map((f) => (
        <label key={f.key}>
          {f.title || label(f.key)}
          {f.options ? (
            <select
              aria-label={f.title || label(f.key)}
              name={f.key}
              defaultValue={query[f.key] ?? f.defaultValue ?? ""}
            >
              {f.allLabel !== null && (
                <option value="">{f.allLabel ?? "All"}</option>
              )}
              {f.options.map((v) => (
                <option key={v} value={v}>
                  {f.optionLabels?.[v] ?? label(v)}
                </option>
              ))}
            </select>
          ) : (
            <input
              name={f.key}
              defaultValue={query[f.key] || ""}
              placeholder={
                f.placeholder ??
                (f.key === "search" ? "Search name or USN…" : undefined)
              }
              maxLength={100}
            />
          )}
        </label>
      ))}
      <div className="po-filter-actions">
        <button className="erp-primary">Apply filters</button>
        <Link className="erp-secondary" href={href(path, hidden)}>
          Clear
        </Link>
      </div>
    </form>
  );
}
export const studentColumns: Column[] = [
  {
    key: "usn",
    title: "USN",
    link: (r) => `/placement/students/${r.id || r.student_id}`,
  },
  { key: "name", link: (r) => `/placement/students/${r.id || r.student_id}` },
  { key: "department", title: "Branch" },
  { key: "batch" },
  { key: "cgpa", title: "CGPA", numeric: true },
  { key: "sgpa", title: "SGPA", numeric: true },
  { key: "backlogs", numeric: true },
  { key: "attendance", title: "Attendance %", numeric: true },
  {
    key: "eligible",
    title: "Baseline eligibility",
    render: (r) =>
      r.eligible === null
        ? "Unclassified"
        : r.eligible
          ? "Eligible"
          : "Not Eligible",
  },
];
export const offerColumns: Column[] = [
  {
    key: "usn",
    title: "USN",
    link: (r) => `/placement/students/${r.student_id}`,
  },
  { key: "name" },
  { key: "department", title: "Branch" },
  { key: "company" },
  { key: "title", title: "Role" },
  { key: "package_lpa", title: "Package (LPA)", numeric: true },
  { key: "category" },
  { key: "status" },
  {
    key: "active",
    render: (r) => (r.active ? "Active" : "Previous / inactive"),
  },
];
