// Students Ranking: response types and pure display helpers. Scores and ranks
// always come from the backend (placement.ranking_* functions); nothing here
// calculates a score.

export type RankingKind = "academic" | "dsa" | "github" | "developer" | "topic";
export type EvidenceState = "complete" | "partial" | "pending";
export type ComponentStatus =
  | "scored" | "stale" | "not_linked" | "hidden" | "pending" | "unavailable" | "disputed" | "missing" | "invalid" | "not_calculated";

export type RankingQuery = {
  kind?: RankingKind;
  topic?: string;
  batch?: string;
  department?: string;
  semester?: string;
  evidence?: EvidenceState;
  updated?: "7" | "30" | "older";
  show?: "ranked" | "all";
  search?: string;
  page?: string;
};

export type RankingTopic = { code: string; family: "dsa" | "software" | "core-cs" | "specialization"; label: string; source: "leetcode" | "github" | null; students?: number };

export type RankingOverview = {
  counts: {
    students: number; validCgpa: number; githubLinked: number; leetcodeLinked: number; dsaScored: number; githubScored: number;
    developerEligible: number; awaitingEvidence: number; notCalculated: number; lastCalculatedAt: string | null; oldestCalculatedAt: string | null;
  };
  options: { batches: string[]; departments: { code: string; name: string | null }[]; semesters: string[] };
  topics: RankingTopic[];
  model: { version: string; status: string; label: string; weights: { academic: number; dsa: number; github: number }; freshnessDays: number; activatedAt: string | null } | null;
};

export type RankingRow = {
  id: string; usn: string; name: string; department: string | null; departmentName: string | null; batch: string; semester: string | null;
  cgpa: string | null; rank: number | null; value: string | null;
  scores: { academic: number | null; dsa: number | null; github: number | null; developer: number | null };
  statuses: { academic: ComponentStatus; dsa: ComponentStatus; github: ComponentStatus; developer: ComponentStatus };
  contestRating: string | null;
  leetcodeNameMatch: "verified" | "unverified" | null;
  topic: { code: string; score: number | null; stale: boolean | null; evidence: TopicEvidence | null } | null;
  evidenceState: EvidenceState; coverage: number | null; calculatedAt: string | null; evidenceSyncedAt: string | null;
};
export type RankingList = {
  rows: RankingRow[];
  pagination: { total: number; page: number; limit: number };
  scope: { kind: RankingKind; topic: string | null; modelVersion: string | null; ranked: number; batch: string | null; department: string | null; semester: string | null };
};

export type TopicEvidence = {
  solved?: number; tags?: { tag: string; solved: number }[];
  repositories?: { name: string; url: string; score: number }[]; note?: string;
};
export type ComponentResult = { status: ComponentStatus; score: number | null; reason: string | null; explanation: Record<string, unknown> };
export type RepoPart = { earned: number; max: number; observedMax: number };
export type TopProject = { name: string; url: string; score: number; weight: number; parts: Record<string, RepoPart>; reasons: string[]; areas: string[]; organization?: boolean };
export type Position = { rank: number | null; of: number };
export type RankingStudent = {
  student: { id: string; usn: string; name: string; department: string | null; departmentName: string | null; batch: string; semester: string | null; cgpa: string | null };
  modelVersion: string | null;
  score: null | {
    academic: number | null; dsa: number | null; github: number | null; developer: number | null;
    statuses: { academic: ComponentStatus; dsa: ComponentStatus; github: ComponentStatus; developer: ComponentStatus };
    coverage: number; evidenceState: EvidenceState;
    explanation: { academic: ComponentResult; dsa: ComponentResult; github: ComponentResult; developer: ComponentResult };
    evidenceSyncedAt: string | null; calculatedAt: string;
  };
  positions: {
    academic: { university: Position; batch: Position; department: Position };
    dsa: { university: Position; batch: Position };
    github: { university: Position; batch: Position };
    developer: { university: Position; batch: Position };
  } | null;
  topics: (RankingTopic & { score: number | null; stale: boolean | null; evidence: TopicEvidence | null })[];
};

export const KINDS: { kind: RankingKind; label: string; value: string }[] = [
  { kind: "academic", label: "All students (CGPA)", value: "CGPA" },
  { kind: "dsa", label: "DSA / LeetCode", value: "DSA score" },
  { kind: "github", label: "GitHub projects", value: "GitHub score" },
  { kind: "developer", label: "Developer competency", value: "Developer score" },
  { kind: "topic", label: "Topic rankings", value: "Topic evidence" },
];

