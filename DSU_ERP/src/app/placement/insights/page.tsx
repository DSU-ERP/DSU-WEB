import { officerSession, placementOverviewCharts, placementRead } from "@/features/placement/lib/server";
import { CampusError } from "@/shared/http/errors";
import type { OverviewCharts } from "@/features/placement/lib/intelligence";
import { PlacementInsights } from "@/features/placement/components/Insights";
import { competencyTestingEnabled } from "@/features/competency/server";
import { queryFrom, type Report } from "@/features/placement/lib/types";

export const metadata = { title: "Insights · DSU Placements" };

// Insights › Summary: cohort analytics filtered by batch, branch and student.
export default async function InsightsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await officerSession();
  const query = queryFrom(await searchParams);
  const scope = Object.fromEntries(["batch", "department", "search"].flatMap(key => query[key] ? [[key, query[key]]] : []));
  const [data, charts] = await Promise.all([
    placementRead<Report>("overview", scope),
    placementOverviewCharts(scope).then(
      (value): { value: OverviewCharts | null; error?: string } => ({ value }),
      (error: unknown) => {
        if (!(error instanceof CampusError)) throw error;
        return { value: null, error: error.message };
      },
    ),
  ]);
  return (
    <PlacementInsights
      data={data} charts={charts.value} chartError={charts.error} query={scope}
      environment={competencyTestingEnabled() ? "Testing · synthetic data" : process.env.NODE_ENV === "development" ? "Local · configured campus data" : undefined}
    />
  );
}
