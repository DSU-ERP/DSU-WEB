import Link from "next/link";
import { ChangeForm } from "./Controls";
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
} from "@/features/placement/lib/types";
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
  if (["offers", "departments"].includes(section))
    fields.push(
      {
        key: "status",
        title: "Offer status",
        options: ["offered", "accepted", "declined", "revoked"],
      },
      { key: "package", title: "Package category", options: PACKAGES },
      {
        key: "inactive",
        title: "Include inactive offers",
        options: ["true", "false"],
        defaultValue: section === "offers" ? "true" : "false",
      },
    );
  if (section === "offers")
    fields.push({ key: "department", title: "Branch", options: data.options.departments });
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
              { key: "department", title: "Branch", link: r => href("batch", query, {department:String(r.department ?? "__missing__"),page:undefined}) },
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
            {
              key: "job_categories",
              title: "Hires for",
              render: (r) =>
                Array.isArray(r.job_categories) && r.job_categories.length
                  ? r.job_categories.join(", ")
                  : "—",
            },
            { key: "hr_name", title: "HR contact" },
            { key: "hr_email" },
            { key: "hr_phone" },
            {
              key: "active",
              render: (r) => (r.active ? "Active" : "Inactive"),
            },
            ...numeric(["drives", "openings", "selected", "offers"]),
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
            { key: "job_category", title: "Job category" },
            {
              key: "employment_type",
              title: "Type",
              render: (r) => label(String(r.employment_type || "")) || "—",
            },
            { key: "batch" },
            { key: "package_lpa", title: "Package (LPA)", numeric: true },
            { key: "category" },
            { key: "drive_date" },
            { key: "registration_deadline" },
            { key: "status" },
            ...numeric(["openings", "registered", "selected"]),
          ]}
        />
        <Pagination report={data} path={section} query={query} />
      </section>
    );
  if (section === "offers")
    return (
      <>
        <Metrics
          data={{
            offers: data.pagination?.total ?? list.length,
            accepted: list.filter((r) => r.status === "accepted").length,
            active: list.filter((r) => ["offered", "accepted"].includes(String(r.status))).length,
          }}
          keys={["offers", "accepted", "active"]}
        />
        <section className="erp-panel">
          <Table
            caption="Placement offers"
            rows={list}
            columns={offerColumns}
            details={(r) =>
              ["offered", "accepted"].includes(String(r.status)) ? (
                <ChangeForm
                  action="offer.decide"
                  base={{ id: r.id, revision: r.revision }}
                  submit="Record decision"
                >
                  <label>
                    Decision
                    <select name="status">
                      {(r.status === "offered"
                        ? ["accepted", "declined", "revoked"]
                        : ["revoked"]
                      ).map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                </ChangeForm>
              ) : (
                <p>This offer is kept as inactive history.</p>
              )
            }
          />
          <p className="po-note">
            Accepted and offered offers are active. Declined and revoked offers
            stay in the history and no longer count toward a student&apos;s
            placement category.
          </p>
          <Pagination report={data} path={section} query={query} />
        </section>
      </>
    );
  if (section === "departments") {
    const departments = rows(data.departments);
    return (
      <>
        <div className="po-card-grid">
          {["placement_percentage", "average", "median", "highest"].map(
            (metric) => {
              const leader = departments
                .filter((d) => d[metric] !== null && d[metric] !== undefined)
                .sort(
                  (a, b) =>
                    Number(b[metric]) - Number(a[metric]) ||
                    text(a.department).localeCompare(text(b.department)),
                )[0];
              return (
                <article key={metric} className="po-card">
                  <p className="erp-muted">Leading {label(metric)}</p>
                  <h2>{text(leader?.department)}</h2>
                  <strong>{number(leader?.[metric], 2)}</strong>
                </article>
              );
            },
          )}
        </div>
        <section className="erp-panel">
          <Table
            caption="Department placement intelligence"
            rows={departments}
            columns={[
              {
                key: "department",
                title: "Branch",
                render: (r) => (
                  <Link
                    href={href("offers", query, {
                      department:
                        typeof r.department === "string" ? r.department : "__missing__",
                      page: undefined,
                    })}
                  >
                    {text(r.department)} ↗
                  </Link>
                ),
              },
              ...numeric([
                "total",
                "placed",
                "placement_percentage",
                "offers",
                "accepted",
                "offers_per_student",
                "acceptance_percentage",
                "minimum",
                "highest",
                "average",
                "median",
                "p75",
                "p90",
                "dream_and_above",
                "dream_share",
              ]),
              { key: "leading_company" },
            ]}
          />
          <p className="po-note">
            Packages are per recorded offer, in LPA. Select a branch to open its
            individual offer records. Filters also apply to the leaders above.
          </p>
        </section>
      </>
    );
  }
  if (section === "multiple-offers")
    return (
      <>
        <Metrics
          data={data.summary}
          keys={["students", "maximum_offers", "average_offers"]}
        />
        <section className="erp-panel">
          <Table
            caption="Students with multiple offers"
            rows={list}
            columns={[
              {
                key: "usn",
                title: "USN",
                link: (r) => `/placement/students/${r.student_id}`,
              },
              { key: "name" },
              { key: "department", title: "Branch" },
              ...numeric(["offers", "highest"]),
              { key: "current_category" },
            ]}
            details={(r) => (
              <Table
                caption="All offer history"
                rows={rows(r.history)}
                columns={offerColumns.filter(
                  (c) => !["usn", "name", "department"].includes(c.key),
                )}
              />
            )}
          />
          <p className="po-note">
            History includes declined and revoked offers, so not every offer
            listed is currently active or accepted.
          </p>
          <Pagination report={data} path={section} query={query} />
        </section>
      </>
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
              { key: "department", title: "Branch", link: row => href("batch", query, { department: String(row.department ?? "__missing__"), page: undefined }) },
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
