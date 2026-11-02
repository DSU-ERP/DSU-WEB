import Link from "next/link";
import { notFound } from "next/navigation";
import { officerSession, placementRead } from "@/features/placement/lib/server";
import { JOB_CATEGORIES, text, type Report, type Row } from "@/features/placement/lib/types";
import { ChangeForm, DeleteRecord } from "@/features/placement/components/Controls";
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
  const company = newRecord ? {} : await placementRead<Row>("company", { id });
  const [drives, access] = newRecord
    ? [null, null]
    : await Promise.all([
        placementRead<Report>("drives", { company: id, limit: "100" }),
        companyAccess(id).catch(() => null),
      ]);
  const fields = [
    ["name", "Company name", "text"],
    ["short_name", "Short name", "text"],
    ["industry", "Industry", "text"],
    ["headquarters", "Headquarters / location", "text"],
    ["website", "Website", "url"],
    ["hr_name", "HR contact name", "text"],
    ["hr_email", "HR email", "email"],
    ["hr_phone", "HR phone", "tel"],
  ];
  const chosen = new Set(
    Array.isArray(company.job_categories) ? company.job_categories.map(String) : [],
  );
  const categories = [...new Set([...JOB_CATEGORIES, ...chosen])];
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
                  { key: "title", title: "Role", link: (r) => `/placement/drives/${r.id}` },
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
      <section className="erp-panel">
        <h2>{newRecord ? "Company details" : "Edit company details"}</h2>
        <ChangeForm
          action="company.save"
          base={newRecord ? {} : { id, revision: company.revision }}
          destination="/placement/companies"
        >
          <div className="po-split">
            {fields.map(([key, title, type]) => (
              <label key={key}>
                {title}
                <input
                  name={key}
                  type={type}
                  defaultValue={String(company[key] || "")}
                  required={key === "name"}
                  maxLength={
                    key === "hr_phone"
                      ? 40
                      : key === "short_name"
                        ? 50
                        : key === "industry"
                          ? 100
                          : 200
                  }
                />
              </label>
            ))}
          </div>
          <label>
            Roles they hire for
            <textarea
              name="hiring_roles"
              maxLength={1000}
              placeholder="e.g. Software engineer, Data analyst, Graduate engineer trainee"
              defaultValue={String(company.hiring_roles || "")}
            />
          </label>
          <fieldset className="po-checks">
            <legend>Job categories</legend>
            <input type="hidden" name="job_categories_present" value="1" />
            {categories.map((value) => (
              <label key={value} className="po-checkbox">
                <input
                  type="checkbox"
                  name="job_categories"
                  value={value}
                  defaultChecked={chosen.has(value)}
                />
                {value}
              </label>
            ))}
          </fieldset>
          <label>
            About the company
            <textarea
              name="about"
              maxLength={4000}
              placeholder="What the company does, locations, notes from past visits…"
              defaultValue={String(company.about || "")}
            />
          </label>
          <input type="hidden" name="active_present" value="true" />
          <label className="po-checkbox">
            <input
              type="checkbox"
              name="active"
              defaultChecked={newRecord || company.active === true}
            />
            Active recruiting company
          </label>
        </ChangeForm>
      </section>
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
