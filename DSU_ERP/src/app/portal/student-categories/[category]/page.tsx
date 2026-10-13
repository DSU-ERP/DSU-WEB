import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { campusApi, CampusError, membership } from "@/lib/campus-api";
import {
  analyticsFilters,
  filterQuery,
  selectedPage,
  formatCgpa,
  formatCount,
  formatPercent,
  type SearchParams,
} from "@/lib/analytics/filters";
import type { CategoryData } from "@/lib/analytics/types";
import { AnalyticsFilters } from "@/components/analytics/AnalyticsViews";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const access = await membership();
  if (access.role === "student") redirect("/portal");
  const { category } = await params;
  const search = await searchParams;
  const filters = analyticsFilters(search);
  const query = filterQuery(filters);
  query.set("page", String(selectedPage(search.page)));
  query.set("limit", "25");
  let data: CategoryData;
  try {
    data = (
      await campusApi<{ data: CategoryData }>(
        `/student-categories/${encodeURIComponent(category)}?${query}`,
      )
    ).data;
  } catch (error) {
    if (error instanceof CampusError && error.status === 404) notFound();
    throw error;
  }
  const stats = data.summary.categories.find(
    (item) => item.id === data.category.id,
  )!;
  const path = `/portal/student-categories/${data.category.id}`;
  const pageLink = (page: number) => {
    const next = filterQuery(filters);
    next.set("page", String(page));
    return `${path}?${next}`;
  };
  const pages = Math.max(
    1,
    Math.ceil(data.pagination.total / data.pagination.limit),
  );
  return (
    <>
      <Link
        className="erp-back"
        href={`/portal/analytics?${filterQuery(filters)}`}
      >
        ← Student Analytics
      </Link>
      <p className="erp-eyebrow">STUDENT CATEGORY</p>
      <div className="erp-page-heading">
        <div>
          <h1>{data.category.name}</h1>
          <p>
            {data.category.conditionLabel} · {formatCount(stats.count)} students
            · {formatPercent(stats.percentage)} of selected cohort
          </p>
        </div>
        {access.role === "admin" && (
          <a
            className="erp-secondary"
            href={`${path}/export?${filterQuery(filters)}`}
          >
            Export CSV ↗
          </a>
        )}
      </div>
      <AnalyticsFilters filters={filters} options={data.options} path={path} />
      <section className="erp-panel">
        <div className="erp-section-heading">
          <h2>Ranked by stored CGPA</h2>
          <span className="erp-muted">
            Average CGPA: {formatCgpa(stats.averageCgpa)}
          </span>
        </div>
        <p className="erp-muted">
          Equal CGPAs share rank; USN then student ID determine display order.
          Display rounding never changes membership or ranking.
        </p>
        {data.students.length ? (
          <div
            className="erp-table-scroll"
            role="region"
            aria-label={`${data.category.name} students`}
            tabIndex={0}
          >
            <table className="erp-table erp-ranked-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Student / USN</th>
                  <th>Department</th>
                  <th>Batch</th>
                  <th>CGPA</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((student) => (
                  <tr key={student.id}>
                    <td>{student.rank}</td>
                    <td>
                      <Link href={`/portal/students/${student.id}`}>
                        {student.full_name}
                        <small>{student.enrollment_no}</small>
                      </Link>
                    </td>
                    <td>{student.department_short_name || "—"}</td>
                    <td>{student.source_batch}</td>
                    <td title={`Stored CGPA: ${student.cgpa}`}>
                      {formatCgpa(student.cgpa)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="erp-empty">
            No students in this category match the selected filters.
          </p>
        )}
        <div className="erp-pagination">
          <span>
            Page {data.pagination.page} of {pages}
          </span>
          <div>
            {data.pagination.page > 1 && (
              <Link href={pageLink(data.pagination.page - 1)}>← Previous</Link>
            )}
            {data.pagination.page < pages && (
              <Link href={pageLink(data.pagination.page + 1)}>Next →</Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
