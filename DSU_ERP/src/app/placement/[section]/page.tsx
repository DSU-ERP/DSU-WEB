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
import { driveRequests } from "@/features/placement/lib/company";
import { initialNotifications } from "@/shared/notifications/server";
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
  // Home is scoped by passing-out batch only; branch and search live in Insights.
  const overviewQuery: Record<string, string> = query.batch ? { batch: query.batch } : {};
  const [data, charts, notices, pendingRequests] = await Promise.all([
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
    section === "overview" ? initialNotifications() : null,
    section === "overview"
      ? driveRequests({ status: "submitted" }).then(
          (list) => list.counts.submitted ?? 0,
          (error: unknown) => {
            if (!(error instanceof CampusError)) throw error;
            return null;
          },
        )
      : null,
  ]);
  if (section === "overview") return (
    <PlacementOverview
      data={data} charts={charts?.value ?? null} chartError={charts?.error} query={overviewQuery}
      notices={notices} pendingRequests={pendingRequests}
      environment={competencyTestingEnabled() ? "Testing · synthetic data" : process.env.NODE_ENV === "development" ? "Local · configured campus data" : undefined}
      today={new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
    />
  );
  return (
    <>
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
