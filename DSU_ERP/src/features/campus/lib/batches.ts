import { analyticsFilters, selectedPage, type SearchParams } from "./filters";
import type { Category } from "./types";
import { placementStatus } from './placement';
export const SORTS = {
  cgpa: "CGPA",
  name: "Name",
  usn: "USN",
  sgpa: "SGPA",
  attendance: "Attendance",
  backlogs: "Backlogs",
  semester: "Semester",
};
export function batchFilters(params: SearchParams) {
  const filters: Record<string, string> = { ...analyticsFilters(params) };
  for (const key of ["quota", "category"] as const) {
    const value = params[key];
    if (typeof value === "string" && value.trim())
      filters[key] = value.trim().slice(0, 200);
  }
  if (
    filters.category &&
    !["advanced", "medium", "needs-improvement", "unclassified"].includes(
      filters.category,
    )
  )
    delete filters.category;
  filters.sort =
    typeof params.sort === "string" && Object.hasOwn(SORTS, params.sort)
      ? params.sort
      : "cgpa";
  filters.direction = params.direction === "asc" ? "asc" : "desc";
  return filters;
}
export function batchQuery(
  filters: Record<string, string>,
  changes: Record<string, string | undefined> = {},
) {
  return new URLSearchParams(
    Object.entries({ ...filters, ...changes }).filter(
      (e): e is [string, string] => !!e[1],
    ),
  );
}
export { selectedPage };
export type BatchSummary = {
  total: number;
  valid: number;
  unclassified: number;
  male: number | null;
  female: number | null;
  gender_other: number | null;
  at_least_six: number;
  below_six: number;
  average_cgpa: string | null;
  eligible: number;
  not_eligible: number;
};
export type BatchStudent = {
  id: string;
  enrollment_no: string;
  full_name: string;
  department_short_name: string | null;
  source_batch: string;
  current_semester: string | null;
  current_batch: string | null;
  admission_quota: string | null;
  gender: string | null;
  cgpa: string | null;
  sgpa: string | null;
  attendance: string | null;
  current_backlog: number | null;
  status: string | null;
  category_id: string | null;
  placement_eligible: boolean | null;
};
export type BatchView = {
  batch: string | null;
  summary: BatchSummary;
  departments: (BatchSummary & {
    department_short_name: string | null;
    quotas: Record<string, number>;
  })[];
  options: {
    batches: string[];
    departments: string[];
    missing_department: boolean;
    quotas: string[];
    missing_quota: boolean;
  };
  categories: Category[];
  genderAvailable: boolean;
  placementConfigured: boolean;
  placementPolicy: {configured: boolean;minimumCgpa: string;label:string};
  students: BatchStudent[];
  pagination: { total: number; page: number; limit: number };
};
export type StudentDetail = {
  id: string;
  full_name: string;
  enrollment_no: string;
  course_name: string | null;
  department_name: string | null;
  admission_year: string | null;
  admission_academic_year: string | null;
  admission_type: string | null;
  admission_quota: string | null;
  current_semester: string | null;
  exam_semester: string | null;
  current_batch: string | null;
  current_division: string | null;
  status: string | null;
  source_batch: string;
  display_no: string | null;
  course_short_name: string | null;
  department_short_name: string | null;
  academic: Record<string, string | number | null> | null;
  contact: Record<string, string | null> | null;
  fees: Record<string, string | null> | null;
  placement_eligible: boolean | null;
  placementPolicy: {configured: boolean;minimumCgpa: string;label:string};
};
export function batchCsv(data: BatchView) {
  const cell = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[\s]*[=+@-]|^[\t\r\n]/.test(text)) text = "'" + text;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const rows: unknown[][] = [
    [
      "USN",
      "Name",
      "Department",
      "Source batch",
      "Gender",
      "Semester",
      "Class batch",
      "Quota",
      "CGPA (stored precision)",
      "SGPA",
      "Attendance (%)",
      "Current backlogs",
      "Student status",
      "Placement eligibility",
    ],
  ];
  for (const s of data.students)
    rows.push([
      s.enrollment_no,
      s.full_name,
      s.department_short_name,
      s.source_batch,
      s.gender,
      s.current_semester,
      s.current_batch,
      s.admission_quota,
      s.cgpa,
      s.sgpa,
      s.attendance,
      s.current_backlog,
      s.status,
      placementStatus(s.placement_eligible),
    ]);
  return (
    "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n"
  );
}
