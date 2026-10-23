// Student Skills Intelligence: officer response types and pure helpers.
// No server-only imports, so pages, client-rendered harnesses and unit tests
// can all use these. Shapes follow DSU-Backend docs/STUDENT-INTELLIGENCE.md
// (sections 5 and 6) and src/modules/intelligence/profile-service.js.

export const CATEGORY_IDS = ["advanced", "medium", "needs-improvement"] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];
export const isCategory = (value: unknown): value is CategoryId =>
  typeof value === "string" && (CATEGORY_IDS as readonly string[]).includes(value);

export type Provenance =
  | "institution_verified"
  | "platform_verified"
  | "student_submitted"
  | "ai_generated"
  | "unavailable";
export const PROVENANCE_ORDER: Provenance[] = [
  "institution_verified",
  "platform_verified",
  "student_submitted",
  "ai_generated",
  "unavailable",
];
export const PROVENANCE_LABELS: Record<Provenance, string> = {
  institution_verified: "Institution verified",
  platform_verified: "Platform verified",
  student_submitted: "Student submitted",
  ai_generated: "AI generated",
  unavailable: "Unavailable",
};
export const provenanceLabel = (value: unknown) =>
  PROVENANCE_LABELS[value as Provenance] ?? "Unavailable";

export type SkillStatus = "complete" | "incomplete" | "not_started";
export const SKILL_STATUS_LABELS: Record<SkillStatus, string> = {
  complete: "Complete",
  incomplete: "Incomplete",
  not_started: "Not started",
};
export const skillStatusLabel = (value: unknown) =>
  SKILL_STATUS_LABELS[value as SkillStatus] ?? "Not started";
/** What each skill profile status means (the backend's student.skill_status). */
export const SKILL_STATUS_DETAILS: Record<SkillStatus, string> = {
  complete: "Skills onboarding is complete and GitHub, LeetCode, and LinkedIn are linked.",
  incomplete: "Skills onboarding is not finished, or a required platform was disconnected after it was finished.",
  not_started: "The student has not started skills onboarding.",
};
export const skillStatusDetail = (value: unknown) =>
  SKILL_STATUS_DETAILS[value as SkillStatus] ?? SKILL_STATUS_DETAILS.not_started;
export const eligibilityLabel = (value: unknown) =>
  value === true ? "Eligible" : value === false ? "Not eligible" : "CGPA not recorded";

