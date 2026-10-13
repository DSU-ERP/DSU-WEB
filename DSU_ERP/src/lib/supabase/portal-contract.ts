import type { CategoryData } from "../analytics/types";
import { placementStatus } from '../analytics/placement';

export function portalRequest(path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Invalid portal path");
  const url = new URL(path, "https://portal.invalid");
  if (url.origin !== "https://portal.invalid" || url.hash) throw new Error("Invalid portal path");
  return { request_path: url.pathname, query: Object.fromEntries(url.searchParams) };
}

function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]|^[\t\r\n]/.test(text)) text = "'" + text;
  return `"${text.replaceAll('"', '""')}"`;
}

export function exportCsv({ data }: { data: CategoryData }) {
  const rows = [["Rank", "USN", "Student name", "Department", "Batch", "CGPA (stored precision)", "Category", "CGPA range", "Placement eligibility"],
    ...data.students.map(s => [String(s.rank), s.enrollment_no, s.full_name, s.department_short_name ?? "", s.source_batch, s.cgpa, data.category.name, data.category.conditionLabel, placementStatus(s.placement_eligible)])];
  return { data: { filename: `dsu-${data.category.id}.csv`, rows: data.students.length,
    content: "\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n" } };
}

export function supabaseReadError(code: string) {
  const failures: Record<string, { status: number; message: string }> = {
    PT400: { status: 400, message: "Check the filters and try again." },
    PT401: { status: 401, message: "Please sign in again." },
    PGRST301: { status: 401, message: "Please sign in again." },
    PT403: { status: 403, message: "Your account does not have access to this information." },
    PT404: { status: 404, message: "The requested record was not found." },
    PT413: { status: 413, message: "Narrow the selection to at most 20,000 students." },
    PT429: { status: 429, message: "Please wait a moment before exporting again." },
    PGRST202: { status: 503, message: "The Supabase portal update has not been installed yet." },
  };
  return failures[code] ?? { status: 503, message: "We couldn’t read the student records from Supabase. Please try again." };
}
