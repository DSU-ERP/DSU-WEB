import Link from "next/link";
import { Fragment } from "react";
import { notFound, redirect } from "next/navigation";
import { campusApi, CampusError, membership } from "@/lib/campus-api";
import {
  batchFilters,
  batchQuery,
  selectedPage,
  type BatchView,
  type StudentDetail,
} from "@/lib/analytics/batches";
import {
  filterQuery,
  formatCgpa,
  type SearchParams,
} from "@/lib/analytics/filters";
import {
  BatchFilters,
  ExpandedStudent,
} from "@/components/analytics/BatchViews";
import { DrilldownRow } from "@/components/analytics/DrilldownRow";
import { placementStatus } from "@/lib/analytics/placement";

export default async function BatchStudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ batch: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const access = await membership();
  if (access.role === "student") redirect("/portal");
  const { batch } = await params;
  if (!/^20\d{2}$/.test(batch)) notFound();
  const query = await searchParams;
  const filters: Record<string, string> = { ...batchFilters(query), batch };
  const { data } = await campusApi<{ data: BatchView }>(
    `/batches/students?${batchQuery(filters, { page: String(selectedPage(query.page)), limit: "25" })}`,
  );
  const path = `/portal/batch-analytics/${batch}`;
  const selected =
    typeof query.student === "string" &&
    data.students.some((s) => s.id === query.student)
      ? query.student
      : null;
  let detail: StudentDetail | null = null;
  if (selected) {
    try {
      detail = (
        await campusApi<{ data: StudentDetail }>(
          `/batches/student/${selected}?${batchQuery(filters)}`,
        )
      ).data;
    } catch (e) {
      if (!(e instanceof CampusError && e.status === 404)) throw e;
    }
  }
  const page = data.pagination.page;
  const pageCount = Math.max(
    1,
    Math.ceil(data.pagination.total / data.pagination.limit),
  );
  const sortHeading = (label: string, key: string) => {
    const active = filters.sort === key;
    const direction = active
      ? filters.direction === "desc"
        ? "asc"
        : "desc"
      : ["name", "usn"].includes(key)
        ? "asc"
        : "desc";
    return (
      <th
        aria-sort={
          active
            ? filters.direction === "asc"
              ? "ascending"
              : "descending"
            : "none"
        }
      >
        <Link href={`${path}?${batchQuery(filters, { sort: key, direction })}`}>
          {label} {active ? (filters.direction === "asc" ? "↑" : "↓") : "↕"}
        </Link>
      </th>
    );
  };
  return (
    <>
      <Link
        className="erp-back"
        href={`/portal/analytics?${filterQuery({ batch, search: filters.search })}#batch-departments`}
      >
        ← Batch {batch} department summary
      </Link>
      <p className="erp-eyebrow">BATCH STUDENTS</p>
      <div className="erp-page-heading">
        <div>
          <h1>
            {filters.department && filters.department !== "__missing__"
              ? `${filters.department} · `
              : ""}
            Batch {batch}
          </h1>
          <p>
            {data.pagination.total.toLocaleString("en-IN")} matching students.
            Select a student to expand their details.
          </p>
        </div>
        {access.role === "admin" && (
          <a
            className="erp-secondary"
            href={`${path}/export?${batchQuery(filters)}`}
          >
            Export matching students ↓
          </a>
        )}
      </div>
      <BatchFilters data={data} filters={filters} path={path} students />
      <p className="erp-muted erp-policy-note">
        Placement eligible: {data.placementPolicy.label}. Missing or invalid CGPA
        is unclassified. CGPA sorting uses exact stored values.
      </p>
      <section className="erp-panel erp-student-list">
        {data.students.length ? (
          <div
            className="erp-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Batch students"
          >
            <table className="erp-table erp-batch-students">
              <thead>
                <tr>
                  <th>#</th>
                  {sortHeading("USN", "usn")}
                  {sortHeading("Name", "name")}
                  <th>Gender</th>
                  {sortHeading("Sem", "semester")}
                  <th>Class batch</th>
                  <th>Quota</th>
                  {sortHeading("CGPA", "cgpa")}
                  {sortHeading("SGPA", "sgpa")}
                  {sortHeading("Attendance", "attendance")}
                  {sortHeading("Backlogs", "backlogs")}
                  <th>Student status</th>
                  <th>Placement</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((s, i) => {
                  const expanded = selected === s.id && !!detail;
                  const href = `${path}?${batchQuery(filters, { page: String(page), student: expanded ? undefined : s.id })}`;
                  return (
                    <Fragment key={s.id}>
                      <DrilldownRow href={href} expanded={expanded} scroll={false}>
                        <td>{(page - 1) * data.pagination.limit + i + 1}</td>
                        <td>
                          <Link href={href} scroll={false}>
                            {s.enrollment_no}
                          </Link>
                        </td>
                        <td>
                          <Link
                            href={href}
                            scroll={false}
                            aria-expanded={expanded}
                            aria-controls={
                              expanded ? `details-${s.id}` : undefined
                            }
                          >
                            {s.full_name}{" "}
                            <span aria-hidden="true">
                              {expanded ? "−" : "+"}
                            </span>
                          </Link>
                        </td>
                        <td>
                          {data.genderAvailable
                            ? (s.gender ?? "—")
                            : "Restricted"}
                        </td>
                        <td>{s.current_semester ?? "—"}</td>
                        <td>{s.current_batch ?? "—"}</td>
                        <td>{s.admission_quota ?? "—"}</td>
                        <td title={s.cgpa ?? "Not recorded"}>
                          {formatCgpa(s.cgpa)}
                        </td>
                        <td>{formatCgpa(s.sgpa)}</td>
                        <td>
                          {s.attendance === null ? "—" : `${s.attendance}%`}
                        </td>
                        <td>{s.current_backlog ?? "—"}</td>
                        <td>{s.status ?? "—"}</td>
                        <td>{placementStatus(s.placement_eligible)}</td>
                      </DrilldownRow>
                      {expanded && detail && (
                        <tr id={`details-${s.id}`}>
                          <td colSpan={13} className="erp-detail-cell">
                            <ExpandedStudent student={detail} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="erp-empty">No students match these filters.</p>
        )}
        <div className="erp-pagination">
          <span>
            Page {page} of {pageCount} ·{" "}
            {data.pagination.total.toLocaleString("en-IN")} students
          </span>
          <div>
            {page > 1 && (
              <Link
                href={`${path}?${batchQuery(filters, { page: String(page - 1) })}`}
              >
                ← Previous
              </Link>
            )}
            {page < pageCount && (
              <Link
                href={`${path}?${batchQuery(filters, { page: String(page + 1) })}`}
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