// ---- Response shapes ------------------------------------------------------
export type CategoryCard = {
  id: CategoryId;
  name: string;
  range: string;
  total: number;
  cohortPercentage: number | string | null;
  averageCgpa: string | null;
  eligible: number;
  eligibilityPercentage: number | string | null;
};
export type CategoriesResponse = {
  batch: string | null;
  batches: string[];
  departments: string[];
  total: number;
  unclassified: number;
  cards: CategoryCard[] | null;
};
export type DirectoryRow = {
  id: string;
  usn: string;
  name: string;
  department: string | null;
  batch: string | null;
  semester: string | number | null;
  cgpa: string | null;
  category: CategoryId;
  eligible: boolean | null;
  categoryRank: number | null;
  batchRank: number | null;
  skillStatus: SkillStatus;
  profileUrl: string;
};
export type DirectoryResponse = {
  rows: DirectoryRow[];
  pagination: { total: number; page: number; limit: number };
  scope: { batch: string | null; category: CategoryId; rule: string };
};
export type ChartKpis = {
  totalStudents: number;
  eligible: number;
  placed: number;
  placementRate: number | string | null;
  eligiblePlaced: number;
  eligiblePlacementRate: number | string | null;
  companies: number;
  activeDrives: number;
  acceptedOffers: number;
  activeOffers: number;
  averageCgpa: string | null;
};
export type ProgressPoint = {
  month: string;
  studentsPlaced: number;
  offersRecorded: number;
  drivesCompleted: number;
};
export type StatusSegment = { key: string; label: string; count: number };
export type DepartmentBar = {
  department: string | null;
  total: number;
  eligible: number;
  placed: number;
};
export type OverviewCharts = {
  filters: { batch: string | null; department: string | null };
  kpis: ChartKpis;
  progress: ProgressPoint[];
  status: StatusSegment[];
  departments: DepartmentBar[];
  definitions: Record<string, string>;
};
export type Metric = {
  metric: string;
  label: string;
  value: unknown;
  verification: Provenance | string | null;
  method?: string | null;
  collectedAt?: string | null;
  note?: string | null;
};
export type Account = {
  platform: string;
  state: string;
  handle: string | null;
  profileUrl: string | null;
  authMethod?: string | null;
  ownership: Provenance | null;
  visible?: boolean;
  syncStatus?: string | null;
  syncError?: string | null;
  lastSyncedAt?: string | null;
  submitted: Record<string, unknown>;
  metrics: Metric[];
};
export type RepoCard = {
  name: string;
  fullName?: string | null;
  url?: string | null;
  description?: string | null;
  primaryLanguage?: string | null;
  stars?: number | null;
  pushedAt?: string | null;
  hasReadme?: boolean | null;
};
export type Featured = {
  position: number;
  source: "github_pinned" | "student_selected" | string;
  repo: RepoCard;
};
export type Ranking = {
  batchRank: number | null;
  categoryRank: number | null;
  batchSize: number | null;
  categorySize: number | null;
  scope: string;
};
export type ReadinessItem = {
  key: string;
  label: string;
  state: "met" | "missing" | "unavailable";
  detail: string;
  provenance: Provenance;
};
export type Summary = {
  id: string;
  createdAt: string | null;
  model: string | null;
  content: { summary?: { text?: string } } & Record<string, unknown>;
  reviewedAt: string | null;
  provenance: "ai_generated";
} | null;
export type StudentIntelligence = {
  core: {
    id: string;
    usn: string;
    name: string;
    department: string | null;
    departmentName: string | null;
    program: string | null;
    batch: string | null;
    semester: string | number | null;
    cgpa: string | null;
    category: CategoryId | null;
    categoryLabel: string | null;
    eligible: boolean | null;
    skillStatus?: SkillStatus;
    ranking: Ranking;
    provenance: Provenance;
  };
  ranking: Ranking;
  skills: {
    visibility: { platforms: boolean; projects: boolean; activity: boolean; summary: boolean };
    // consented: the student completed onboarding, which is their consent to
    // share platform details. Before it only per-platform state is returned.
    onboarding: { complete: boolean; completedAt?: string | null; consented?: boolean };
    accounts: Account[];
    featured: Featured[];
    repositories: RepoCard[];
    activity: Metric[];
  };
  summary: Summary;
  /** The latest summary used information the student has since hidden, so it is not returned. */
  summaryWithheld?: boolean;
  readiness: { status: "descriptive"; items: ReadinessItem[] };
  provenance: Partial<Record<Provenance, string>>;
  purpose: string;
};

// ---- Formatting -------------------------------------------------------------
const finite = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
export const formatCount = (value: unknown) => {
  const n = finite(value);
  return n === null ? "Not available" : n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};
/** 12.5 -> "12.5%". Missing values are said, never shown as 0. */
export const formatPercent = (value: unknown, digits = 1) => {
  const n = finite(value);
  return n === null ? "Not available" : `${n.toFixed(digits)}%`;
};
/** CGPA rounded to 2 decimals for summaries (averages). */
export const formatCgpa = (value: unknown) => {
  const n = finite(value);
  return n === null ? "Not available" : n.toFixed(2);
};
/** Official CGPA exactly as recorded (text from the ERP). */
export const exactCgpa = (value: unknown) =>
  value === null || value === undefined || value === "" ? "Not recorded" : String(value);
/** "3 of 6", or "Not ranked" with a short reason where there is room for one. */
export const rankText = (rank: number | null | undefined, size?: number | null, reason?: string) =>
  rank === null || rank === undefined
    ? reason ? `Not ranked (${reason})` : "Not ranked"
    : size ? `${rank} of ${size}` : String(rank);
