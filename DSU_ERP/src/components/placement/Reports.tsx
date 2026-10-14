import Link from "next/link";
import { ChangeForm } from "./Controls";
import {
  Facts,
  Filters,
  Metrics,
  Pagination,
  Table,
  offerColumns,
  studentColumns,
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
const branch = (query: Query, target = "students"): Column => ({
  key: "department",
  title: "Branch",
  render: (r) => (
    <Link
      href={href(target, query, {
        department:
          typeof r.department === "string" ? r.department : "__missing__",
        page: undefined,
      })}
    >
      {text(r.department)} ↗
    </Link>
  ),
});
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
        options: ["offered", "accepted", "declined", "revoked"],
      },
      { key: "package", options: PACKAGES },
      {
        key: "inactive",
        title: "Include inactive offers",
        options: ["true", "false"],
        defaultValue: section === "offers" ? "true" : "false",
      },
    );
  if (["students", "ranking"].includes(section))
    fields.push(
      { key: "minimum", title: "Minimum CGPA" },
      { key: "quota", options: data.options.quotas },
      {
        key: "category",
        options: ["advanced", "medium", "needs-improvement", "unclassified"],
      },
      {
        key: "eligibility",
        options: ["eligible", "ineligible", "unclassified"],
      },
      {
        key: "sort",
        options: ["cgpa", "name", "usn", "sgpa", "backlogs", "attendance"],
        defaultValue: "cgpa",
      },
      { key: "direction", options: ["desc", "asc"], defaultValue: "desc" },
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
  if (section === "talent")
    fields.push(
      { key: "readiness", options: ["job-ready", "mid-level", "entry-level"] },
      { key: "risk", options: ["low", "medium", "high"] },
      { key: "language" },
      {
        key: "missing",
        title: "Missing predictions only",
        options: ["true", "false"],
      },
      {
        key: "sort",
        options: ["points", "cgpa", "alignment", "name"],
        defaultValue: "points",
      },
      { key: "direction", options: ["desc", "asc"], defaultValue: "desc" },
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
              branch(query, "departments"),
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
  if (section === "offers")
    return (
      <section className="erp-panel">
        <Table
          caption="Placement offers"
          rows={list}
          columns={offerColumns}
          details={(r) => (
            <>
              {["offered", "accepted"].includes(String(r.status)) ? (
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
                <p>This offer is retained as inactive history.</p>
              )}
            </>
          )}
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
  if (section === "departments") {
    const departments = rows(data.departments);
    return (
      <>
        <div className="po-card-grid">
          {["placement_percentage", "average", "median", "highest"].map(
            (metric) => {
              const leader = departments
                .filter((d) => d[metric] !== null)
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
              branch(query, "offers"),
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
            Salary statistics are per recorded offer, in LPA. Selecting a branch
            opens the individual offer records. Filters also apply to department
            leaders.
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
              { key: "department" },
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
          <Pagination report={data} path={section} query={query} />
        </section>
      </>
    );
  if (["students", "ranking"].includes(section))
    return (
      <>
        <p className="po-note">
          Baseline eligible: {data.options.policy.label}. Ranking uses exact
          stored CGPA; ties share a rank. College and department ranks remain
          within the selected batch.
        </p>
        <section className="erp-panel">
          <Table
            caption={
              section === "ranking" ? "CGPA ranking" : "Student journeys"
            }
            rows={list}
            columns={[
              { key: "college_rank", title: "College rank", numeric: true },
              { key: "department_rank", title: "Branch rank", numeric: true },
              ...studentColumns,
              ...(section === "students"
                ? [
                    { key: "gender" },
                    { key: "quota" },
                    { key: "semester" },
                    { key: "class_batch" },
                  ]
                : []),
            ]}
          />
          <Pagination report={data} path={section} query={query} />
        </section>
      </>
    );
  if (["batch", "categories"].includes(section))
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
                <Link
                  href={href("students", query, {
                    category: String(c.id),
                    page: undefined,
                  })}
                >
                  View students ↗
                </Link>
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
              branch(query),
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
  if (["points", "github", "domain"].includes(section))
    return (
      <section className="erp-panel">
        <Table
          caption="Student points ranking"
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
            ...numeric(["academic", "github", "domain", "total_points"]),
            { key: "updated_at", title: "Last recorded" },
          ]}
          details={(r) => <Facts data={(r.breakdown as Row) || {}} />}
        />
        <Pagination report={data} path={section} query={query} />
        <p className="po-note">
          Only recorded scores are ranked. Refresh retrieves the latest stored
          observations.
        </p>
      </section>
    );
  if (section === "talent")
    return (
      <>
        <Metrics
          data={data.summary}
          keys={["students", "predictions", "missing", "high_risk"]}
        />
        <p className="po-note">
          These are existing career predictions, not new assessments. Use them
          to support individual guidance; they do not determine placement
          eligibility.
        </p>
        <div className="po-split">
          <section className="erp-panel">
            <h2>Readiness distribution</h2>
            <Table
              caption="Readiness"
              rows={rows(data.readiness)}
              columns={[{ key: "readiness" }, ...numeric(["total"])]}
            />
          </section>
          <section className="erp-panel">
            <h2>Programming languages</h2>
            <Table
              caption="Languages"
              rows={rows(data.languages)}
              columns={[{ key: "language" }, ...numeric(["total"])]}
            />
          </section>
        </div>
        <section className="erp-panel">
          <h2>Suggested career roles</h2>
          <Table
            caption="Suggested roles"
            rows={rows(data.roles)}
            columns={[{ key: "role" }, ...numeric(["total"])]}
          />
        </section>
        <div className="po-actions">
          <Link href={href("talent", query, { risk: "high", page: undefined })}>
            View higher-risk profiles ↗
          </Link>
          <Link
            href={href("talent", query, {
              missing: "true",
              risk: undefined,
              readiness: undefined,
              language: undefined,
              page: undefined,
            })}
          >
            View students missing predictions ↗
          </Link>
        </div>
        <section className="erp-panel">
          <h2>Talent matrix</h2>
          <Table
            caption="Talent intelligence matrix"
            rows={list}
            columns={[
              {
                key: "usn",
                title: "USN",
                link: (r) => `/placement/students/${r.id}`,
              },
              { key: "name" },
              { key: "department" },
              { key: "readiness" },
              { key: "risk" },
              ...numeric(["points", "cgpa", "alignment"]),
              {
                key: "roles",
                render: (r) =>
                  Array.isArray(r.roles) ? r.roles.join(", ") : "No prediction",
              },
            ]}
            details={(r) => (
              <Facts
                data={{
                  roles: r.roles,
                  domains: r.domains,
                  skills: r.skills,
                  languages: r.languages,
                  strengths: r.strengths,
                  risks: r.risks,
                  recommendations: r.recommendations,
                  alignment: r.alignment,
                  practical: r.practical,
                  theoretical: r.theoretical,
                  course_fit: r.course_fit,
                  generated_at: r.generated_at,
                }}
              />
            )}
          />
          <Pagination report={data} path={section} query={query} />
        </section>
      </>
    );
  return null;
}
