import Link from "next/link";
import { notFound } from "next/navigation";
import { officerSession, placementRead } from "@/features/placement/lib/server";
import { text, type Report, type Row } from "@/features/placement/lib/types";
import { DeleteRecord } from "@/features/placement/components/Controls";
import { CompanyEditorForm } from "@/features/placement/components/CompanyEditorForm";
import { Metrics, Table } from "@/features/placement/components/UI";
import { CompanyAccessPanel } from "@/features/placement/components/CompanyRequests";
import { companyAccess } from "@/features/placement/lib/company";
export default async function CompanyEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await officerSession();
  const { id } = await params,
    newRecord = id === "new";
  if (!newRecord && !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  // A new company has no record to carry the campus options, so read them from the list.
  const company = newRecord ? {} : await placementRead<Row>("company", { id });
  const options = (newRecord
    ? (await placementRead<Report>("companies", { limit: "1" })).options
    : (company as Row & { options?: Report["options"] }).options) as Report["options"] | undefined;
  const departments = Array.isArray(options?.departments) ? options.departments : [];
  const [drives, access] = newRecord
    ? [null, null]
    : await Promise.all([
        placementRead<Report>("drives", { company: id, limit: "100" }),
        companyAccess(id).catch(() => null),
      ]);
  const rows = drives?.rows || [];
  const totals: Row = {
    drives: rows.length,
    openings: rows.reduce((sum, r) => sum + (Number(r.openings) || 0), 0),
    registered: rows.reduce((sum, r) => sum + (Number(r.registered) || 0), 0),
    selected: rows.reduce((sum, r) => sum + (Number(r.selected) || 0), 0),
    rounds: rows.reduce((sum, r) => sum + (Array.isArray(r.rounds) ? r.rounds.length : 0), 0),
  };
  return (
    <>
      <Link className="erp-back" href="/placement/companies">
        ← Companies
      </Link>
      <h1>{newRecord ? "Add a recruiting company." : text(company.name)}</h1>
      {!newRecord && (
        <>
          <Metrics data={totals} keys={["drives", "openings", "registered", "selected", "rounds"]} />
          <section className="erp-panel">
            <h2>Drives by this company</h2>
            {rows.length ? (
              <Table
                caption="Company drives"
                rows={rows}
                columns={[
                  { key: "title", title: "Role", link: (r) => `/placement/drives/${r.id}?from=company` },
                  { key: "job_category", title: "Job category" },
                  { key: "batch" },
                  { key: "package_lpa", title: "Package (LPA)", numeric: true },
                  { key: "category" },
                  { key: "status" },
                  {
                    key: "rounds",
                    title: "Rounds",
                    render: (r) => (Array.isArray(r.rounds) ? r.rounds.length : 0),
                  },
                  { key: "openings", numeric: true },
                  { key: "registered", numeric: true },
                  { key: "selected", numeric: true },
                ]}
              />
            ) : (
              <p className="erp-muted">No drives yet for this company.</p>
            )}
            <Link className="erp-secondary" href={`/placement/drives/new?company=${id}`}>
              Schedule a drive for this company +
            </Link>
          </section>
          {access && (
            <CompanyAccessPanel
              companyId={id}
              companyName={text(company.name)}
              defaultEmail={typeof company.hr_email === "string" ? company.hr_email : undefined}
              access={access}
            />
          )}
        </>
      )}
      <CompanyEditorForm company={company} newRecord={newRecord} departments={departments} />
      {!newRecord && (
        <DeleteRecord
          kind="company"
          record={company}
          back="/placement/companies"
        />
      )}
    </>
  );
}
