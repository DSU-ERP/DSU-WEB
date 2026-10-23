// Placement Overview charts: hand-built and dependency free. Every chart has
// a title, a definition from the API, a legend with text labels (series also
// differ by line style, marker shape or fill pattern, never by colour alone),
// an aria-label summary and a visually hidden data table. With no data the
// chart says so instead of drawing anything.
import {
  chartCount,
  donutArcs,
  formatCgpa,
  formatCount,
  formatPercent,
  labelEvery,
  linePoints,
  monthLabel,
  niceScale,
  roundedPercents,
  type ChartKpis,
  type DepartmentBar,
  type OverviewCharts as Charts,
  type ProgressPoint,
  type StatusSegment,
} from "@/features/placement/lib/intelligence";

const SERIES = [
  { key: "studentsPlaced", label: "Students placed", tone: "placed", shape: "circle" },
  { key: "offersRecorded", label: "Offers recorded", tone: "offers", shape: "square" },
  { key: "drivesCompleted", label: "Drives completed", tone: "drives", shape: "diamond" },
] as const;

const KPIS: { key: keyof ChartKpis; label: string; format: (v: unknown) => string }[] = [
  { key: "totalStudents", label: "Total students", format: formatCount },
  { key: "eligible", label: "Placement eligible", format: formatCount },
  { key: "placed", label: "Students placed", format: formatCount },
  { key: "placementRate", label: "Placement rate", format: (v) => formatPercent(v, 2) },
  { key: "eligiblePlacementRate", label: "Eligible placement rate", format: (v) => formatPercent(v, 2) },
  { key: "companies", label: "Participating companies", format: formatCount },
  { key: "activeDrives", label: "Active drives", format: formatCount },
  { key: "acceptedOffers", label: "Accepted offers", format: formatCount },
  { key: "activeOffers", label: "Active offers", format: formatCount },
  { key: "averageCgpa", label: "Average CGPA", format: formatCgpa },
];

export function OverviewCharts({
  charts,
  error,
}: {
  charts: Charts | null;
  error?: string;
}) {
  if (!charts)
    return (
      <section className="erp-panel po-chart-error" role="status">
        <h2>Cohort charts</h2>
        <p>Charts could not be loaded. {error || "Please try again."}</p>
        <p className="po-note">
          The recorded reports below are unaffected.
        </p>
      </section>
    );
  const d = charts.definitions || {};
  return (
    <section className="po-overview-intel" aria-labelledby="po-cohort-heading">
      <h2 id="po-cohort-heading" className="erp-visually-hidden">
        Cohort measures and charts
      </h2>
      <div className="po-kpis">
        {KPIS.map((k) => (
          <article key={k.key} title={d[k.key]}>
            <span>{k.label}</span>
            <strong>{k.format(charts.kpis?.[k.key])}</strong>
            {d[k.key] && <p>{d[k.key]}</p>}
          </article>
        ))}
      </div>
      <LineChart points={charts.progress || []} definition={d.progress} />
      <div className="po-chart-pair">
        <DonutChart segments={charts.status || []} definition={d.status} />
        <BarChart rows={charts.departments || []} definition={d.departments} />
      </div>
    </section>
  );
}

function Legend({ items }: { items: { label: string; tone: string; shape?: string; extra?: React.ReactNode }[] }) {
  return (
    <ul className="po-legend">
      {items.map((item) => (
        <li key={item.label}>
          <i className={`po-key po-tone-${item.tone}${item.shape ? ` po-shape-${item.shape}` : ""}`} aria-hidden="true" />
          <span>{item.label}</span>
          {item.extra}
        </li>
      ))}
    </ul>
  );
}

