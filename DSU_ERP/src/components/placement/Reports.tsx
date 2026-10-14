import {
  Facts,
  Filters,
  Metrics,
  Pagination,
  Table,
  offerColumns,
  type Column,
  type Filter,
} from "./UI";
import {
  href,
  label,
  number,
  text,
  PACKAGES,
  STATUSES,
  type Query,
  type Report,
  type Row,
  type Section,
} from "@/lib/placement/types";
const rows = (value: unknown): Row[] =>
  Array.isArray(value) ? (value as Row[]) : [];
const numeric = (keys: string[]): Column[] =>
  keys.map((key) => ({ key, numeric: true }));
export function ReportFilters({
  section,
  data,
  query,
}: {
  section: Section;
  data: Report;
  query: Query;
}) {
  const fields: Filter[] = [{ key: "search" }];
  if (section !== "companies")
    fields.push({
      key: "batch",
      title: "Passing-out batch",
      options: data.options.batches,
    });
  if (!["companies", "drives", "overview", "company-reports"].includes(section))
    fields.push({
      key: "department",
      title: "Branch",
      options: data.options.departments,
    });
  if (section === "companies")
    fields.push(
      { key: "industry", options: data.options.industries },
      { key: "active", options: ["true", "false"] },
    );
  if (section === "drives")
    fields.push(
      { key: "status", options: STATUSES },
      { key: "package", title: "Package category", options: PACKAGES },
    );
  if (section === "tests")
    fields.push(
      { key: "classification", options: ["Basic", "Medium", "Advanced"] },
      {
        key: "violation",
        title: "Review indicators",
        options: ["flagged", "auto-submitted", "clean"],
      },
    );
  return <Filters path={section} query={query} fields={fields} />;
}
export function ReportBody({
  section,
  data,
  query,
}: {
  section: Section;
  data: Report;
  query: Query;
}) {
  const list = data.rows || [];
  if (section === "overview")
    return (
      <>
        <Metrics
          data={data.summary}
          keys={[
            "students",
            "placed",
            "unplaced",
            "placement_percentage",
            "average",
            "highest",
            "median",
            "offers",
            "drives",
            "companies",
          ]}
        />
        <p className="po-note">
          Packages are in LPA. Placed students have an active offered or
          accepted offer; declined and revoked offers remain in history.
        </p>
        <div className="po-split">
          <section className="erp-panel">
            <h2>Drive stages</h2>
            <Table
              caption="Drive statuses"
              rows={rows(data.drive_statuses)}
              columns={[{ key: "status" }, ...numeric(["count"])]}
            />
          </section>
          <section className="erp-panel">
            <h2>Placement categories</h2>
            <Table
              caption="Package distribution"
              rows={rows(data.categories)}
              columns={[{ key: "category" }, ...numeric(["offers"])]}
            />
          </section>
        </div>
        <section className="erp-panel">
          <h2>Department comparison</h2>
          <Table
            caption="Department placement comparison"
            rows={rows(data.departments)}
            columns={[
              { key: "department", title: "Branch" },
              ...numeric([
                "total",
                "placed",
                "placement_percentage",
                "average",
                "highest",
              ]),
            ]}
          />
        </section>
        <section className="erp-panel">
          <h2>Leading recruiting companies</h2>
          <Table
            caption="Leading companies"
            rows={rows(data.companies)
              .filter((r) => Number(r.offers) > 0)
              .slice(0, 10)}
            columns={[
              {
                key: "name",
                link: (r) =>
                  href("company-reports", query, { search: String(r.name) }),
              },
              ...numeric(["drives", "offers", "hired", "accepted", "average"]),
            ]}
          />
        </section>
        <section className="erp-panel">
          <h2>Recent placements</h2>
          <Table
            caption="Recent offers"
            rows={rows(data.recent)}
            columns={offerColumns}
          />
        </section>
        <section className="erp-panel">
          <h2>Upcoming & ongoing drives</h2>
          <Table
            caption="Scheduled drives"
            rows={rows(data.scheduled)}
            columns={[
              { key: "title", link: (r) => `/placement/drives/${r.id}` },
              { key: "company" },
              { key: "drive_date" },
              { key: "registration_deadline" },
              { key: "status" },
            ]}
          />
        </section>
      </>
    );
  if (section === "companies")
    return (
      <section className="erp-panel">
        <Table
          caption="Recruiting companies"
          rows={list}
          columns={[
            { key: "name", link: (r) => `/placement/companies/${r.id}` },
            { key: "short_name" },
            { key: "industry" },
            {
              key: "website",
              render: (r) =>
                typeof r.website === "string" &&
                /^https?:\/\//.test(r.website) ? (
                  <a href={r.website} target="_blank" rel="noopener noreferrer">
                    Website ↗
                  </a>
                ) : (
                  "—"
                ),
            },
            { key: "hr_name", title: "HR contact" },
            { key: "hr_email" },
            { key: "hr_phone" },
            {
              key: "active",
              render: (r) => (r.active ? "Active" : "Inactive"),
            },
            ...numeric(["drives", "offers"]),
          ]}
        />
        <Pagination report={data} path={section} query={query} />
      </section>
    );
  if (section === "drives")
    return (
      <section className="erp-panel">
        <Table
          caption="Placement drives"
          rows={list}
          columns={[
            {
              key: "title",
              title: "Role",
              link: (r) => `/placement/drives/${r.id}`,
            },
            { key: "company" },
            { key: "batch" },
            { key: "package_lpa", title: "Package (LPA)", numeric: true },
            { key: "category" },
            { key: "drive_date" },
            { key: "registration_deadline" },
            { key: "status" },
            ...numeric(["registered", "selected"]),
          ]}
        />
        <Pagination report={data} path={section} query={query} />
      </section>
    );
  if (section === "company-reports") {
    const companies = rows(data.companies).filter(r => !query.search || String(r.name).toLowerCase().includes(query.search.toLowerCase()));
    const summary: Row = {companies: companies.filter(r => Number(r.drives)>0).length};
    for (const metric of ["drives","offers","accepted"]) summary[metric] = companies.reduce((total,r)=>total+Number(r[metric]||0),0);
    return (
      <>
        <Metrics
          data={summary}
          keys={["companies", "drives", "offers", "accepted"]}
        />
        <section className="erp-panel">
          <Table
            caption="Company recruitment performance"
            rows={companies}
            columns={[
              {
                key: "name",
                link: (r) =>
                  href("drives", query, {
                    company: String(r.id),
                    search: undefined,
                  }),
              },
              ...numeric([
                "drives",
                "registered",
                "selected",
                "selection_percentage",
                "offers",
                "hired",
                "accepted",
                "acceptance_percentage",
                "average",
                "highest",
                "regular",
                "dream",
                "super_dream",
                "mega",
              ]),
            ]}
          />
        </section>
      </>
    );
  }
  if (section === "batch")
    return (
      <>
        <Metrics
          data={data.summary}
          keys={["students", "valid", "unclassified", "average", "eligible"]}
        />
        <div className="po-card-grid">
          {rows(data.categories).map((c) => (
            <article key={text(c.id)} className="po-card">
              <h2>{text(c.name)}</h2>
              <p className="erp-muted">{text(c.conditionLabel)}</p>
              <strong>{number(c.count)}</strong>
              <p>{number(c.percentage, 1)}% of selected cohort</p>
              <Facts
                data={{
                  average_cgpa: c.average,
                  eligible_students: c.eligible,
                  eligibility_percentage: Number(c.count)
                    ? (100 * Number(c.eligible)) / Number(c.count)
                    : 0,
                }}
              />
              <div className="po-actions">
                <a
                  href={href("export/students", query, {
                    category: String(c.id),
                    page: undefined,
                  })}
                >
                  Export CSV ↓
                </a>
              </div>
            </article>
          ))}
        </div>
        <p className="po-note">
          Baseline eligible: {data.options.policy.label}. Missing or invalid
          CGPA is unclassified.
        </p>
        <section className="erp-panel">
          <h2>Branch breakdown</h2>
          <Table
            caption="Batch academic summary"
            rows={list}
            columns={[
              { key: "department", title: "Branch" },
              ...numeric([
                "total",
                "male",
                "female",
                "other_gender",
                "dsat",
                "cet",
                "comedk",
                "unigauge",
                "dcet",
                "management",
                "other_quota",
                "at_least_six",
                "below_six",
                "eligible",
                "not_eligible",
                "unclassified",
                "average",
              ]),
            ]}
          />
        </section>
        <section className="erp-panel">
          <h2>CGPA distribution</h2>
          <Table
            caption="CGPA statistical bands"
            rows={rows(data.distribution)}
            columns={[{ key: "band" }, ...numeric(["total"])]}
          />
        </section>
      </>
    );
  if (section === "tests")
    return (
      <>
        <Metrics
          data={data.summary}
          keys={[
            "participants",
            "average_score",
            "average_percentage",
            "flagged",
            "auto_submitted",
          ]}
        />
        <p className="po-note">
          Scores use the latest completed attempt per tier, ordered by
          completion time. Recorded security indicators identify attempts for
          review; they do not establish misconduct. Test classifications are
          separate from academic CGPA categories.
        </p>
        <section className="erp-panel">
          <Table
            caption="Completed placement assessments"
            rows={list}
            columns={[
              { key: "rank", numeric: true },
              {
                key: "usn",
                title: "USN",
                link: (r) => `/placement/students/${r.id}`,
              },
              { key: "name" },
              { key: "department" },
              ...numeric([
                "combined_score",
                "maximum_score",
                "percentage",
                "time_seconds",
              ]),
              { key: "qualified_tier2", title: "Tier 2 qualified" },
              { key: "classification" },
              { key: "flagged", title: "Flagged for review" },
              { key: "auto_submitted" },
            ]}
            details={(r) => (
              <>
                {rows(r.attempts).map((a) => (
                  <section key={text(a.id)}>
                    <h3>
                      {text(a.assessment_name)} · Tier {text(a.tier)}
                    </h3>
                    <Facts
                      data={{
                        score: a.score,
                        max_score: a.max_score,
                        time_seconds: a.time_seconds,
                        completed_at: a.completed_at,
                        ...(a.indicators as Row),
                      }}
                    />
                  </section>
                ))}
              </>
            )}
          />
          <Pagination report={data} path={section} query={query} />
        </section>
      </>
    );
  return null;
}
