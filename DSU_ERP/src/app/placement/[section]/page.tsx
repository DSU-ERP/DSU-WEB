import Link from "next/link";
import { notFound } from "next/navigation";
import {
  officerSession,
  placementOverviewCharts,
  placementRead,
} from "@/features/placement/lib/server";
import { CampusError } from "@/shared/http/errors";
import type { OverviewCharts as ChartsData } from "@/features/placement/lib/intelligence";
import { PlacementOverview } from "@/features/placement/components/Overview";
import { competencyTestingEnabled } from "@/features/competency/server";
import {
  SECTIONS,
  queryFrom,
  type Section,
  type Report,
} from "@/features/placement/lib/types";
import { ReportBody, ReportFilters } from "@/features/placement/components/Reports";
import { Refresh } from "@/features/placement/components/Controls";
export default async function PlacementSection({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await officerSession();
  const { section } = await params;
  if (!Object.hasOwn(SECTIONS, section)) notFound();
  const config = SECTIONS[section as Section],
    query = queryFrom(await searchParams);
  // Use one cohort scope for both report and chart aggregation.
  const overviewQuery = Object.fromEntries(["batch", "department", "search"].flatMap(key => query[key] ? [[key, query[key]]] : []));
  const [data, charts] = await Promise.all([
    placementRead<Report>(config.resource, section === "overview" ? overviewQuery : query),
    section === "overview"
      ? placementOverviewCharts(overviewQuery).then(
          (value): { value: ChartsData | null; error?: string } => ({ value }),
          (error: unknown) => {
            if (!(error instanceof CampusError)) throw error;
            return { value: null, error: error.message };
          },
        )
      : null,
  ]);
  if (section === "overview") return <PlacementOverview
    data={data} charts={charts?.value ?? null} chartError={charts?.error} query={overviewQuery}
    environment={competencyTestingEnabled() ? "Testing · synthetic data" : process.env.NODE_ENV === "development" ? "Local · configured campus data" : undefined}
    today={new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
  />;
  return (
    <>
      <p className="erp-eyebrow">DSU / PLACEMENT OFFICER</p>
      <div className="po-heading">
        <div>
          <h1>{config.title}</h1>
          <p className="erp-muted">
            {query.batch
              ? `Passing-out batch ${query.batch}`
              : "Your placement workspace"}{" "}
            · Recorded university data
          </p>
        </div>
        <div className="po-actions">
          <Refresh />
          {section === "companies" && (
            <Link className="erp-primary" href="/placement/companies/new">
              Add company +
            </Link>
          )}
          {section === "drives" && (
            <Link className="erp-primary" href="/placement/drives/new">
              Create drive +
            </Link>
          )}
          {(section === "batch" || section === "offers") && (
            <a
              className="erp-secondary"
              href={`/placement/export/${config.resource}?${new URLSearchParams(query)}`}
            >
              Export CSV ↓
            </a>
          )}
        </div>
      </div>
      <ReportFilters section={section as Section} data={data} query={query} />
      <ReportBody section={section as Section} data={data} query={query} />
    </>
  );
}
