import Link from "next/link";
import { notFound } from "next/navigation";
import { officerSession, placementRead } from "@/lib/placement/server";
import { queryFrom, text, type Report, type Row } from "@/lib/placement/types";
import { DriveEditor } from "@/components/placement/DriveEditor";
import { DriveCandidates } from "@/components/placement/DriveCandidates";
import { DeleteRecord } from "@/components/placement/Controls";
import { Metrics, Filters, Pagination } from "@/components/placement/UI";
export default async function DrivePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await officerSession();
  const { id } = await params;
  if (id !== "new" && !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const query = queryFrom(await searchParams);
  const companies = await placementRead<Report>("companies", {
    active: "true",
    limit: "100",
  });
  for (
    let page = 2;
    page <= Math.ceil(companies.pagination.total / 100);
    page++
  ) {
    const more = await placementRead<Report>("companies", {
      active: "true",
      limit: "100",
      page: String(page),
    });
    companies.rows.push(...more.rows);
  }
  if (id === "new")
    return (
      <>
        <Link className="erp-back" href="/placement/drives">
          ← Drives
        </Link>
        <h1>Create a placement drive.</h1>
        {companies.rows.length ? (
          <section className="erp-panel">
            <DriveEditor
              companies={companies.rows}
              options={companies.options}
            />
          </section>
        ) : (
          <p>
            Add an active recruiting company before creating a drive.{" "}
            <Link href="/placement/companies/new">Add company ↗</Link>
          </p>
        )}
      </>
    );
  const report = await placementRead<Report>("drive", { ...query, id }),
    drive = report.drive as Row;
  if (!companies.rows.some((c) => c.id === drive.company_id))
    companies.rows.unshift({
      id: drive.company_id,
      name: `${report.company} (inactive)`,
    });
  return (
    <>
      <Link className="erp-back" href="/placement/drives">
        ← Drives
      </Link>
      <p className="erp-eyebrow">{text(report.company)}</p>
      <h1>{text(drive.title)}</h1>
      <p className="erp-muted">
        Batch {text(drive.batch)} · {text(drive.package_lpa)} LPA ·{" "}
        {text(drive.status)}
      </p>
      <Metrics
        data={report.counts as Row}
        keys={[
          "eligible",
          "invited",
          "interested",
          "not-interested",
          "registered",
          "selected",
        ]}
      />
      <details className="erp-panel">
        <summary>Edit drive, dates, rounds and eligibility</summary>
        <DriveEditor
          drive={drive}
          companies={companies.rows}
          options={report.options}
        />
      </details>
      <Filters
        path={`drives/${id}`}
        query={query}
        fields={[
          { key: "search" },
          {
            key: "pool",
            title: "Student pool",
            options: [
              "eligible",
              "invited",
              "interested",
              "not-interested",
              "registered",
              "selected",
              "blocked",
            ],
          },
          {
            key: "round",
            title: "Current round",
            options: (drive.rounds as string[]).map((_, i) => String(i + 1)),
          },
        ]}
      />
      <section className="erp-panel">
        <DriveCandidates
          key={JSON.stringify(report.rows)}
          drive={drive}
          rows={report.rows}
        />
        <Pagination report={report} path={`drives/${id}`} query={query} />
      </section>
      <DeleteRecord kind="drive" record={drive} back="/placement/drives" />
    </>
  );
}
