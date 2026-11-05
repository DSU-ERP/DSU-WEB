import type { Row } from "./types";

/** Compare SQL DATE strings against the server's campus date, never browser locale. */
export function driveDateWarning(drive: Row, today: string): string | null {
  const date = typeof drive.drive_date === "string" ? drive.drive_date.slice(0, 10) : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(date) && date < today && ["upcoming", "ongoing"].includes(String(drive.status)))
    return "Drive date has passed. Review recorded status.";
  return null;
}

/**
 * The department leading a metric, or null when there is no real leader:
 * no values, or the best value is zero. Departments tied at the top are all
 * named, so a tie is never shown as one department leading.
 */
export function departmentLeader(rows: Row[], metric: string): { departments: string[]; value: number } | null {
  const values = rows
    .map((row) => ({ department: String(row.department ?? ""), value: row[metric] === null || row[metric] === undefined || row[metric] === "" ? NaN : Number(row[metric]) }))
    .filter((row) => row.department && Number.isFinite(row.value));
  const best = Math.max(...values.map((row) => row.value));
  if (!values.length || !(best > 0)) return null;
  return { departments: values.filter((row) => row.value === best).map((row) => row.department).sort(), value: best };
}
