import Link from "next/link";
import { BarChart, DonutChart, LineChart } from "./Charts";
import { Refresh } from "./Controls";
import { OverviewFilters } from "./OverviewFilters";
import { Table } from "./UI";
import { formatCgpa, formatCount, formatPercent, type OverviewCharts } from "../lib/intelligence";
import { href, label, number, type Report, type Query, type Row } from "../lib/types";

const records = (value: unknown): Row[] => Array.isArray(value) ? value as Row[] : [];

/** Insights › Summary: the cohort analysis that used to crowd the home dashboard. */
export function PlacementInsights({ data, charts, chartError, query, environment }: {
  data: Report; charts: OverviewCharts | null; chartError?: string; query: Query; environment?: string;
}) {
  const k = charts?.kpis;
  const summary = data.summary;
  const total = k?.totalStudents ?? summary?.students;
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
          <h1>Insights</h1>
          <p>Eligibility, placement status, departments and compensation for the selected cohort.</p>
        </div>
        <div className="po-actions">{environment && <span className="po-environment">{environment}</span>}<Refresh /></div>
      </header>
      <OverviewFilters query={query} options={data.options} path="/placement/insights" />
      {total !== undefined && total !== null && Number(total) === 0 ? (
        <section className="erp-panel po-cohort-empty" role="status">
          <h2>No students match this selection</h2>
          <p>Choose another batch or branch, or clear the student search.</p>
          <Link className="erp-secondary" href="/placement/insights">Clear filters</Link>
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
      <section aria-labelledby="detail-heading" className="po-overview-details">
        <div className="po-section-heading"><h2 id="detail-heading">Supporting measures</h2><span>Offer outcomes and compensation</span></div>
        <div className="po-overview-support">
          <section className="erp-panel"><h3>Drive stages</h3><p className="po-scope-note">{formatCount(summary?.drives)} recorded drives in the selected batch</p><SummaryList rows={records(data.drive_statuses)} name="status" value="count" /></section>
          <section className="erp-panel"><h3>Placement categories</h3><p className="po-scope-note">Active offers by package category</p><SummaryList rows={records(data.categories)} name="category" value="offers" /></section>
          <section className="erp-panel"><h3>Compensation summary</h3>
            {summary?.average == null ? <InsightsEmpty title="No compensation data" detail="Package statistics appear when active offers include a valid LPA value." /> : <dl className="po-summary-list">{["average","highest","median"].map(key=><div key={key}><dt>{label(key)}</dt><dd>{number(summary?.[key],2)} <small>LPA</small></dd></div>)}</dl>}
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

function InsightsEmpty({title, detail}:{title:string;detail:string}) {
  return <div className="po-overview-empty"><strong>{title}</strong><p>{detail}</p></div>;
}
function SummaryList({rows, name, value}:{rows:Row[];name:string;value:string}) {
  return <dl className="po-summary-list">{rows.map(r=><div key={String(r[name])}><dt>{label(String(r[name]))}</dt><dd>{formatCount(r[value])}</dd></div>)}</dl>;
}
