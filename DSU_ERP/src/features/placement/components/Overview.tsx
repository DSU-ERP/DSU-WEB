import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  ChartLine,
  CircleCheck,
  CircleDashed,
  Hourglass,
  Inbox,
  TriangleAlert,
} from "lucide-react";
import { Refresh } from "./Controls";
import { BatchPicker } from "./OverviewFilters";
import { GlassHome } from "./GlassHome";
import { PlacementActivity } from "./PlacementActivity";
import { NotificationsPanel } from "@/shared/notifications/Notifications";
import type { NotificationList } from "@/shared/notifications/types";
import { formatCount, formatPercent, roundedPercents, type OverviewCharts, type StatusSegment } from "../lib/intelligence";
import { label, text, type Report, type Query, type Row } from "../lib/types";
import { driveDateWarning } from "../lib/overview";

const records = (value: unknown): Row[] => Array.isArray(value) ? value as Row[] : [];
const UPCOMING_LIMIT = 5;

/**
 * Home, on the adjustable glass surface: the placement rate with the other
 * headline numbers, monthly activity, upcoming drives, what needs the officer,
 * notifications and the placement status split. Deeper analysis is in Insights.
 */
export function PlacementOverview({ data, charts, chartError, query, environment, today, notices = null, pendingRequests = null }: {
  data: Report; charts: OverviewCharts | null; chartError?: string; query: Query;
  environment?: string; today: string; notices?: NotificationList | null; pendingRequests?: number | null;
}) {
  const k = charts?.kpis;
  const summary = data.summary;
  const total = k?.totalStudents ?? summary?.students;
  const placed = k?.placed ?? summary?.placed;
  const rate = formatPercent(k?.placementRate ?? (Number(total) > 0 ? summary?.placement_percentage : null), 2);
  const drives = records(data.scheduled);
  const late = drives.flatMap(d => { const warning = driveDateWarning(d, today); return warning ? [{ drive: d, warning }] : []; });
  const batchQuery = query.batch ? `?batch=${encodeURIComponent(query.batch)}` : "";
  const insights = `/placement/insights${batchQuery}`;
  const kpis = [
    ["Students", formatCount(total), "In the selected batch"],
    ["Placement eligible", formatCount(k?.eligible), "Valid CGPA of 6.75 or above"],
    ["Placed", formatCount(placed), "Students with an active offer"],
  ];
  const attentionCount = (Number(pendingRequests) > 0 ? 1 : 0) + late.length;
  const emptyCohort = total !== undefined && total !== null && Number(total) === 0;

  return (
    <div className="po-overview po-home po-glass-home">
      <GlassHome
        eyebrow={query.batch ? `Passing-out batch ${query.batch}` : "All passing-out batches"}
        title="Placement overview"
        actions={<>
          {environment && <span className="po-environment">{environment}</span>}
          <BatchPicker batch={query.batch} batches={data.options.batches} />
          <Refresh />
        </>}
      >
        {!charts && !emptyCohort && <div className="po-overview-warning" role="status"><strong>Cohort analytics are unavailable.</strong> {chartError || "Use Refresh to try again."} Missing measures are marked Not available.</div>}

        {emptyCohort ? (
          <section className="gw-panel gw-reveal po-cohort-empty" role="status">
            <h2>No students in this batch</h2>
            <p>Choose another passing-out batch.</p>
            <Link className="erp-secondary" href="/placement/overview">Show all batches</Link>
          </section>
        ) : (
          <div className="gw-overview-grid">
            <section className="gw-panel gw-balance gw-reveal po-glass-rate" aria-labelledby="rate-heading">
              <div className="gw-panel-title">
                <h2 id="rate-heading">Placement rate</h2>
                <Award size={17} aria-hidden="true" />
              </div>
              <strong className="gw-balance-value">{rate}</strong>
              <p className="gw-balance-meta">
                <span className="gw-positive">{formatCount(placed)}</span> of {formatCount(total)} students placed
              </p>
              <ul className="po-glass-kpis" aria-label="Placement key indicators">
                {kpis.map(([title, value, detail]) => (
                  <li key={title}>
                    <Link href={insights}>
                      <span><strong>{title}</strong><small>{detail}</small></span>
                      <b>{value}</b>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link className="gw-account" href={insights}>
                <span className="gw-account-icon"><ChartLine size={19} aria-hidden="true" /></span>
                <div><strong>Insights</strong><span>Branches, batches and trends</span></div>
                <span className="po-glass-go" aria-hidden="true"><ArrowUpRight size={20} /></span>
              </Link>
            </section>
            {charts ? <PlacementActivity points={charts.progress} /> : (
              <section className="gw-panel gw-reveal po-glass-activity" aria-label="Placement activity">
                <div className="gw-empty gw-chart-empty">
                  <ChartLine size={23} aria-hidden="true" />
                  <h3>Activity is unavailable</h3>
                  <p>Monthly placement activity could not be loaded. Use Refresh to try again.</p>
                </div>
              </section>
            )}
          </div>
        )}

        <div className="gw-lower-grid">
          <section className="gw-panel gw-reveal po-glass-drives" aria-labelledby="upcoming-heading">
            <div className="gw-panel-title">
              <h2 id="upcoming-heading">Upcoming drives</h2>
              <Link className="gw-text-button" href={`/placement/drives${batchQuery}`}>View all drives<ArrowRight size={14} aria-hidden="true" /></Link>
            </div>
            {drives.length ? (
              <ul className="gw-transactions">
                {drives.slice(0, UPCOMING_LIMIT).map(d => {
                  const warning = driveDateWarning(d, today);
                  return (
                    <li className="gw-transaction" key={String(d.id)}>
                      <span className={`gw-transaction-icon${warning ? " is-warning" : ""}`}>
                        {warning ? <TriangleAlert size={17} aria-hidden="true" /> : <BriefcaseBusiness size={17} strokeWidth={1.7} aria-hidden="true" />}
                      </span>
                      <div className="gw-transaction-name">
                        <strong><Link href={`/placement/drives/${d.id}`}>{text(d.title)}</Link></strong>
                        <span>{text(d.company)} · Deadline <time>{text(d.registration_deadline)}</time></span>
                        {warning && <span className="po-date-warning">{warning}</span>}
                      </div>
                      <span className="gw-transaction-status">{label(String(d.status))}</span>
                      <time className="po-glass-date">{text(d.drive_date)}</time>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="gw-empty po-glass-empty">
                <CalendarClock size={23} aria-hidden="true" />
                <h3>No scheduled drives</h3>
                <p>No upcoming or ongoing drives are recorded for this batch.</p>
              </div>
            )}
            {drives.length > UPCOMING_LIMIT && <p className="po-glass-more">{drives.length - UPCOMING_LIMIT} more in Drives.</p>}
          </section>

          <section className="gw-panel gw-reveal po-attention" aria-labelledby="attention-heading">
            <div className="gw-panel-title">
              <h2 id="attention-heading">Needs attention</h2>
              {attentionCount > 0 && <span className="gw-small-label">{attentionCount} {attentionCount === 1 ? "item" : "items"}</span>}
            </div>
            {attentionCount > 0 ? (
              <ul className="po-glass-attention">
                {Number(pendingRequests) > 0 && (
                  <li>
                    <Link href="/placement/drive-requests">
                      <span className="po-glass-attention-icon"><Inbox size={17} aria-hidden="true" /></span>
                      <span>
                        <strong>{pendingRequests} drive {pendingRequests === 1 ? "request" : "requests"} awaiting review</strong>
                        <small>Submitted by companies through the company portal</small>
                      </span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </li>
                )}
                {late.map(({ drive, warning }) => (
                  <li key={String(drive.id)}>
                    <Link href={`/placement/drives/${drive.id}`}>
                      <span className="po-glass-attention-icon is-warning"><TriangleAlert size={17} aria-hidden="true" /></span>
                      <span>
                        <strong>{text(drive.title)} · {text(drive.company)}</strong>
                        <small className="po-date-warning">{warning}</small>
                      </span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="po-glass-clear">
                <CircleCheck size={20} aria-hidden="true" />
                <p className="po-attention-clear">Nothing needs your attention.</p>
              </div>
            )}
            {pendingRequests === null && <p className="po-glass-more">Company drive requests could not be checked. <Link href="/placement/drive-requests">Open requests</Link></p>}
          </section>
        </div>

        <div className="gw-lower-grid">
          <NotificationsPanel
            initial={notices}
            className="gw-panel gw-reveal po-glass-notices"
            empty="You are all caught up. Drive requests, round results and other updates will appear here."
          />
          {charts && (
            <section className="gw-panel gw-reveal po-home-status" aria-labelledby="status-heading">
              <div className="gw-panel-title">
                <h2 id="status-heading">Placement status</h2>
                <Link className="gw-text-button" href={insights}>See insights<ArrowRight size={14} aria-hidden="true" /></Link>
              </div>
              <StatusGoals segments={charts.status} />
            </section>
          )}
        </div>
      </GlassHome>
    </div>
  );
}

const TONES: Record<string, { tone: string; Icon: typeof BadgeCheck }> = {
  placed: { tone: "placed", Icon: BadgeCheck },
  eligible_not_placed: { tone: "eligible", Icon: Hourglass },
  not_eligible_not_placed: { tone: "third", Icon: CircleDashed },
};

/** Each status as a labelled progress track against the whole batch. */
function StatusGoals({ segments }: { segments: StatusSegment[] }) {
  const counts = segments.map(s => Math.max(0, Number(s.count) || 0));
  const total = counts.reduce((a, b) => a + b, 0);
  if (!total) return <p className="po-glass-more">No students in this batch, so there is no placement status to show.</p>;
  const percents = roundedPercents(counts);
  return (
    <div className="gw-goals">
      {segments.map((s, i) => {
        const { tone, Icon } = TONES[s.key] ?? { tone: "muted", Icon: CircleDashed };
        return (
          <div className={`gw-goal po-glass-tone-${tone}`} key={s.key}>
            <div className="gw-goal-top">
              <span className="gw-goal-icon"><Icon size={17} aria-hidden="true" /></span>
              <strong>{s.label}</strong>
              <span className="po-glass-count">{formatCount(counts[i])}<small>{percents[i].toFixed(1)}%</small></span>
            </div>
            <div
              className="gw-goal-track"
              role="progressbar"
              aria-label={s.label}
              aria-valuenow={Number(percents[i].toFixed(1))}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuetext={`${formatCount(counts[i])} of ${formatCount(total)} students, ${percents[i].toFixed(1)}%`}
            >
              <i style={{ width: `${(counts[i] / total) * 100}%` }} />
            </div>
          </div>
        );
      })}
      <p className="po-glass-status-total">Share of {formatCount(total)} students in the selected batch.</p>
    </div>
  );
}
