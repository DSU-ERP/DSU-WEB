import Link from "next/link";
import { redirect } from "next/navigation";
import { campusApi, membership } from "@/lib/campus-api";
import {
  analyticsFilters,
  filterQuery,
  formatCgpa,
  formatCount,
  type SearchParams,
} from "@/lib/analytics/filters";
import type { BatchData } from "@/lib/analytics/types";
import {
  AnalyticsFilters,
  DataQuality,
} from "@/components/analytics/AnalyticsViews";

export default async function BatchAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if ((await membership()).role === "student") redirect("/portal");
  const filters = analyticsFilters(await searchParams);
  const { data } = await campusApi<{ data: BatchData }>(
    `/batch-analytics?${filterQuery(filters)}`,
  );
  return (
    <>
      <p className="erp-eyebrow">BATCH ANALYTICS</p>
      <div className="erp-page-heading">
        <div>
          <h1>Progress, across every batch.</h1>
          <p>
            Compare cohort sizes, average CGPA, and student performance using
            the same classification rules.
          </p>
        </div>
      </div>
      <AnalyticsFilters
        filters={filters}
        options={data.options}
        path="/portal/batch-analytics"
      />
      <div className="erp-metrics">
        <article>
          <span>Selected students</span>
          <strong>{formatCount(data.summary.total)}</strong>
        </article>
        <article>
          <span>Average valid CGPA</span>
          <strong>{formatCgpa(data.summary.averageCgpa)}</strong>
        </article>
        <article>
          <span>Matching batches</span>
          <strong>{formatCount(data.batches.length)}</strong>
        </article>
      </div>
      <section className="erp-panel">
        <h2>Batch comparison</h2>
        {data.batches.length ? (
          <div
            className="erp-table-scroll"
            role="region"
            aria-label="Batch comparison"
            tabIndex={0}
          >
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Students</th>
                  <th>Average CGPA</th>
                  {data.summary.categories.map((category) => (
                    <th key={category.id} title={category.conditionLabel}>
                      {category.name}
                    </th>
                  ))}
                  <th>Unclassified</th>
                </tr>
              </thead>
              <tbody>
                {data.batches.map((batch) => (
                  <tr key={batch.source_batch}>
                    <td>
                      <Link
                        href={`/portal/analytics?${filterQuery({ ...filters, batch: batch.source_batch })}`}
                      >
                        {batch.source_batch} ↗
                      </Link>
                    </td>
                    <td>{formatCount(batch.total)}</td>
                    <td>{formatCgpa(batch.average)}</td>
                    {data.summary.categories.map((category) => (
                      <td key={category.id}>
                        {formatCount(batch[category.id])}
                      </td>
                    ))}
                    <td>{formatCount(batch.unclassified)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="erp-empty">No students match these filters.</p>
        )}
      </section>
      <DataQuality summary={data.summary} />
    </>
  );
}
