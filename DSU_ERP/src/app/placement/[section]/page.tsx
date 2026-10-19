import Link from "next/link";
import { notFound } from "next/navigation";
import { officerSession, placementRead } from "@/features/placement/lib/server";
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
  const data = await placementRead<Report>(config.resource, query);
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
