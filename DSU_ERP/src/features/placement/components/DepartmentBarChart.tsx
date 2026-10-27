"use client";

import { useId, useState } from "react";
import { chartCount, formatCount, niceScale, type DepartmentBar } from "../lib/intelligence";

const SERIES = [
  { key: "total", label: "Total students", marker: "T" },
  { key: "eligible", label: "Placement eligible", marker: "E" },
  { key: "placed", label: "Students placed", marker: "P" },
] as const;
const departmentName = (row: DepartmentBar) => row.department || "Department not recorded";
const count = (value: number) => value.toLocaleString("en-IN");

export function BarChart({ rows, definition }: { rows: DepartmentBar[]; definition?: string }) {
  const id = useId();
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  // A single cleaned snapshot supplies the bars, tooltip, axis and table.
  const departments = rows.map(row => ({ ...row, total: chartCount(row.total), eligible: chartCount(row.eligible), placed: chartCount(row.placed) }));
  const scale = niceScale(Math.max(0, ...departments.flatMap(row => SERIES.map(series => row[series.key]))));
  const active = dismissed ? null : hovered ?? focused;
  const selected = departments.flatMap(row => SERIES.map(series => ({ row, series, key: JSON.stringify([row.department, series.key]) }))).find(item => item.key === active);
  const hasData = departments.some(row => row.total > 0);

  return <figure className="erp-panel po-chart po-chart-bars po-department-chart">
    <figcaption>
      <h3>Department breakdown</h3>
      {definition && <details className="po-chart-more"><summary>How this is counted</summary><p>{definition}</p></details>}
    </figcaption>
    {!hasData ? <p className="po-chart-empty">No students in this cohort, so there are no departments to compare.</p> : <>
      <ul className="po-legend">{SERIES.map(series => <li key={series.key}><i className={`po-key po-tone-${series.key}`} aria-hidden="true"/><span><b>{series.marker}</b> {series.label}</span></li>)}</ul>
      <div className="po-department-inspector" onPointerLeave={() => setHovered(null)} onKeyDown={event => { if (event.key === "Escape") setDismissed(true); }}>
        <div className="po-department-readout" id={`${id}-tooltip`} role={selected ? "tooltip" : undefined}>
          {selected ? <><strong>{departmentName(selected.row)}</strong><span>{selected.series.label}: <b>{count(selected.row[selected.series.key])}</b>{selected.row.total > 0 && <> · {(selected.row[selected.series.key] / selected.row.total * 100).toFixed(1)}% of department</>}</span></> : <><strong>Compare departments</strong><span>Hover, tap or focus a row to inspect its count and share.</span></>}
        </div>
        <div className="po-bars" role="group" aria-label={`Grouped bar chart of total, placement eligible and placed students for ${rows.length} departments. Counts start at zero. Tab through metrics for details, or open the data table below.`}>
          {departments.map(row => <div className="po-bar-row" key={departmentName(row)}>
            <span className="po-bar-label" title={departmentName(row)}>{departmentName(row)}</span>
            <div className="po-bar-set">
              {SERIES.map(series => {
                const key = JSON.stringify([row.department, series.key]);
                const value = row[series.key];
                return <button type="button" className="po-bar-track" key={series.key}
                  aria-label={`${departmentName(row)}, ${series.label}: ${count(value)}`}
                  aria-describedby={active === key ? `${id}-tooltip` : undefined}
                  data-emphasis={selected ? active === key ? "active" : "muted" : undefined}
                  onPointerEnter={() => { setHovered(key); setDismissed(false); }}
                  onFocus={() => { setHovered(null); setFocused(key); setDismissed(false); }} onBlur={() => setFocused(null)}
                  onClick={() => { setFocused(key); setDismissed(false); }}>
                  <span className="po-series-letter" aria-hidden="true">{series.marker}</span>
                  <span className="po-bar-area" aria-hidden="true">
                    <span className={`po-bar po-tone-${series.key}`} style={{ width: `${value / scale.max * 100}%` }}/>
                  </span>
                  <span className="po-bar-value" aria-hidden="true">{count(value)}</span>
                </button>;
              })}
            </div>
          </div>)}
        </div>
        <div className="po-bar-axis" aria-hidden="true">{scale.ticks.map(tick => <span key={tick} style={{left: `${tick / scale.max * 100}%`}}>{formatCount(tick)}</span>)}</div>
        <p className="po-department-axis-label">Number of students</p>
      </div>
      {departments.every(row => row.placed === 0) && <p className="po-scope-note">No placed students in this selection. All placed values are zero.</p>}
      <details className="po-chart-data"><summary>View data table</summary><div className="erp-table-scroll" tabIndex={0}><table>
        <caption>Students by department</caption>
        <thead><tr><th scope="col">Department</th>{SERIES.map(series => <th key={series.key} scope="col">{series.label}</th>)}</tr></thead>
        <tbody>{departments.map(row => <tr key={departmentName(row)}><th scope="row">{departmentName(row)}</th>{SERIES.map(series => <td key={series.key}>{count(row[series.key])}</td>)}</tr>)}</tbody>
      </table></div></details>
    </>}
  </figure>;
}
