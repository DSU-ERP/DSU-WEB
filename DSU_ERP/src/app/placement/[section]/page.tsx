import Link from "next/link";
import { notFound } from "next/navigation";
import { officerSession, placementRead } from "@/lib/placement/server";
import {
  SECTIONS,
  queryFrom,
  type Section,
  type Report,
} from "@/lib/placement/types";
import { ReportBody, ReportFilters } from "@/components/placement/Reports";
import { Refresh } from "@/components/placement/Controls";
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
          {["batch", "categories", "students", "offers", "talent"].includes(
            section,
          ) && (
            <a
              className="erp-secondary"
              href={`/placement/export/${section === "categories" ? "students" : config.resource}?${new URLSearchParams(query)}`}
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
