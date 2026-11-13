import Link from "next/link";
import { Refresh } from "./Controls";
import { BatchPicker } from "./OverviewFilters";
import { NotificationsPanel } from "@/shared/notifications/Notifications";
import type { NotificationList } from "@/shared/notifications/types";
import { formatCount, formatPercent, roundedPercents, type OverviewCharts, type StatusSegment } from "../lib/intelligence";
import { label, text, type Report, type Query, type Row } from "../lib/types";
import { driveDateWarning } from "../lib/overview";

const records = (value: unknown): Row[] => Array.isArray(value) ? value as Row[] : [];
const UPCOMING_LIMIT = 5;

/**
 * Home: what needs the officer now, four headline numbers, and the drives
 * coming up. Everything analytical lives under Insights.
 */
export function PlacementOverview({ data, charts, chartError, query, environment, today, notices = null, pendingRequests = null }: {
  data: Report; charts: OverviewCharts | null; chartError?: string; query: Query;
  environment?: string; today: string; notices?: NotificationList | null; pendingRequests?: number | null;
}) {
  const k = charts?.kpis;
  const summary = data.summary;
  const total = k?.totalStudents ?? summary?.students;
  const drives = records(data.scheduled);
  const late = drives.flatMap(d => { const warning = driveDateWarning(d, today); return warning ? [{ drive: d, warning }] : []; });
  const insights = `/placement/insights${query.batch ? `?batch=${encodeURIComponent(query.batch)}` : ""}`;
  const kpis = [
    ["Students", formatCount(total), "In the selected batch"],
    ["Placement eligible", formatCount(k?.eligible), "Valid CGPA of 6.75 or above"],
    ["Placed", formatCount(k?.placed ?? summary?.placed), "Students with an active offer"],
    ["Placement rate", formatPercent(k?.placementRate ?? (Number(total) > 0 ? summary?.placement_percentage : null), 2), "Placed / students"],
  ];
  const attention = Number(pendingRequests) > 0 || late.length > 0;
  return (
    <div className="po-overview po-home">
      <header className="po-overview-header">
        <div>
          <h1>Placement overview</h1>
          <p>{query.batch ? `Passing-out batch ${query.batch}` : "All passing-out batches"}</p>
        </div>
        <div className="po-actions">
          {environment && <span className="po-environment">{environment}</span>}
          <BatchPicker batch={query.batch} batches={data.options.batches} />
          <Refresh />
        </div>
      </header>

      <div className="po-home-attention">
        <section className="erp-panel po-attention" aria-labelledby="attention-heading">
          <h2 id="attention-heading">Needs attention</h2>
          {attention ? (
            <ul>
              {Number(pendingRequests) > 0 && (
                <li>
                  <Link href="/placement/drive-requests">
                    <strong>{pendingRequests} drive {pendingRequests === 1 ? "request" : "requests"} awaiting review</strong>
                    <span>Submitted by companies through the company portal</span>
                  </Link>
                </li>
              )}
              {late.map(({ drive, warning }) => (
                <li key={String(drive.id)}>
                  <Link href={`/placement/drives/${drive.id}`}>
                    <strong>{text(drive.title)} · {text(drive.company)}</strong>
                    <span className="po-date-warning">{warning}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="po-attention-clear">Nothing needs your attention.</p>
          )}
          {pendingRequests === null && <p className="po-scope-note">Company drive requests could not be checked. <Link href="/placement/drive-requests">Open requests</Link></p>}
        </section>
        <NotificationsPanel
          initial={notices}
          className="cp-overview-notices"
          empty="You are all caught up. Drive requests, round results and other updates will appear here."
        />
      </div>

      {total !== undefined && total !== null && Number(total) === 0 ? (
        <section className="erp-panel po-cohort-empty" role="status">
          <h2>No students in this batch</h2>
          <p>Choose another passing-out batch.</p>
          <Link className="erp-secondary" href="/placement/overview">Show all batches</Link>
        </section>
      ) : <>
        {!charts && <div className="po-overview-warning" role="status"><strong>Cohort analytics are unavailable.</strong> {chartError || "Use Refresh to try again."} Missing measures are marked Not available.</div>}
        <section className="po-overview-primary" aria-label="Placement key indicators">
          {kpis.map(([title, value, detail]) => <article key={title} className="po-overview-kpi">
            <Link href={insights}><h2>{title}</h2><strong>{value}</strong><p>{detail}</p></Link>
          </article>)}
        </section>
      </>}

      <div className="po-home-pair">
        <section className="erp-panel po-overview-drives" aria-labelledby="upcoming-heading">
          <div className="po-panel-heading"><h2 id="upcoming-heading">Upcoming drives</h2><Link href={`/placement/drives${query.batch ? `?batch=${encodeURIComponent(query.batch)}` : ""}`}>View all drives</Link></div>
          {drives.length ? <ul className="po-home-drives">
            {drives.slice(0, UPCOMING_LIMIT).map(d => <li key={String(d.id)}>
              <div><Link href={`/placement/drives/${d.id}`}>{text(d.title)}</Link><span>{text(d.company)}</span></div>
              <dl>
                <div><dt>Drive</dt><dd><time>{text(d.drive_date)}</time></dd></div>
                <div><dt>Deadline</dt><dd><time>{text(d.registration_deadline)}</time></dd></div>
              </dl>
              <span className="po-status-label">{label(String(d.status))}</span>
            </li>)}
          </ul> : <div className="po-overview-empty"><strong>No scheduled drives</strong><p>No upcoming or ongoing drives are recorded for this batch.</p></div>}
          {drives.length > UPCOMING_LIMIT && <p className="po-scope-note">{drives.length - UPCOMING_LIMIT} more in Drives.</p>}
        </section>
        {charts && <section className="erp-panel po-home-status" aria-labelledby="status-heading">
          <div className="po-panel-heading"><h2 id="status-heading">Placement status</h2><Link href={insights}>See insights</Link></div>
          <StatusBar segments={charts.status} />
        </section>}
      </div>
    </div>
  );
}

const TONES: Record<string, string> = {
  placed: "placed",
  eligible_not_placed: "eligible",
  not_eligible_not_placed: "third",
};

/** One stacked bar with a labelled legend; the legend carries every value. */
function StatusBar({ segments }: { segments: StatusSegment[] }) {
  const counts = segments.map(s => Math.max(0, Number(s.count) || 0));
  const total = counts.reduce((a, b) => a + b, 0);
  if (!total) return <p className="po-scope-note">No students in this batch, so there is no placement status to show.</p>;
  const percents = roundedPercents(counts);
  return <>
    <div className="po-status-bar" role="img" aria-label={segments.map((s, i) => `${s.label} ${counts[i]} (${percents[i].toFixed(1)}%)`).join(", ")}>
      {segments.map((s, i) => counts[i] > 0 && <span key={s.key} className={`po-status-${TONES[s.key] ?? "muted"}`} style={{ width: `${(counts[i] / total) * 100}%` }} />)}
    </div>
    <dl className="po-home-legend">
      {segments.map((s, i) => <div key={s.key}>
        <dt><i className={`po-status-${TONES[s.key] ?? "muted"}`} aria-hidden="true" />{s.label}</dt>
        <dd>{formatCount(counts[i])} <small>{percents[i].toFixed(1)}%</small></dd>
      </div>)}
    </dl>
  </>;
}
