"use client";

import { useId, useState } from "react";
import { ChartNoAxesCombined } from "lucide-react";
import { chartCount, formatCount, monthLabel, niceScale, type ProgressPoint } from "../lib/intelligence";

const PERIODS = [
  { id: "6", label: "6 months", months: 6 },
  { id: "12", label: "12 months", months: 12 },
  { id: "all", label: "All", months: Infinity },
] as const;

/**
 * Monthly offers recorded (accent line with area) against students placed
 * (muted line), in the glass dashboard's cash-flow layout. Counts are per
 * month, never cumulative, so the period totals are plain sums.
 */
export function PlacementActivity({ points }: { points: ProgressPoint[] }) {
  const id = useId().replace(/:/g, "");
  // Only offer periods that show something different from "All".
  const periods = PERIODS.filter((p) => p.months < points.length || p.id === "all");
  const [periodId, setPeriodId] = useState<string>(points.length > 12 ? "12" : "all");
  const period = periods.find((p) => p.id === periodId) ?? periods[periods.length - 1];
  const shown = Number.isFinite(period.months) ? points.slice(-period.months) : points;
  const offers = shown.map((p) => chartCount(p.offersRecorded));
  const placed = shown.map((p) => chartCount(p.studentsPlaced));
  const totalOffers = offers.reduce((a, b) => a + b, 0);
  const totalPlaced = placed.reduce((a, b) => a + b, 0);
  const totalDrives = shown.reduce((sum, p) => sum + chartCount(p.drivesCompleted), 0);
  // Two steps keep the middle axis label a whole number.
  const scale = niceScale(Math.max(0, ...offers, ...placed), 2);
  const x = (i: number) => (shown.length === 1 ? 300 : (i * 600) / (shown.length - 1));
  const y = (v: number) => 180 - (v / scale.max) * 160;
  const line = (values: number[]) => values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const labelled = new Set(
    Array.from({ length: Math.min(shown.length, 6) }, (_, i) =>
      shown.length <= 6 ? i : Math.round((i * (shown.length - 1)) / 5),
    ),
  );
  const range = shown.length ? `${monthLabel(shown[0].month)} to ${monthLabel(shown[shown.length - 1].month)}` : "";
  const empty = !shown.length || (totalOffers === 0 && totalPlaced === 0);

  return (
    <section className="gw-panel gw-cashflow gw-reveal po-glass-activity" aria-labelledby={`${id}-heading`}>
      <div className="gw-panel-title">
        <h2 id={`${id}-heading`}>Placement activity</h2>
        {periods.length > 1 && (
          <div className="gw-segment" role="group" aria-label="Activity period">
            {periods.map((p) => (
              <button key={p.id} type="button" aria-pressed={period.id === p.id} onClick={() => setPeriodId(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="gw-chart-summary">
        <div>
          <span><i />Offers recorded</span>
          <strong>{formatCount(totalOffers)}</strong>
        </div>
        <div>
          <span><i />Students placed</span>
          <strong>{formatCount(totalPlaced)}</strong>
        </div>
        <div className="po-glass-quiet">
          <span>Drives completed</span>
          <strong>{formatCount(totalDrives)}</strong>
        </div>
      </div>
      {empty ? (
        <div className="gw-empty gw-chart-empty">
          <ChartNoAxesCombined size={23} aria-hidden="true" />
          <h3>No placement activity yet</h3>
          <p>The chart appears once offers or completed drives are recorded for this batch.</p>
        </div>
      ) : (
        <div className="gw-chart-wrap">
          <div className="gw-chart-labels" aria-hidden="true">
            <span>{formatCount(scale.max)}</span>
            <span>{Number.isInteger(scale.max / 2) ? formatCount(scale.max / 2) : ""}</span>
            <span>0</span>
          </div>
          <svg
            viewBox="0 0 600 185"
            role="img"
            aria-label={`Placement activity, ${range}: ${totalOffers} offers recorded and ${totalPlaced} students placed.`}
            preserveAspectRatio="none"
          >
            <desc>
              {shown
                .map((p, i) => `${monthLabel(p.month)}: ${offers[i]} offers recorded, ${placed[i]} students placed`)
                .join(". ")}
            </desc>
            <defs>
              <linearGradient id={`${id}-area`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--gw-accent)" stopOpacity=".23" />
                <stop offset="1" stopColor="var(--gw-accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[20, 100, 180].map((gy) => (
              <path key={gy} d={`M0 ${gy} H600`} stroke="currentColor" opacity=".11" strokeDasharray="3 5" />
            ))}
            <path
              d={`M${x(0)} 185 ${offers.map((v, i) => `L${x(i)} ${y(v)}`).join(" ")} L${x(shown.length - 1)} 185 Z`}
              fill={`url(#${id}-area)`}
            />
            <polyline points={line(offers)} fill="none" stroke="var(--gw-accent)" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <polyline points={line(placed)} fill="none" stroke="currentColor" strokeOpacity=".45" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            {shown.length === 1 && (
              <>
                <circle cx="300" cy={y(offers[0])} r="4" fill="var(--gw-accent)" />
                <circle cx="300" cy={y(placed[0])} r="4" fill="currentColor" opacity=".45" />
              </>
            )}
          </svg>
          <div className="gw-chart-months" aria-hidden="true">
            {shown.map((p, i) =>
              labelled.has(i) ? (
                <span
                  key={p.month}
                  style={{
                    left: `${x(i) / 6}%`,
                    transform:
                      i === 0 && shown.length > 1
                        ? "none"
                        : i === shown.length - 1 && shown.length > 1
                          ? "translateX(-100%)"
                          : "translateX(-50%)",
                  }}
                >
                  {monthLabel(p.month)}
                </span>
              ) : null,
            )}
          </div>
        </div>
      )}
      <p className="gw-chart-footnote">
        Months are when offers were recorded in the ERP. Drives are counted by drive date.
      </p>
    </section>
  );
}
