import { redirect } from "next/navigation";
import { campusApi, membership } from "@/lib/campus-api";
import {
  analyticsFilters,
  filterQuery,
  type SearchParams,
} from "@/lib/analytics/filters";
import type { AnalyticsData } from "@/lib/analytics/types";
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
  if ((await membership()).role === "student") redirect("/portal");
  const filters = analyticsFilters(await searchParams);
  const { data } = await campusApi<{ data: AnalyticsData }>(
    `/analytics?${filterQuery(filters)}`,
  );
  return (
    <>
      <p className="erp-eyebrow">STUDENT ANALYTICS</p>
      <div className="erp-page-heading">
        <div>
          <h1>A clear view of student progress.</h1>
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
      <DataQuality summary={data.summary} />
      <Distribution summary={data.summary} />
    </>
  );
}
