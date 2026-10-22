import Link from "next/link";
import { notFound } from "next/navigation";
import { officerSession, placementRead } from "@/features/placement/lib/server";
import { queryFrom, text, type Report, type Row } from "@/features/placement/lib/types";
import { DriveEditor } from "@/features/placement/components/DriveEditor";
import { DriveCreator } from "@/features/placement/components/DriveImport";
import { DriveCandidates } from "@/features/placement/components/DriveCandidates";
import { DeleteRecord } from "@/features/placement/components/Controls";
import { Metrics, Filters, Pagination } from "@/features/placement/components/UI";
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
  const raw = await searchParams;
  const query = queryFrom(raw);
  const preselected = typeof raw.company === "string" && /^[0-9a-f-]{36}$/i.test(raw.company) ? raw.company : undefined;
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
          <DriveCreator
            companies={companies.rows}
            options={companies.options}
            defaultCompany={preselected}
          />
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
        {drive.job_category ? ` · ${text(drive.job_category)}` : ""}
        {drive.employment_type ? ` · ${drive.employment_type === "internship-ppo" ? "Internship + PPO" : text(drive.employment_type)}` : ""}
      </p>
      {(() => {
        const counts = report.counts as Row;
        const openings = Number(counts.openings) || 0;
        const hired = Number(counts.placed) || 0;
        const rounds = Array.isArray(drive.rounds) ? drive.rounds.length : 0;
        return (
          <section className="erp-panel po-hiring">
            <h2>Hiring progress</h2>
            <p className="erp-muted">
              {openings
                ? `${hired} of ${openings} openings filled`
                : `${hired} placed · no opening count recorded`}
              {` · ${Number(counts.rounds_conducted) || 0} of ${rounds} rounds conducted`}
              {` · ${Number(counts.selected) || 0} selected · ${Number(counts.active_offers) || 0} active offers`}
            </p>
            {openings > 0 && (
              <progress max={openings} value={Math.min(hired, openings)} aria-label="Openings filled" />
            )}
          </section>
        );
      })()}
      <Metrics
        data={report.counts as Row}
        keys={[
          "eligible",
          "notified",
          "invited",
          "interested",
          "not-interested",
          "registered",
          "selected",
          "placed",
          "openings",
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
