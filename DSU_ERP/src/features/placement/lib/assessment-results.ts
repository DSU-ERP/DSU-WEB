// Pure helpers for the officer's assigned-test results (table and CSV export).

export type ResultRow = {
  identity: { name: string; usn: string };
  status: string;
  started_at: string;
  submitted_at?: string | null;
  result: { percentage: number; score: number; maximum: number; durationSeconds?: number } | null;
  integrity: { kind: string }[];
  highRisk?: number;
};

const HIGH = new Set(["fullscreen-exit", "clipboard"]);
/** High-severity events; computed locally for rows from older API versions. */
export const highRiskOf = (row: ResultRow) =>
  typeof row.highRisk === "number" ? row.highRisk : row.integrity.filter((event) => HIGH.has(event.kind)).length;

export const minutesOf = (row: ResultRow) =>
  row.result?.durationSeconds === undefined ? "" : String(Math.round(row.result.durationSeconds / 60));

/** CSV cell with formula-injection protection and quote escaping. */
export function csvCell(value: unknown): string {
  return '"' + String(value ?? "").replace(/^[=+@\t\r-]/, "'$&").replaceAll('"', '""') + '"';
}

export function resultsCsv(rows: ResultRow[]): string {
  return [
    ["USN", "Name", "Status", "Score", "Maximum", "Percentage", "Duration (min)", "Browser events", "High-risk events"],
    ...rows.map((row) => [
      row.identity.usn,
      row.identity.name,
      row.status,
      row.result?.score,
      row.result?.maximum,
      row.result?.percentage,
      minutesOf(row),
      row.integrity.length,
      highRiskOf(row),
    ]),
  ]
    .map((line) => line.map(csvCell).join(","))
    .join("\r\n");
}