/** Why a rank is missing: ranks are by official CGPA only. */
export const rankReason = (cgpa: unknown) =>
  cgpa === null || cgpa === undefined || String(cgpa).trim() === "" ? "CGPA not recorded" : undefined;

/**
 * What the officer may see of a student's skills data. Consent is given by
 * completing skills onboarding; until then the backend returns only
 * per-platform state. Older backends without the flag share once complete.
 */
export function officerSharing(profile: Pick<StudentIntelligence, "skills" | "summaryWithheld">) {
  const onboarding = profile.skills?.onboarding;
  const consented = typeof onboarding?.consented === "boolean" ? onboarding.consented : onboarding?.complete === true;
  return { consented, summaryWithheld: consented && profile.summaryWithheld === true };
}

// GitHub activity metrics (backend METRIC_LABELS). activity.calendar is a day
// by day series and is never rendered as text.
export const ACTIVITY_METRICS: { metric: string; label: string }[] = [
  { metric: "contributions.total_12m", label: "Contributions (last 12 months)" },
  { metric: "contributions.commits_12m", label: "Commits (last 12 months)" },
  { metric: "contributions.private_12m", label: "Private contributions (last 12 months)" },
  { metric: "contributions.lines_added_52w", label: "Lines added (last 52 weeks)" },
  { metric: "activity.current_streak", label: "Current contribution streak (days)" },
  { metric: "activity.longest_streak", label: "Longest contribution streak (days)" },
  { metric: "activity.active_days", label: "Active days (last 12 months)" },
];
export const HIDDEN_METRICS = new Set(["activity.calendar"]);
const count = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);
/**
 * contributions.lines_added_52w is {value, counted, eligible, pending}:
 * "18,240 lines (8 of 10 repositories counted)", noting a partial count and
 * repositories still pending.
 */
export function linesAddedText(raw: unknown): string {
  const v = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : { value: raw };
  const lines = count(typeof v.value === "string" ? Number(v.value) : v.value);
  if (lines === null) return "Unavailable";
  const counted = count(v.counted), eligible = count(v.eligible), pending = count(v.pending) ?? 0;
  const text = `${lines.toLocaleString("en-IN")} ${lines === 1 ? "line" : "lines"}`;
  if (counted === null || eligible === null) return text;
  const notes = [`${counted} of ${eligible} ${eligible === 1 ? "repository" : "repositories"} counted`];
  if (counted < eligible || pending > 0) notes.push(pending > 0 ? `partial, ${pending} pending` : "partial");
  return `${text} (${notes.join("; ")})`;
}
/** Display text for one metric, with the special shapes handled. */
export function metricValueText(metric: Pick<Metric, "metric" | "value">): string {
  if (metric.metric === "contributions.lines_added_52w") return linesAddedText(metric.value);
  return metricText(metric.value);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-08" -> "Aug 2026". */
export function monthLabel(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return month;
  return `${MONTHS[Number(match[2]) - 1] ?? match[2]} ${match[1]}`;
}
export function formatDate(value: unknown) {
  if (typeof value !== "string" || !value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}
export function initials(name: unknown) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
// Only absolute https URLs from the API are ever linked. The rule lives in a
// shared module so the student workspace links external data the same way.
export { safeHttps } from "../../../shared/http/safe-url";
/** A metric value as display text (numbers grouped, lists joined). */
export function metricText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Unavailable";
  if (Array.isArray(value)) return value.map(metricText).join(", ") || "Unavailable";
  if (typeof value === "number") return value.toLocaleString("en-IN");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return entries.map(([k, v]) => `${k}: ${metricText(v)}`).join(", ") || "Unavailable";
  }
  const text = String(value);
  return /^-?\d+(\.\d+)?$/.test(text) ? Number(text).toLocaleString("en-IN") : text;
}