export function LineChart({ points, definition }: { points: ProgressPoint[]; definition?: string }) {
  // One cleaned series per line (finite, never negative) feeds the plot, the
  // summary and the data table, so they always agree.
  const values = SERIES.map((s) => points.map((p) => chartCount(p[s.key])));
  const totals = values.map((series) => series.reduce((sum, v) => sum + v, 0));
  const scale = niceScale(Math.max(0, ...values.flat()));
  const step = labelEvery(points.length, 6);
  const range = points.length
    ? `${monthLabel(points[0].month)} to ${monthLabel(points[points.length - 1].month)}`
    : "";
  return (
    <figure className="erp-panel po-chart po-chart-line">
      <figcaption>
        <h3>Placement progress by month</h3>
        <p className="po-chart-def">
          Months are when offers were recorded in the ERP, because no real
          offer date is stored. Drives are counted by drive date.
        </p>
        {definition && (
          <details className="po-chart-more">
            <summary>How this is counted</summary>
            <p>{definition}</p>
          </details>
        )}
      </figcaption>
      {!points.length ? (
        <p className="po-chart-empty">
          No placement events recorded yet for this cohort. The chart appears
          once offers or completed drives are recorded.
        </p>
      ) : (
        <>
          <Legend items={SERIES.map((s) => ({ label: s.label, tone: s.tone, shape: s.shape }))} />
          <div
            className="po-line"
            role="img"
            aria-label={`Line chart, ${range}: ${SERIES.map((s, i) => `${totals[i]} ${s.label.toLowerCase()}`).join(", ")} in total. The data table follows.`}
          >
            <div className="po-line-y" aria-hidden="true">
              {scale.ticks.map((t) => (
                <span key={t} style={{ top: `${100 - (t / scale.max) * 100}%` }}>
                  {t}
                </span>
              ))}
            </div>
            <div className="po-line-plot">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                {scale.ticks.map((t) => (
                  <line
                    key={t}
                    x1="0"
                    x2="100"
                    y1={100 - (t / scale.max) * 100}
                    y2={100 - (t / scale.max) * 100}
                    className="po-grid"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                {SERIES.map((s, si) => (
                  <polyline
                    key={s.key}
                    className={`po-series po-tone-${s.tone}`}
                    points={linePoints(values[si], scale.max)
                      .map((p) => `${p.x},${p.y}`)
                      .join(" ")}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>
              {SERIES.map((s, si) =>
                linePoints(values[si], scale.max).map((p, i) => (
                  <span
                    key={s.key + i}
                    className={`po-mark po-tone-${s.tone} po-shape-${s.shape}`}
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    title={`${monthLabel(points[i].month)}: ${p.value} ${s.label.toLowerCase()}`}
                  />
                )),
              )}
            </div>
            <div className="po-line-x" aria-hidden="true">
              {points.map((p, i) =>
                i % step === 0 ? (
                  <span
                    key={p.month}
                    className={(i / step) % 2 ? "po-x-alt" : undefined}
                    style={{
                      left: `${linePoints(points.map(() => 0), 1)[i].x}%`,
                      // Labels near an edge align to it so none spills out.
                      transform: (() => {
                        const x = linePoints(points.map(() => 0), 1)[i].x;
                        return points.length > 1 && x < 12
                          ? "none"
                          : points.length > 1 && x > 88
                            ? "translateX(-100%)"
                            : "translateX(-50%)";
                      })(),
                    }}
                  >
                    {monthLabel(p.month)}
                  </span>
                ) : null,
              )}
            </div>
          </div>
          <div className="erp-visually-hidden"><table>
            <caption>Placement progress by month</caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                {SERIES.map((s) => (
                  <th key={s.key} scope="col">{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.map((p, i) => (
                <tr key={p.month}>
                  <th scope="row">{monthLabel(p.month)}</th>
                  {SERIES.map((s, si) => (
                    <td key={s.key}>{values[si][i]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table></div>
        </>
      )}
    </figure>
  );
}

const STATUS_TONES: Record<string, string> = {
  placed: "placed",
  eligible_not_placed: "eligible",
  not_eligible_not_placed: "ineligible",
  unknown_not_placed: "unknown",
};

export function DonutChart({ segments, definition }: { segments: StatusSegment[]; definition?: string }) {
  const counts = segments.map((s) => Math.max(0, Number(s.count) || 0));
  const total = counts.reduce((a, b) => a + b, 0);
  const percents = roundedPercents(counts);
  const arcs = donutArcs(counts, 60, 60, 56, 36);
  return (
    <figure className="erp-panel po-chart po-chart-donut">
      <figcaption>
        <h3>Placement status</h3>
        {definition && <p className="po-chart-def">{definition}</p>}
      </figcaption>
      {!total ? (
        <p className="po-chart-empty">No students in this cohort, so there is no placement status to show.</p>
      ) : (
        <>
          <div className="po-donut-layout">
            <svg
              className="po-donut"
              viewBox="0 0 120 120"
              role="img"
              aria-label={`Donut chart of ${total} students: ${segments
                .map((s, i) => `${s.label} ${counts[i]} (${percents[i].toFixed(1)}%)`)
                .join(", ")}. The data table follows.`}
            >
              <defs>
                <pattern id="po-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="4" height="4" className="po-hatch-bg" />
                  <line x1="0" y1="0" x2="0" y2="4" className="po-hatch-line" />
                </pattern>
              </defs>
              {arcs.map((arc) => (
                <path
                  key={arc.index}
                  d={arc.path}
                  fillRule="evenodd"
                  className={`po-arc po-tone-${STATUS_TONES[segments[arc.index].key] ?? "unknown"}`}
                >
                  <title>{`${segments[arc.index].label}: ${arc.count} (${arc.percent.toFixed(1)}%)`}</title>
                </path>
              ))}
              <text x="60" y="58" textAnchor="middle" className="po-donut-total">
                {total.toLocaleString("en-IN")}
              </text>
              <text x="60" y="72" textAnchor="middle" className="po-donut-caption">
                students
              </text>
            </svg>
            <Legend
              items={segments.map((s, i) => ({
                label: s.label,
                tone: STATUS_TONES[s.key] ?? "unknown",
                extra: (
                  <strong>
                    {counts[i].toLocaleString("en-IN")} <small>{percents[i].toFixed(1)}%</small>
                  </strong>
                ),
              }))}
            />
          </div>
          <div className="erp-visually-hidden"><table>
            <caption>Placement status</caption>
            <thead>
              <tr>
                <th scope="col">Status</th>
                <th scope="col">Students</th>
                <th scope="col">Share</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((s, i) => (
                <tr key={s.key}>
                  <th scope="row">{s.label}</th>
                  <td>{counts[i]}</td>
                  <td>{percents[i].toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </>
      )}
    </figure>
  );
}

const BAR_SERIES = [
  { key: "total", label: "Total students", tone: "total" },
  { key: "eligible", label: "Placement eligible", tone: "eligible" },
  { key: "placed", label: "Students placed", tone: "placed" },
] as const;

export function BarChart({ rows, definition }: { rows: DepartmentBar[]; definition?: string }) {
  const max = Math.max(0, ...rows.map((r) => Number(r.total) || 0));
  const name = (r: DepartmentBar) => r.department || "Department not recorded";
  return (
    <figure className="erp-panel po-chart po-chart-bars">
      <figcaption>
        <h3>Departments</h3>
        {definition && <p className="po-chart-def">{definition}</p>}
      </figcaption>
      {!rows.length || !max ? (
        <p className="po-chart-empty">No students in this cohort, so there are no departments to compare.</p>
      ) : (
        <>
          <Legend items={BAR_SERIES.map((s) => ({ label: s.label, tone: s.tone }))} />
          <div
            className="po-bars"
            role="img"
            aria-label={`Grouped bar chart of total, placement eligible and placed students for ${rows.length} ${rows.length === 1 ? "department" : "departments"}. The data table follows.`}
          >
            {rows.map((r) => (
              <div className="po-bar-row" key={name(r)}>
                <span className="po-bar-label">{name(r)}</span>
                <div className="po-bar-set">
                  {BAR_SERIES.map((s) => {
                    const value = Number(r[s.key]) || 0;
                    return (
                      <div className="po-bar-track" key={s.key} title={`${name(r)}: ${value} ${s.label.toLowerCase()}`}>
                        <span
                          className={`po-bar po-tone-${s.tone}`}
                          style={{ width: `calc((100% - 3.5rem) * ${value / max})` }}
                        />
                        <span className="po-bar-value">{value.toLocaleString("en-IN")}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="erp-visually-hidden"><table>
            <caption>Students by department</caption>
            <thead>
              <tr>
                <th scope="col">Department</th>
                {BAR_SERIES.map((s) => (
                  <th key={s.key} scope="col">{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={name(r)}>
                  <th scope="row">{name(r)}</th>
                  {BAR_SERIES.map((s) => (
                    <td key={s.key}>{Number(r[s.key]) || 0}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table></div>
        </>
      )}
    </figure>
  );
}
