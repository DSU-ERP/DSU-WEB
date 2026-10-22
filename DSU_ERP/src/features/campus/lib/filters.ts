import type { Filters } from "./types";
export type SearchParams = Record<string, string | string[] | undefined>;
export function analyticsFilters(params: SearchParams): Filters {
  return {
    ...(typeof params.batch === "string" && /^20\d{2}$/.test(params.batch)
      ? { batch: params.batch }
      : {}),
    ...(typeof params.department === "string" && params.department.trim()
      ? { department: params.department.trim().slice(0, 200) }
      : {}),
    ...(typeof params.search === "string" && params.search.trim()
      ? { search: params.search.trim().slice(0, 100) }
      : {}),
  };
}
export function filterQuery(filters: Filters) {
  return new URLSearchParams(
    Object.entries(filters).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string" && !!entry[1],
    ),
  );
}
export function selectedPage(value: SearchParams[string]) {
  return typeof value === "string" && /^\d+$/.test(value)
    ? Math.min(100000, Math.max(1, Number(value)))
    : 1;
}
export const formatCount = (value: number) => value.toLocaleString("en-IN");
export const formatCgpa = (value: string | null) =>
  value === null ? "—" : Number(value).toFixed(2);
export const formatPercent = (value: number | null) =>
  value === null ? "—" : `${value.toFixed(1)}%`;
