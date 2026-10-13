import { redirect } from "next/navigation";
import Link from "next/link";
import { campusApi, membership } from "@/lib/campus-api";
import {
  analyticsFilters,
  filterQuery,
  type SearchParams,
} from "@/lib/analytics/filters";
import type { AnalyticsData } from "@/lib/analytics/types";
import type { BatchView } from "@/lib/analytics/batches";
import { DepartmentBreakdown } from "@/components/analytics/DepartmentBreakdown";
import {
  AnalyticsFilters,
  CategoryPanels,
  DataQuality,
  Distribution,
} from "@/components/analytics/AnalyticsViews";

export default async function StudentAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const access = await membership();
  if (access.role === "student") redirect("/portal");
  const filters = analyticsFilters(await searchParams);
  const [{ data }, batchResult] = await Promise.all([
    campusApi<{ data: AnalyticsData }>(`/analytics?${filterQuery(filters)}`),
    filters.batch
      ? campusApi<{ data: BatchView }>(`/batches?${filterQuery(filters)}`)
      : Promise.resolve(null),
  ]);
  return (
    <>
      {filters.batch && (
        <Link className="erp-back" href="/portal/batch-analytics">
          ← Batch comparison
        </Link>
      )}
      <p className="erp-eyebrow">STUDENT ANALYTICS</p>
      <div className="erp-page-heading">
        <div>
          <h1>
            {filters.batch
              ? `Batch ${filters.batch}. Every student, in view.`
              : "A clear view of student progress."}
          </h1>
          <p>
            Three performance categories. One consistent view of the selected
            cohort.
          </p>
        </div>
      </div>
      <AnalyticsFilters
        filters={filters}
        options={data.options}
        path="/portal/analytics"
      />
      <CategoryPanels summary={data.summary} filters={filters} />
      {batchResult && (
        <DepartmentBreakdown
          data={batchResult.data}
          filters={filters}
          canExport={access.role === "admin"}
        />
      )}
      <DataQuality summary={data.summary} />
      <Distribution summary={data.summary} />
    </>
  );
}