/** Share of primary languages across the repositories shown, largest first. */
export function languageShare(repos: RepoCard[]) {
  const counts = new Map<string, number>();
  for (const repo of repos)
    if (repo.primaryLanguage) counts.set(repo.primaryLanguage, (counts.get(repo.primaryLanguage) ?? 0) + 1);
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const percents = roundedPercents(sorted.map(([, n]) => n));
  return sorted.map(([language, count], i) => ({ language, count, percent: percents[i], total }));
}

// ---- Directory query --------------------------------------------------------
export type DirectoryQuery = Partial<
  Record<"batch" | "department" | "search" | "eligibility" | "skill" | "sort" | "direction" | "page", string>
>;
const ENUMS: Record<string, readonly string[]> = {
  eligibility: ["eligible", "ineligible"],
  skill: ["complete", "incomplete", "not_started"],
  sort: ["rank", "name", "usn", "cgpa"],
  direction: ["asc", "desc"],
};
/** Validated subset of search params accepted by the directory endpoint. */
export function directoryQuery(params: Record<string, string | string[] | undefined>): DirectoryQuery {
  const one = (key: string) => {
    const v = params[key];
    return typeof v === "string" ? v.trim() : "";
  };
  const q: DirectoryQuery = {};
  const batch = one("batch");
  if (/^20\d{2}$/.test(batch)) q.batch = batch;
  const department = one("department");
  if (department && department.length <= 200) q.department = department;
  const search = one("search").slice(0, 100);
  if (search) q.search = search;
  for (const key of ["eligibility", "skill", "sort", "direction"] as const) {
    const v = one(key);
    if (ENUMS[key].includes(v)) q[key] = v;
  }
  const page = one("page");
  if (/^[1-9]\d{0,5}$/.test(page)) q.page = page;
  return q;
}
/** Cohort filters accepted by the categories and overview charts endpoints. */
export function cohortQuery(params: Record<string, string | string[] | undefined>) {
  const q = directoryQuery(params);
  return Object.fromEntries(
    Object.entries({ batch: q.batch, department: q.department }).filter(([, v]) => v),
  ) as { batch?: string; department?: string };
}
export function withQuery(path: string, query: Record<string, string | undefined>) {
  const q = new URLSearchParams(
    Object.entries(query).filter((e): e is [string, string] => !!e[1]),
  );
  return q.size ? `${path}?${q}` : path;
}
export const directoryHref = (category: string, query: Record<string, string | undefined> = {}) =>
  withQuery(`/placement/categories/${encodeURIComponent(category)}`, query);
export const rankedExportHref = (category: string, query: Record<string, string | undefined> = {}) =>
  withQuery("/placement/export/ranked", { category, ...query, page: undefined });

// ---- Ranked CSV ---------------------------------------------------------------
export const RANKED_HEADERS = [
  "Category rank",
  "Batch rank",
  "USN",
  "Name",
  "Department",
  "Batch",
  "Semester",
  "CGPA",
  "Placement eligible",
  "Skill profile status",
];
/** Rows for csv(); ids and profile URLs are deliberately left out. */
export function rankedCsvRows(rows: DirectoryRow[]): unknown[][] {
  return rows.map((r) => [
    r.categoryRank ?? "Not ranked",
    r.batchRank ?? "Not ranked",
    r.usn,
    r.name,
    r.department,
    r.batch,
    r.semester,
    r.cgpa,
    r.eligible === true ? "Yes" : r.eligible === false ? "No" : "Unknown",
    skillStatusLabel(r.skillStatus),
  ]);
}
export function rankedFilename(category: CategoryId, batch: unknown) {
  const b = typeof batch === "string" && /^20\d{2}$/.test(batch) ? batch : "all";
  return `dsu-${category}-${b}-ranked.csv`;
}

// ---- Chart geometry --------------------------------------------------------------
/**
 * Percentages rounded to one decimal that always add up to exactly 100.0
 * (largest remainder), so a donut legend never reads 99.9% or 100.1%.
 */
