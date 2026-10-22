export type Json =
  string | number | boolean | null | Json[] | { [key: string]: Json };
export type Row = Record<string, Json>;
export type Query = Record<string, string>;
export type OfficerSession = { id: string; role: "placement_officer" };
export type Report = {
  rows: Row[];
  summary?: Row;
  options: {
    batches: string[];
    departments: string[];
    quotas: string[];
    industries: string[];
    policy: { label: string; minimumCgpa: string };
    categories: Row[];
  };
  pagination: { total: number; page: number; limit: number };
  [key: string]: unknown;
};
export const SECTIONS = {
  overview: { title: "Placement overview", resource: "overview" },
  companies: { title: "Company management", resource: "companies" },
  drives: { title: "Placement drives", resource: "drives" },
  offers: { title: "Offers & placed students", resource: "offers" },
  "company-reports": { title: "Company reports", resource: "company-reports" },
  "multiple-offers": { title: "Multiple-offer tracking", resource: "multiple-offers" },
  departments: { title: "Department intelligence", resource: "departments" },
  batch: { title: "Batch analytics", resource: "batch" },
  tests: { title: "Master test results", resource: "tests" },
} as const;
export type Section = keyof typeof SECTIONS;
export const PACKAGES = ["regular", "dream", "super-dream", "mega"];
// Suggested job categories; officers can also type their own.
export const JOB_CATEGORIES = [
  "Software / IT",
  "Data & analytics",
  "Core engineering",
  "Electronics & hardware",
  "Consulting",
  "Finance & banking",
  "Sales & marketing",
  "Operations & supply chain",
  "Product & design",
  "Research & development",
  "Teaching & education",
  "Other",
];
export const EMPLOYMENT_TYPES = ["full-time", "internship", "internship-ppo", "contract"];
export const STATUSES = ["upcoming", "ongoing", "completed", "cancelled"];
export const text = (value: unknown) =>
  value === null || value === undefined || value === ""
    ? "—"
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
export const number = (value: unknown, precision = 0) =>
  value === null || value === undefined || value === ""
    ? "—"
    : Number(value).toLocaleString("en-IN", {
        maximumFractionDigits: precision,
      });
export const label = (value: string) =>
  value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/^./, (c) => c.toUpperCase());
export function queryFrom(
  params: Record<string, string | string[] | undefined>,
): Query {
  const allowed = [
    "batch",
    "department",
    "search",
    "quota",
    "category",
    "eligibility",
    "page",
    "sort",
    "direction",
    "status",
    "package",
    "industry",
    "active",
    "inactive",
    "pool",
    "round",
    "readiness",
    "risk",
    "language",
    "missing",
    "classification",
    "violation",
    "company",
    "minimum",
  ];
  return Object.fromEntries(
    allowed.flatMap((key) =>
      typeof params[key] === "string" && params[key].trim()
        ? [[key, params[key].trim().slice(0, 200)]]
        : [],
    ),
  );
}
export function href(
  path: string,
  query: Query,
  changes: Record<string, string | undefined> = {},
) {
  const q = new URLSearchParams(
    Object.entries({ ...query, ...changes }).filter(
      (entry): entry is [string, string] => !!entry[1],
    ),
  );
  return `/placement/${path}${q.size ? `?${q}` : ""}`;
}
export function csv(headers: string[], rows: unknown[][]) {
  const cell = (value: unknown) => {
    let result = value === null || value === undefined ? "" : String(value);
    if (/^[\s]*[=+@-]|^[\t\r\n]/.test(result)) result = "'" + result;
    return `"${result.replaceAll('"', '""')}"`;
  };
  return (
    "\uFEFF" +
    [headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n") +
    "\r\n"
  );
}