export const RULES: Record<RankingKind, string> = {
  academic: "Dense rank by official CGPA. A student without an official CGPA is not ranked.",
  dsa: "Dense rank by the DSA evidence score from verified LeetCode solved counts. Easy problems count up to 150; medium and hard problems carry more weight. Contest rating is shown but not scored.",
  github: "Dense rank by the GitHub engineering evidence score: the best three original public repositories against a published rubric, plus up to 5 points of breadth. Stars, forks and commit counts never add points.",
  developer: "Dense rank by the provisional developer score: 50% academic, 30% DSA, 20% GitHub. Only students with all three components current are ranked; nobody's weights are redistributed.",
  topic: "Dense rank by topic evidence. DSA topics use LeetCode problems solved with that tag; project areas use the strongest classified repository. This is evidence, not subject mastery.",
};

export const STATUS_LABELS: Record<ComponentStatus, string> = {
  scored: "Scored",
  stale: "Stale evidence",
  not_linked: "Not linked",
  hidden: "Not shared",
  pending: "Awaiting sync",
  unavailable: "Unavailable",
  disputed: "Disputed username",
  missing: "No CGPA",
  invalid: "Invalid CGPA",
  not_calculated: "Not calculated yet",
};
export const EVIDENCE_LABELS: Record<EvidenceState, string> = { complete: "Complete", partial: "Partial", pending: "Pending" };
export const FAMILY_LABELS: Record<RankingTopic["family"], string> = {
  dsa: "Data structures and algorithms",
  software: "Software engineering",
  "core-cs": "Core computer science",
  specialization: "Specializations",
};
export const PART_LABELS: Record<string, string> = {
  implementation: "Implementation and depth",
  organization: "Organization and maintainability",
  testing: "Testing and reliability",
  documentation: "Documentation and reproducibility",
  attribution: "Original contribution",
  maintenance: "Collaboration and maintenance",
};

/** First assessable topic in the taxonomy (ranking.topics position 1). */
export const DEFAULT_TOPIC = "dsa.arrays";

export const kindOf = (value: string | undefined): RankingKind =>
  (KINDS.some((k) => k.kind === value) ? value : "academic") as RankingKind;

const pick = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
/** Reads only the documented filters from the URL; unknown values are dropped. */
export function rankingQuery(params: Record<string, string | string[] | undefined>): RankingQuery {
  const q: RankingQuery = { kind: kindOf(pick(params.kind)) };
  const topic = pick(params.topic);
  if (q.kind === "topic" && topic && /^[a-z]+\.[a-z0-9-]{2,40}$/.test(topic)) q.topic = topic;
  const batch = pick(params.batch);
  if (batch && /^20\d{2}$/.test(batch)) q.batch = batch;
  const department = pick(params.department);
  if (department && department.length <= 200) q.department = department;
  const semester = pick(params.semester);
  if (semester && semester.length <= 20) q.semester = semester;
  const evidence = pick(params.evidence);
  if (evidence === "complete" || evidence === "partial" || evidence === "pending") q.evidence = evidence;
  const updated = pick(params.updated);
  if (updated === "7" || updated === "30" || updated === "older") q.updated = updated;
  if (pick(params.show) === "all") q.show = "all";
  const search = pick(params.search);
  if (search) q.search = search.slice(0, 100);
  const page = pick(params.page);
  if (page && /^[1-9]\d{0,5}$/.test(page)) q.page = page;
  return q;
}

export function rankingHref(q: RankingQuery, path = "/placement/students-ranking") {
  const params = new URLSearchParams(
    Object.entries(q).filter((e): e is [string, string] => typeof e[1] === "string" && e[1] !== "" && !(e[0] === "kind" && e[1] === "academic")),
  );
  return params.size ? `${path}?${params}` : path;
}

export const formatScore = (value: number | string | null | undefined) =>
  value === null || value === undefined || value === "" ? null : Number(value).toFixed(1);

export function formatWhen(value: string | null | undefined) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(date);
}

export const departmentLabel = (code: string | null, name?: string | null) =>
  !code || code === "__missing__" ? "Not recorded" : name && name !== code ? `${code} (${name})` : code;

/** Why a row has no rank in the selected view. */
export function unrankedReason(row: RankingRow, kind: RankingKind) {
  if (kind === "academic") return row.cgpa === null ? STATUS_LABELS.missing : "Not ranked";
  if (kind === "topic") return "Insufficient verified evidence";
  const status = row.statuses[kind];
  return status === "pending" && kind === "developer" ? "Pending score" : STATUS_LABELS[status] ?? "Not ranked";
}