export function roundedPercents(counts: number[], digits = 1): number[] {
  const total = counts.reduce((a, b) => a + Math.max(0, b), 0);
  if (!total) return counts.map(() => 0);
  const scale = 10 ** digits;
  const raw = counts.map((c) => (Math.max(0, c) / total) * 100 * scale);
  const floors = raw.map(Math.floor);
  let rest = 100 * scale - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - floors[i] }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (rest <= 0) break;
    floors[i] += 1;
    rest -= 1;
  }
  return floors.map((f) => f / scale);
}
export type Arc = { index: number; start: number; end: number; path: string; percent: number; count: number };
const polar = (cx: number, cy: number, r: number, angle: number) => [
  cx + r * Math.sin(angle),
  cy - r * Math.cos(angle),
];
const round = (n: number) => Math.round(n * 1000) / 1000;
/** Ring segments (angles in radians from 12 o'clock, clockwise). */
export function donutArcs(counts: number[], cx: number, cy: number, outer: number, inner: number): Arc[] {
  const total = counts.reduce((a, b) => a + Math.max(0, b), 0);
  const percents = roundedPercents(counts);
  if (!total) return [];
  let angle = 0;
  const arcs: Arc[] = [];
  counts.forEach((count, index) => {
    if (count <= 0) return;
    const sweep = (count / total) * Math.PI * 2;
    const start = angle,
      end = angle + sweep;
    angle = end;
    let path: string;
    if (sweep >= Math.PI * 2 - 1e-9) {
      // A full ring cannot be one arc; draw two halves.
      const [ox1, oy1] = polar(cx, cy, outer, 0), [ox2, oy2] = polar(cx, cy, outer, Math.PI);
      const [ix1, iy1] = polar(cx, cy, inner, 0), [ix2, iy2] = polar(cx, cy, inner, Math.PI);
      path = `M${round(ox1)} ${round(oy1)}A${outer} ${outer} 0 1 1 ${round(ox2)} ${round(oy2)}A${outer} ${outer} 0 1 1 ${round(ox1)} ${round(oy1)}` +
        `M${round(ix1)} ${round(iy1)}A${inner} ${inner} 0 1 0 ${round(ix2)} ${round(iy2)}A${inner} ${inner} 0 1 0 ${round(ix1)} ${round(iy1)}Z`;
    } else {
      const large = sweep > Math.PI ? 1 : 0;
      const [x1, y1] = polar(cx, cy, outer, start), [x2, y2] = polar(cx, cy, outer, end);
      const [x3, y3] = polar(cx, cy, inner, end), [x4, y4] = polar(cx, cy, inner, start);
      path = `M${round(x1)} ${round(y1)}A${outer} ${outer} 0 ${large} 1 ${round(x2)} ${round(y2)}` +
        `L${round(x3)} ${round(y3)}A${inner} ${inner} 0 ${large} 0 ${round(x4)} ${round(y4)}Z`;
    }
    arcs.push({ index, start, end, path, percent: percents[index], count });
  });
  return arcs;
}
/** A rounded axis maximum (1, 2, 2.5, 5 x 10^k) with integer ticks. */
export function niceScale(max: number, target = 4): { max: number; ticks: number[] } {
  if (!Number.isFinite(max) || max <= 0) return { max: 1, ticks: [0, 1] };
  const rough = max / target;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(1, [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough) ?? 10 * power);
  const integerStep = Math.ceil(step);
  const top = Math.ceil(max / integerStep) * integerStep;
  const ticks: number[] = [];
  for (let t = 0; t <= top; t += integerStep) ticks.push(t);
  return { max: top, ticks };
}
/** A chart count: finite and never negative, so the plot and its data table agree. */
export function chartCount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
/** Point positions in percent of the plot box (x: 0..100 left to right, y: 0..100 top to bottom). */
export function linePoints(values: number[], max: number) {
  const n = values.length;
  return values.map((v, i) => ({
    x: n <= 1 ? 50 : (i / (n - 1)) * 100,
    y: 100 - (chartCount(v) / (max || 1)) * 100,
    value: v,
  }));
}
/** Which month labels to show so at most `room` labels appear. */
export function labelEvery(count: number, room: number) {
  return Math.max(1, Math.ceil(count / Math.max(1, room)));
}
