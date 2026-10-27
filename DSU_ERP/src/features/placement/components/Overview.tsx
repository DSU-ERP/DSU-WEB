import Link from "next/link";
import { BarChart, DonutChart, LineChart } from "./Charts";
import { Refresh } from "./Controls";
import { OverviewFilters } from "./OverviewFilters";
import { Table, offerColumns } from "./UI";
import { formatCgpa, formatCount, formatPercent, type OverviewCharts } from "../lib/intelligence";
import { href, label, number, text, type Report, type Query, type Row } from "../lib/types";
import { driveDateWarning } from "../lib/overview";

const records = (value: unknown): Row[] => Array.isArray(value) ? value as Row[] : [];

export function PlacementOverview({ data, charts, chartError, query, environment, today }: {
  data: Report; charts: OverviewCharts | null; chartError?: string; query: Query;
  environment?: string; today: string;
}) {
  const k = charts?.kpis;
  const summary = data.summary;
  const total = k?.totalStudents ?? summary?.students;
  const companies = records(data.companies).filter(r => Number(r.offers) > 0).slice(0, 10);
  const recent = records(data.recent);
  const drives = records(data.scheduled);
  const primary = [
    ["Total students", formatCount(total), "Students in the selected cohort"],
    ["Placement eligible", formatCount(k?.eligible), "Valid CGPA of 6.75 or above"],
    ["Students placed", formatCount(k?.placed ?? summary?.placed), "Distinct students with an active offer"],
    ["Placement rate", formatPercent(k?.placementRate ?? (Number(total) > 0 ? summary?.placement_percentage : null), 2), "Placed students / selected students"],
  ];
  return (
    <div className="po-overview">
      <header className="po-overview-header">
        <div>
          <p className="po-overview-breadcrumb">PLACEMENTS / OVERVIEW</p>
          <h1>Placement overview</h1>
          <p>Recruitment performance, student eligibility and placement activity.</p>
        </div>
        <div className="po-actions">{environment && <span className="po-environment">{environment}</span>}<Refresh /></div>
      </header>
      <OverviewFilters query={query} options={data.options} />
      {total !== undefined && total !== null && Number(total) === 0 ? (
        <section className="erp-panel po-cohort-empty" role="status">
          <h2>No students match this selection</h2>
          <p>Choose another batch or branch, or clear the student search.</p>
          <Link className="erp-secondary" href="/placement/overview">Clear filters</Link>
        </section>
      ) : <>
        {!charts && <div className="po-overview-warning" role="status"><strong>Cohort analytics are unavailable.</strong> {chartError || "Use Refresh to try again."} Report totals are shown where available; missing measures are marked Not available.</div>}
        <section className="po-overview-primary" aria-label="Placement key indicators">
          {primary.map(([title, value, detail]) => <article key={title} className="po-overview-kpi">
            <h2>{title}</h2><strong>{value}</strong><p>{detail}</p>
          </article>)}
        </section>
        <section className="po-overview-secondary" aria-label="Operational indicators">
          {[
            ["Active offers", formatCount(k?.activeOffers ?? summary?.offers), "Offered or accepted"],
            ["Participating companies", formatCount(k?.companies ?? summary?.companies), "With drives in the selected batch"],
            ["Active drives", formatCount(k?.activeDrives), "Recorded as upcoming or ongoing"],
            ["Average CGPA", formatCgpa(k?.averageCgpa), "Valid CGPAs in the selected cohort"],
          ].map(([title, value, detail]) => <article key={title}><div><h2>{title}</h2><p>{detail}</p></div><strong>{value}</strong></article>)}
        </section>
        <p className="po-scope-note">Student and offer measures follow all selected filters. Companies and drives follow the passing-out batch; student search and branch do not restrict recruitment schedules.</p>
        {charts && <section className="po-overview-charts" aria-label="Cohort analytics">
          <DonutChart segments={charts.status} definition={charts.definitions.status} />
          <BarChart rows={charts.departments} definition={charts.definitions.departments} />
        </section>}
      </>}
      <section className="po-overview-activity" aria-labelledby="recruitment-heading">
        <div className="po-section-heading"><h2 id="recruitment-heading">Recruitment activity</h2><span>Recorded offers and drive schedules</span></div>
        <section className="erp-panel po-overview-drives">
          <div className="po-panel-heading"><h3>Upcoming & ongoing drives</h3><Link href={href("drives", { batch: query.batch || "" })}>View drives</Link></div>
          <p className="po-scope-note">Selected batch schedule. Status is recorded by officers, not automatically changed by date.</p>
          {drives.length ? <div className="po-drive-list">
            <div className="po-drive-columns" aria-hidden="true"><span>Drive / company</span><span>Drive date</span><span>Registration deadline</span><span>Recorded status</span></div>
            {drives.map(d => <article key={String(d.id)} className="po-drive-row">
              <div><Link href={`/placement/drives/${d.id}`}>{text(d.title)}</Link><p>{text(d.company)}</p></div>
              <div><span className="po-mobile-label">Drive date</span><time>{text(d.drive_date)}</time></div>
              <div><span className="po-mobile-label">Registration deadline</span><time>{text(d.registration_deadline)}</time></div>
              <div><span className="po-status-label">{label(String(d.status))}</span>{driveDateWarning(d, today) && <p className="po-date-warning">{driveDateWarning(d, today)}</p>}</div>
            </article>)}
          </div> : <OverviewEmpty title="No scheduled drives" detail="No upcoming or ongoing drives are recorded for this batch selection." />}
        </section>
        <div className="po-overview-activity-pair">
          <section className="erp-panel"><div className="po-panel-heading"><h3>Recent placements</h3><Link href={href("offers", query)}>View offers</Link></div>
            {recent.length ? <Table caption="Recent active placement offers" rows={recent} columns={offerColumns} /> : <OverviewEmpty title="No recent placements" detail="There are no qualifying placement offers for the selected filters." />}
          </section>
          <section className="erp-panel"><div className="po-panel-heading"><h3>Leading recruiting companies</h3><Link href={href("company-reports", query)}>Company reports</Link></div>
            {companies.length ? <Table caption="Leading companies by active offers" rows={companies} columns={[
              {key:"name", title:"Company", link:r=>href("company-reports", query, {search:String(r.name)})},
              ...["drives","offers","hired","accepted","average"].map(key=>({key,numeric:true,title:key==="average"?"Avg. LPA":label(key)})),
            ]} /> : <OverviewEmpty title="No company results for this selection" detail="Companies appear here once they have qualifying offers. A scheduled drive alone does not count as a placement." />}
          </section>
        </div>
      </section>
      <section aria-labelledby="detail-heading" className="po-overview-details">
        <div className="po-section-heading"><h2 id="detail-heading">Supporting measures</h2><span>Offer outcomes and compensation</span></div>
        <div className="po-overview-support">
          <section className="erp-panel"><h3>Drive stages</h3><p className="po-scope-note">{formatCount(summary?.drives)} recorded drives in the selected batch</p><SummaryList rows={records(data.drive_statuses)} name="status" value="count" /></section>
          <section className="erp-panel"><h3>Placement categories</h3><p className="po-scope-note">Active offers by package category</p><SummaryList rows={records(data.categories)} name="category" value="offers" /></section>
          <section className="erp-panel"><h3>Compensation summary</h3>
            {summary?.average == null ? <OverviewEmpty title="No compensation data" detail="Package statistics appear when active offers include a valid LPA value." /> : <dl className="po-summary-list">{["average","highest","median"].map(key=><div key={key}><dt>{label(key)}</dt><dd>{number(summary?.[key],2)} <small>LPA</small></dd></div>)}</dl>}
            <p className="po-scope-note">Mean, maximum and median of recorded packages on active offered or accepted offers. Students can have multiple offers.</p>
          </section>
        </div>
        <div className="po-outcome-strip"><span>Accepted offers <strong>{formatCount(k?.acceptedOffers ?? summary?.accepted)}</strong></span><span>Unplaced students <strong>{formatCount(summary?.unplaced)}</strong></span><span>Eligible placement rate <strong>{formatPercent(k?.eligiblePlacementRate,2)}</strong></span></div>
        <details className="erp-panel po-overview-disclosure"><summary>Department placement and compensation details</summary><Table caption="Department placement comparison" rows={records(data.departments)} columns={[
          {key:"department",title:"Branch",link:r=>href("batch",query,{department:String(r.department??"__missing__"),page:undefined})},
          ...["total","placed","placement_percentage","average","highest"].map(key=>({key,numeric:true,title:key==="average"?"Average LPA":key==="highest"?"Highest LPA":label(key)})),
        ]}/></details>
        {charts && <LineChart points={charts.progress} definition={charts.definitions.progress} />}
        {charts && <details className="erp-panel po-overview-disclosure"><summary>Metric definitions and counting rules</summary><dl className="po-metric-definitions">{Object.entries(charts.definitions).map(([key, value])=><div key={key}><dt>{label(key.replace(/([A-Z])/g," $1"))}</dt><dd>{value}</dd></div>)}</dl></details>}
      </section>
    </div>
  );
}

function OverviewEmpty({title, detail}:{title:string;detail:string}) {
  return <div className="po-overview-empty"><strong>{title}</strong><p>{detail}</p></div>;
}
function SummaryList({rows, name, value}:{rows:Row[];name:string;value:string}) {
  return <dl className="po-summary-list">{rows.map(r=><div key={String(r[name])}><dt>{label(String(r[name]))}</dt><dd>{formatCount(r[value])}</dd></div>)}</dl>;
}
