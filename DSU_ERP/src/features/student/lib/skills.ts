// Student Skills Intelligence: shared types and pure helpers. No browser or
// server APIs here, so the same rules render on the server, in the browser and
// in unit tests. Shapes follow GET /student/skills/profile in the backend
// (docs/STUDENT-INTELLIGENCE.md section 4). Validation mirrors the backend's
// platforms.js so students see the same rule before a round trip; the backend
// remains the authority.

export const PLATFORMS = ["github", "leetcode", "hackerrank", "linkedin", "huggingface", "kaggle"] as const;
export type Platform = (typeof PLATFORMS)[number];
export const REQUIRED_PLATFORMS: readonly Platform[] = ["github", "leetcode", "linkedin"];
export const OPTIONAL_PLATFORMS: readonly Platform[] = ["hackerrank", "huggingface", "kaggle"];
export const PLATFORM_LABELS: Record<Platform, string> = {
  github: "GitHub",
  leetcode: "LeetCode",
  hackerrank: "HackerRank",
  linkedin: "LinkedIn",
  huggingface: "Hugging Face",
  kaggle: "Kaggle",
};
export const isPlatform = (value: unknown): value is Platform => PLATFORMS.includes(value as Platform);

export type Provenance = "institution_verified" | "platform_verified" | "student_submitted" | "ai_generated" | "unavailable";
export type SyncStatus = "not_applicable" | "pending" | "running" | "completed" | "partial" | "failed" | "unavailable";
export type AccountState = "linked" | "declared_none" | "disconnected";

export type SkillMetric = {
  metric: string;
  label: string;
  value: unknown;
  verification: Provenance | string;
  method?: string | null;
  collectedAt?: string | null;
  note?: string | null;
};
export type PlatformAccount = {
  platform: Platform;
  state: AccountState;
  handle: string | null;
  profileUrl: string | null;
  authMethod: "github_app" | "github_pat" | "public_api" | "link_only" | "none" | null;
  ownership: Provenance | null;
  visible: boolean;
  syncStatus: SyncStatus | null;
  syncError: string | null;
  lastSyncedAt: string | null;
  /** LeetCode only: the username or LeetCode profile name matches the official name. */
  nameMatch?: "verified" | "unverified" | null;
  submitted: Submitted;
  metrics: SkillMetric[];
};
export type Repository = {
  repoId: string;
  name: string;
  fullName: string;
  url?: string;
  description?: string | null;
  primaryLanguage?: string | null;
  stars?: number | null;
  pushedAt?: string | null;
  hasReadme?: boolean | null;
  pinned?: boolean;
  pinOrder?: number | null;
  recommendationScore?: number | null;
  topics?: string[] | null;
  isFork?: boolean;
  isArchived?: boolean;
  recommendationReasons?: string[] | null;
};
export type FeaturedProject = { position: number; source: "github_pinned" | "student_selected"; repo: Repository };
export type Visibility = { platforms: boolean; projects: boolean; activity: boolean; summary: boolean };
export const VISIBILITY_KEYS: (keyof Visibility)[] = ["platforms", "projects", "activity", "summary"];
export type SectionKey = "identity" | Platform | "visibility";
export type OnboardingStatus = {
  version: number;
  currentVersion: number;
  complete: boolean;
  completedAt: string | null;
  identityConfirmedAt: string | null;
  consentedAt: string | null;
  sections: Partial<Record<SectionKey, boolean>>;
  missing: SectionKey[];
};
export type Academic = {
  name: string;
  usn: string;
  department: string | null;
  departmentName: string | null;
  program: string | null;
  batch: string | null;
  semester: string | number | null;
  cgpa: string | number | null;
  category: string | null;
  categoryLabel: string | null;
  eligible: boolean | null;
  provenance: "institution_verified";
};
export type Ranking = { batchRank: number | null; categoryRank: number | null; batchSize: number | null; categorySize: number | null; scope: "batch" };
export type Cited = { evidence: string[] };
export type SummaryContent = {
  summary: ({ text: string } & Cited) | null;
  skills: ({ name: string } & Cited)[];
  projects: ({ name: string } & Cited)[];
  academicStrengths: ({ text: string } & Cited)[];
  achievements: ({ text: string } & Cited)[];
  developmentAreas: ({ text: string } & Cited)[];
  potentialRoles: ({ role: string; rationale: string } & Cited)[];
  rolesNote?: string;
};
export type EvidenceItem = { id: string; kind: string; label: string; value: string; provenance: Provenance | string; platform?: string };
export type SkillSummary = {
  id: string;
  createdAt: string | null;
  model: string | null;
  content: Partial<SummaryContent>;
  evidence: EvidenceItem[];
  reviewedAt: string | null;
  hidden?: boolean;
  cached?: boolean;
  provenance: "ai_generated";
};
export type ReadinessItem = { key: string; label: string; state: "met" | "missing" | "unavailable"; detail: string; provenance: Provenance | string };
export type SkillsProfile = {
  academic: Academic;
  ranking: Ranking;
  onboarding: OnboardingStatus;
  visibility: Visibility;
  accounts: PlatformAccount[];
  github: { repositories: Repository[]; featured: FeaturedProject[]; pinned: Repository[]; activity: SkillMetric[] };
  summary: SkillSummary | null;
  readiness: { status: "descriptive"; items: ReadinessItem[] };
  revision: number;
};

// ---- Gate -------------------------------------------------------------------
export type GateState = {
  role: string | null;
  onboardingRequired?: boolean;
  /**
   * Registration at /onboarding (the student profile's `onboarded`). Undefined
   * when the caller does not know it, for example the layout, which only reads
   * /session; the /student landing page always passes it.
   */
  registered?: boolean;
};
/**
 * The one ordering for where a student belongs: registration (/onboarding)
 * first, then skills onboarding (/student/onboarding), then the workspace.
 * `segments` are the path parts after /student. Returns where to send the
 * student, or null to stay. While skills onboarding is required every student
 * page except the onboarding flow is redirected; once complete, the
 * onboarding page goes to the dashboard. The /student landing page itself is
 * decided only with the registration state, so callers without it (the
 * layout) leave it to the page. Route handlers (the API proxy and the GitHub
 * callback) never pass through this gate.
 */
export function skillsGateRedirect(access: GateState, segments: string[]): string | null {
  if (access.role !== "student") return null;
  const required = access.onboardingRequired === true;
  const unregistered = access.registered === false;
  if (!segments.length) {
    if (access.registered === undefined) return null;
    return unregistered ? "/onboarding" : required ? "/student/onboarding" : "/student/dashboard";
  }
  if (segments[0] === "onboarding") return required ? (unregistered ? "/onboarding" : null) : "/student/dashboard";
  return required ? (unregistered ? "/onboarding" : "/student/onboarding") : null;
}

/** Request header the proxy sets on /student pages so the layout knows the path. */
export const PATHNAME_HEADER = "x-dsu-pathname";
/** Path parts after /student, or null when the value is not a student page path. */
export function studentSegments(pathname: string | null | undefined): string[] | null {
  if (typeof pathname !== "string" || pathname.length > 2000) return null;
  if (pathname !== "/student" && !pathname.startsWith("/student/")) return null;
  return pathname.slice("/student".length).split("/").filter(Boolean);
}

// Skills intelligence resources (docs/STUDENT-INTELLIGENCE.md section 4) are
// allowed only in these exact shapes and methods. The GitHub OAuth callback is
// handled by /student/connections/github/callback on the server and is never
// reachable from the browser through this proxy.
const PLATFORM = "(github|leetcode|hackerrank|linkedin|huggingface|kaggle)";
const SKILL_ROUTES: { method: "GET" | "POST"; pattern: RegExp }[] = [
  { method: "GET", pattern: /^skills\/profile$/ },
  { method: "POST", pattern: /^skills\/onboarding$/ },
  { method: "POST", pattern: /^skills\/platforms\/github\/(authorize|token)$/ },
  { method: "POST", pattern: new RegExp(`^skills/platforms/${PLATFORM}$`) },
  { method: "POST", pattern: new RegExp(`^skills/platforms/${PLATFORM}/refresh$`) },
  { method: "POST", pattern: /^skills\/featured$/ },
  { method: "POST", pattern: /^skills\/summary$/ },
];
/** True when the browser may call this /student/api path with this method. */
export function skillRouteAllowed(method: string, path: string[]) {
  const joined = path.join("/");
  return SKILL_ROUTES.some((route) => route.method === method && route.pattern.test(joined));
}

// ---- Labels -----------------------------------------------------------------
export type Tone = "good" | "warn" | "bad" | "neutral";

export const PROVENANCE_LABELS: Record<Provenance, string> = {
  institution_verified: "Institution record",
  platform_verified: "Verified by platform",
  student_submitted: "Student submitted, not verified by DSU",
  ai_generated: "AI generated",
  unavailable: "Unavailable",
};
export function provenanceLabel(value: string | null | undefined): string {
  return PROVENANCE_LABELS[value as Provenance] ?? "Unavailable";
}
export function provenanceTone(value: string | null | undefined): Tone {
  return value === "institution_verified" || value === "platform_verified" ? "good" : value === "student_submitted" ? "warn" : "neutral";
}

// Friendly text for stored sync error codes (never shows raw provider detail).
const SYNC_ERRORS: Record<string, string> = {
  CREDENTIAL_INVALID: "The connection is no longer authorised. Reconnect this account.",
  RATE_LIMITED: "The platform asked us to slow down. The next sync will retry automatically.",
  PROVIDER_RATE_LIMITED: "The platform asked us to slow down. The next sync will retry automatically.",
  PROVIDER_UNAVAILABLE: "The platform was unavailable. The next sync will retry automatically.",
  PROVIDER_FORBIDDEN: "The platform refused access to public data for this account.",
  PLATFORM_ACCOUNT_NOT_FOUND: "No public profile was found for this username. Check the link and save it again.",
  LEASE_EXPIRED: "The last sync did not finish. It will retry automatically.",
};
export function syncErrorMessage(code: string | null | undefined): string {
  return (code && SYNC_ERRORS[code]) || "The last sync did not complete. It will retry automatically.";
}

export type StateBadge = { label: string; tone: Tone; detail?: string };
/** One status for a platform card: answered state first, then sync state. */
export function accountStatus(account: PlatformAccount | undefined): StateBadge {
  if (!account || account.state === "disconnected") return { label: "Not provided", tone: "neutral" };
  if (account.state === "declared_none") return { label: "Does not use", tone: "neutral" };
  if (account.syncError === "CREDENTIAL_INVALID") return { label: "Reconnect required", tone: "bad", detail: syncErrorMessage(account.syncError) };
  switch (account.syncStatus) {
    case "pending":
    case "running":
      return { label: "Sync pending", tone: "warn", detail: "Linked. Public data is being collected in the background." };
    case "failed":
      return { label: "Sync failed", tone: "bad", detail: syncErrorMessage(account.syncError) };
    case "partial":
      return { label: "Linked", tone: "good", detail: "Some public figures were unavailable on the last sync." };
    case "unavailable":
      return { label: "Linked", tone: "good", detail: "Public figures are unavailable for this account right now." };
    default:
      return { label: "Linked", tone: "good" };
  }
}

export function authMethodLabel(account: PlatformAccount): string {
  switch (account.authMethod) {
    case "github_app": return "Connected through GitHub";
    case "github_pat": return "Connected with a fine-grained token";
    case "public_api": return "Public profile, figures read from the platform";
    case "link_only": return "Profile link";
    default: return "";
  }
}

export const SECTION_LABELS: Record<SectionKey, string> = {
  identity: "Confirm your institution record",
  visibility: "Save your visibility settings",
  github: "GitHub",
  leetcode: "LeetCode",
  hackerrank: "HackerRank",
  linkedin: "LinkedIn",
  huggingface: "Hugging Face",
  kaggle: "Kaggle",
};
export const sectionLabel = (key: string) => SECTION_LABELS[key as SectionKey] ?? key;
/** Which onboarding step (0..3) owns a missing section. */
export function sectionStep(key: string): number {
  return key === "identity" ? 0 : key === "visibility" ? 2 : isPlatform(key) ? 1 : 3;
}
/** Where a reload resumes: the first step that still has work, else review. */
export function resumeStep(onboarding: Pick<OnboardingStatus, "sections">): number {
  const s = onboarding.sections || {};
  if (!s.identity) return 0;
  if (REQUIRED_PLATFORMS.some((p) => !s[p])) return 1;
  if (!s.visibility) return 2;
  return 3;
}

// ---- Numbers and dates --------------------------------------------------------
/** Official CGPA exactly as stored, shown with two decimals when numeric. */
export function cgpaText(value: string | number | null | undefined): string {
  if (value === null || value === undefined || String(value).trim() === "") return "Not recorded";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : String(value);
}
/**
 * "3 of 6", or "Not ranked" when no rank exists. `reason` (for example "CGPA
 * not recorded") is added where there is room to explain it.
 */
export function rankText(rank: number | null | undefined, size: number | null | undefined, reason?: string): string {
  if (rank === null || rank === undefined) return reason ? `Not ranked (${reason})` : "Not ranked";
  return size ? `${rank} of ${size}` : String(rank);
}
/** Why a rank is missing: ranks need an official CGPA. */
export const rankReason = (cgpa: string | number | null | undefined) =>
  cgpa === null || cgpa === undefined || String(cgpa).trim() === "" ? "CGPA not recorded" : undefined;
export function dateText(value: string | null | undefined, withTime = false): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", ...(withTime ? { timeStyle: "short" } : {}) });
}
export function waitText(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "in a moment";
  const minutes = Math.ceil(seconds / 60);
  return minutes <= 1 ? "in about a minute" : `in about ${minutes} minutes`;
}

const isCount = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
/** A metric's display text, or null when it holds nothing we can show honestly. */
export function metricText(metric: SkillMetric | undefined): string | null {
  if (!metric || metric.verification === "unavailable") return null;
  const value = metric.value;
  if (isCount(value)) return value.toLocaleString("en-IN");
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value).toLocaleString("en-IN");
  if (value && typeof value === "object" && !Array.isArray(value) && isCount((value as { value?: unknown }).value))
    return (value as { value: number }).value.toLocaleString("en-IN");
  if (Array.isArray(value)) {
    const names = value
      .map((item) => (item && typeof item === "object" ? (item as { language?: string; id?: string }).language ?? (item as { id?: string }).id : item))
      .filter((item): item is string => typeof item === "string" && !!item.trim());
    return names.length ? names.slice(0, 5).join(", ") : null;
  }
  return null;
}
// Display names for metric keys. The backend's profile service has no labels
// for some newer keys, so the UI names them itself and falls back to its label.
const METRIC_NAMES: Record<string, string> = {
  "repos.public": "Public repositories",
  "repos.original": "Original public repositories",
  "languages.top": "Most-used languages",
  "contributions.total_12m": "Contributions in the last 12 months",
  "contributions.commits_12m": "Commits in the last 12 months",
  "contributions.private_12m": "Private contributions in the last 12 months",
  "contributions.lines_added_52w": "Lines added in the last 52 weeks",
  "activity.current_streak": "Current streak (days)",
  "activity.longest_streak": "Longest streak (days)",
  "activity.active_days": "Active days in the last 12 months",
  "models.count": "Models",
  "datasets.count": "Datasets",
  "spaces.count": "Spaces",
};
export const metricName = (metric: Pick<SkillMetric, "metric" | "label">) => METRIC_NAMES[metric.metric] ?? metric.label ?? metric.metric;
export const findMetric = (metrics: SkillMetric[] | undefined, key: string) => (metrics || []).find((m) => m.metric === key);

export type ActivityRow = { key: string; label: string; value: string | null; note?: string; provenance: string };
/**
 * Coding activity rows for the dashboard. Only values the backend stored are
 * shown; anything missing is "Unavailable", never an estimate.
 */
export function activityRows(profile: Pick<SkillsProfile, "accounts" | "github">): ActivityRow[] {
  const github = profile.accounts.find((a) => a.platform === "github" && a.state === "linked");
  const activity = profile.github?.activity || [];
  const fromActivity = (key: string, label: string, note?: string): ActivityRow => {
    const metric = findMetric(activity, key);
    const value = github ? metricText(metric) : null;
    return { key, label, value, note: value ? note ?? metric?.note ?? undefined : undefined, provenance: value ? metric?.verification ?? "platform_verified" : "unavailable" };
  };
  const repos = findMetric(github?.metrics, "repos.public");
  const rows: ActivityRow[] = [
    { key: "repos.public", label: "Public repositories", value: github ? metricText(repos) : null, provenance: github && metricText(repos) ? repos!.verification : "unavailable" },
    fromActivity("contributions.total_12m", "Contributions in the last 12 months"),
    fromActivity("activity.current_streak", "Current streak (days)", "Counted in UTC from the GitHub contribution calendar."),
    fromActivity("activity.longest_streak", "Longest streak (days)", "Counted in UTC from the GitHub contribution calendar."),
  ];
  const lines = findMetric(activity, "contributions.lines_added_52w");
  const linesValue = github ? metricText(lines) : null;
  const coverage = lines?.value && typeof lines.value === "object" ? (lines.value as { counted?: number; eligible?: number }) : null;
  rows.push({
    key: "contributions.lines_added_52w",
    label: "Lines added in the last 52 weeks",
    value: linesValue,
    note: linesValue
      ? coverage && isCount(coverage.counted) && isCount(coverage.eligible)
        ? `Counted across ${coverage.counted} of ${coverage.eligible} recently pushed repositories.`
        : lines?.note ?? undefined
      : undefined,
    provenance: linesValue ? lines!.verification : "unavailable",
  });
  const leetcode = profile.accounts.find((a) => a.platform === "leetcode" && a.state === "linked");
  const solved = leetcode?.submitted && isCount((leetcode.submitted as LeetCodeFigures).solved) ? (leetcode.submitted as LeetCodeFigures).solved! : null;
  rows.push({
    key: "leetcode.solved",
    label: "Coding problems solved (LeetCode)",
    value: solved === null ? null : solved.toLocaleString("en-IN"),
    provenance: solved === null ? "unavailable" : "student_submitted",
  });
  return rows;
}

// ---- Officer preview ----------------------------------------------------------
export type PreviewAccount = {
  platform: Platform;
  state: AccountState;
  /** Handle, link, figures and metrics reach officers (consent, platforms switch, linked). */
  shared: boolean;
  handle: string | null;
  profileUrl: string | null;
  ownership: Provenance | null;
  submitted: Submitted;
  metrics: SkillMetric[];
};
export type PlacementPreview = {
  academic: Academic;
  ranking: Ranking;
  /** Consent is given by completing skills onboarding. Before it officers see platform states only. */
  consented: boolean;
  /** Accounts officers receive. Accounts the student hid are left out entirely, as in the SQL. */
  accounts: PreviewAccount[];
  /** The student's own hidden accounts, so the preview can explain their absence. */
  hiddenAccounts: Platform[];
  /** GitHub is linked and not hidden: projects and activity depend on it, not on the platforms switch. */
  githubShared: boolean;
  featured: FeaturedProject[];
  repositories: Repository[];
  activity: SkillMetric[];
  summary: SkillSummary | null;
  /** The latest shared summary used evidence that is no longer shared, so officers do not get it. */
  summaryWithheld: boolean;
  hidden: (keyof Visibility)[];
};
/**
 * Evidence groups a summary depends on, the same rule as the backend's
 * evidenceSources(): "platforms:<platform>", "projects" and "activity".
 * Academic, ranking and self-listed items are always shared.
 */
export function summarySources(evidence: EvidenceItem[] | null | undefined): string[] {
  const sources = new Set<string>();
  for (const item of evidence || []) {
    if (["platform", "metric", "submitted"].includes(item.kind)) sources.add(`platforms:${item.platform}`);
    else if (item.kind === "project") sources.add("projects");
    else if (item.kind === "activity") sources.add("activity");
  }
  return [...sources].sort();
}
/**
 * What an authorized Placement Officer receives, built from the student's own
 * profile with exactly the rules of placement.skill_profile:
 * - the official record is always shown;
 * - accounts the student hid are omitted; other accounts always show their
 *   state, and their handle, link, figures and metrics only after consent
 *   (onboarding complete) when the platforms switch is on and they are linked;
 * - before consent nothing else is shared;
 * - featured projects and repositories follow the projects switch, and coding
 *   activity the activity switch, whenever GitHub is linked and not hidden,
 *   regardless of the platforms switch;
 * - the latest summary the student has not hidden follows the summary switch,
 *   and is withheld when any evidence group it used is no longer shared.
 */
export function placementPreview(profile: SkillsProfile): PlacementPreview {
  const v = profile.visibility;
  const consented = Boolean(profile.onboarding?.consentedAt);
  const visible = profile.accounts.filter((a) => a.visible);
  const accounts = visible.map((a): PreviewAccount => {
    const shared = consented && v.platforms && a.state === "linked";
    return {
      platform: a.platform,
      state: a.state,
      shared,
      handle: shared ? a.handle : null,
      profileUrl: shared ? a.profileUrl : null,
      ownership: shared ? a.ownership : null,
      submitted: shared ? a.submitted : {},
      metrics: shared ? a.metrics.filter((m) => !/^(activity|contributions)\./.test(m.metric)) : [],
    };
  });
  const githubShared = visible.some((a) => a.platform === "github" && a.state === "linked");
  const linkedShared = (platform: string) => visible.some((a) => a.platform === platform && a.state === "linked");
  const groupShared = (source: string) =>
    source === "projects"
      ? v.projects && githubShared
      : source === "activity"
        ? v.activity && githubShared
        : source.startsWith("platforms:")
          ? v.platforms && linkedShared(source.slice("platforms:".length))
          : false;
  const latest = consented && v.summary && profile.summary && !profile.summary.hidden ? profile.summary : null;
  const summaryWithheld = !!latest && !summarySources(latest.evidence).every(groupShared);
  const projects = consented && v.projects && githubShared;
  return {
    academic: profile.academic,
    ranking: profile.ranking,
    consented,
    accounts,
    hiddenAccounts: profile.accounts.filter((a) => !a.visible).map((a) => a.platform),
    githubShared,
    featured: projects ? profile.github.featured.slice(0, 3) : [],
    repositories: projects ? profile.github.repositories.slice(0, 6) : [],
    activity: consented && v.activity && githubShared ? profile.github.activity : [],
    summary: summaryWithheld ? null : latest,
    summaryWithheld,
    hidden: VISIBILITY_KEYS.filter((k) => !v[k]),
  };
}

// ---- Featured projects ------------------------------------------------------
export const FEATURED_LIMIT = 3;
/** Toggle a repository in the student's selection, keeping order and the limit. */
export function toggleFeatured(selected: string[], repoId: string, limit = FEATURED_LIMIT): { selected: string[]; full: boolean } {
  if (selected.includes(repoId)) return { selected: selected.filter((id) => id !== repoId), full: false };
  if (selected.length >= limit) return { selected, full: true };
  return { selected: [...selected, repoId], full: false };
}
export const studentSelected = (featured: FeaturedProject[]) =>
  featured.filter((f) => f.source === "student_selected").map((f) => String(f.repo.repoId));
export const featuredSourceLabel = (source: FeaturedProject["source"]) => (source === "github_pinned" ? "Pinned on GitHub" : "Selected by you");

// ---- Handles (mirror of backend normalizePlatformValue) ------------------------
type Rule = { handle: RegExp; hosts: string[]; countryHosts?: RegExp; paths: string[][]; reserved: string[]; url: (h: string) => string };
const RULES: Record<Exclude<Platform, "github">, Rule> = {
  leetcode: {
    handle: /^[A-Za-z0-9_-]{1,30}$/,
    hosts: ["leetcode.com", "www.leetcode.com"],
    paths: [["u"], []],
    reserved: ["accounts", "assessment", "contest", "discuss", "explore", "interview", "problems", "problemset", "store", "studyplan", "subscribe", "u", "profile", "settings"],
    url: (h) => `https://leetcode.com/u/${h}/`,
  },
  hackerrank: {
    handle: /^[A-Za-z0-9_](?:[A-Za-z0-9_.-]{0,38}[A-Za-z0-9_])?$/,
    hosts: ["hackerrank.com", "www.hackerrank.com"],
    paths: [["profile"], []],
    reserved: ["about", "auth", "blog", "careers", "certificates", "certify", "challenges", "contests", "dashboard", "domains", "interview", "jobs", "leaderboard", "login", "prepare", "products", "profile", "settings", "skills-verification", "work"],
    url: (h) => `https://www.hackerrank.com/profile/${h}`,
  },
  linkedin: {
    handle: /^[A-Za-z0-9_-]{3,100}$/,
    hosts: ["linkedin.com", "www.linkedin.com"],
    countryHosts: /^[a-z]{2}\.linkedin\.com$/,
    paths: [["in"]],
    reserved: [],
    url: (h) => `https://www.linkedin.com/in/${h}`,
  },
  huggingface: {
    handle: /^[A-Za-z0-9](?:[A-Za-z0-9_-]|\.(?=[A-Za-z0-9_-])){0,41}$/,
    hosts: ["huggingface.co"],
    paths: [[]],
    reserved: ["api", "blog", "chat", "collections", "datasets", "docs", "enterprise", "join", "learn", "login", "models", "new", "organizations", "papers", "posts", "pricing", "settings", "spaces", "tasks"],
    url: (h) => `https://huggingface.co/${h}`,
  },
  kaggle: {
    handle: /^[A-Za-z0-9_-]{1,40}$/,
    hosts: ["kaggle.com", "www.kaggle.com"],
    paths: [[]],
    reserved: ["about", "account", "code", "competitions", "contact", "datasets", "discussion", "discussions", "docs", "learn", "models", "organizations", "search", "settings", "work"],
    url: (h) => `https://www.kaggle.com/${h}`,
  },
};
export const HANDLE_HINTS: Record<Exclude<Platform, "github">, string> = {
  leetcode: "For example https://leetcode.com/u/your-name/ or your-name",
  hackerrank: "For example https://www.hackerrank.com/profile/your_name or your_name",
  linkedin: "For example https://www.linkedin.com/in/your-name",
  huggingface: "For example https://huggingface.co/your-name or your-name",
  kaggle: "For example https://www.kaggle.com/your-name or your-name",
};
/** {handle, profileUrl} built from a validated handle, or null. */
export function normalizeHandle(platform: Platform, input: string): { handle: string; profileUrl: string } | null {
  if (platform === "github") return null;
  const rule = RULES[platform];
  const value = String(input ?? "").trim();
  if (!value || value.length > 300 || !/^[\x21-\x7e]+$/.test(value)) return null;
  const accept = (handle: string) =>
    rule.handle.test(handle) && !rule.reserved.includes(handle.toLowerCase()) ? { handle, profileUrl: rule.url(handle) } : null;
  if (!value.includes("/") && !value.includes(":")) return accept(value);
  if (!value.startsWith("https://") || /[\\@%?#\s]/.test(value)) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash) return null;
  const authority = value.slice("https://".length).split("/")[0].toLowerCase();
  if (authority !== url.hostname) return null;
  if (!rule.hosts.includes(url.hostname) && !(rule.countryHosts && rule.countryHosts.test(url.hostname))) return null;
  const segments = url.pathname.split("/").slice(1);
  if (segments.at(-1) === "") segments.pop();
  if (segments.some((s) => s === "")) return null;
  for (const prefix of rule.paths) {
    if (segments.length !== prefix.length + 1) continue;
    if (prefix.every((p, i) => segments[i].toLowerCase() === p)) return accept(segments[prefix.length]);
  }
  return null;
}

// ---- Student-submitted figures (mirror of backend SUBMITTED_SCHEMAS) ----------
export type LeetCodeFigures = { solved?: number; easy?: number; medium?: number; hard?: number; contestRating?: number; contestsAttended?: number };
export type HackerRankFigures = { badges?: { name: string; stars: number }[]; certifications?: { name: string; url: string }[] };
export type KaggleFigures = { achievements?: { title: string }[] };
export type Submitted = LeetCodeFigures & HackerRankFigures & KaggleFigures & Record<string, unknown>;

export const LEETCODE_FIELDS: { key: keyof LeetCodeFigures; label: string; max: number; integer: boolean }[] = [
  { key: "solved", label: "Problems solved", max: 5000, integer: true },
  { key: "easy", label: "Easy", max: 2000, integer: true },
  { key: "medium", label: "Medium", max: 3000, integer: true },
  { key: "hard", label: "Hard", max: 1500, integer: true },
  { key: "contestRating", label: "Contest rating", max: 5000, integer: false },
  { key: "contestsAttended", label: "Contests attended", max: 1000, integer: true },
];
export const HACKERRANK_CERT_URL = /^https:\/\/www\.hackerrank\.com\/certificates\/[A-Za-z0-9]{6,64}$/;
const plainText = (value: string, max: number) => {
  const v = value.trim();
  return v.length >= 1 && v.length <= max && !/[\u0000-\u001f\u007f-\u009f<>]/.test(v);
};

export type FigureCheck = { ok: true; data: Submitted } | { ok: false; errors: Record<string, string> };
/**
 * Validates the optional figures a student types (strings from inputs) and
 * returns the exact JSON the backend accepts. Empty fields are left out.
 */
export function checkFigures(
  platform: Platform,
  form: {
    leetcode?: Partial<Record<keyof LeetCodeFigures, string>>;
    badges?: { name: string; stars: string }[];
    certifications?: { name: string; url: string }[];
    achievements?: { title: string }[];
  },
): FigureCheck {
  const errors: Record<string, string> = {};
  if (platform === "leetcode") {
    const data: LeetCodeFigures = {};
    for (const field of LEETCODE_FIELDS) {
      const raw = (form.leetcode?.[field.key] ?? "").trim();
      if (!raw) continue;
      const n = Number(raw);
      if (!/^\d+(\.\d+)?$/.test(raw) || !Number.isFinite(n) || n < 0 || n > field.max || (field.integer && !Number.isInteger(n)))
        errors[field.key] = field.integer ? `Enter a whole number from 0 to ${field.max}.` : `Enter a number from 0 to ${field.max}.`;
      else data[field.key] = n;
    }
    const { solved, easy, medium, hard } = data;
    if (!errors.solved && [solved, easy, medium, hard].every((n) => n !== undefined) && easy! + medium! + hard! > solved!)
      errors.solved = "Easy, medium and hard cannot add up to more than solved.";
    return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data };
  }
  if (platform === "hackerrank") {
    const badges = (form.badges || []).filter((b) => b.name.trim() || b.stars.trim());
    const certifications = (form.certifications || []).filter((c) => c.name.trim() || c.url.trim());
    if (badges.length > 20) errors.badges = "Add up to 20 badges.";
    badges.forEach((b, i) => {
      if (!plainText(b.name, 60)) errors[`badges.${i}.name`] = "Badge names are 1 to 60 characters of plain text.";
      const stars = Number(b.stars);
      if (!/^\d$/.test(b.stars.trim()) || stars > 6) errors[`badges.${i}.stars`] = "Stars are a whole number from 0 to 6.";
    });
    if (certifications.length > 20) errors.certifications = "Add up to 20 certificates.";
    certifications.forEach((c, i) => {
      if (!plainText(c.name, 100)) errors[`certifications.${i}.name`] = "Certificate names are 1 to 100 characters of plain text.";
      if (!HACKERRANK_CERT_URL.test(c.url.trim())) errors[`certifications.${i}.url`] = "Use the certificate link, https://www.hackerrank.com/certificates/ followed by its id.";
    });
    if (Object.keys(errors).length) return { ok: false, errors };
    const data: HackerRankFigures = {};
    if (badges.length) data.badges = badges.map((b) => ({ name: b.name.trim(), stars: Number(b.stars) }));
    if (certifications.length) data.certifications = certifications.map((c) => ({ name: c.name.trim(), url: c.url.trim() }));
    return { ok: true, data };
  }
  if (platform === "kaggle") {
    const achievements = (form.achievements || []).filter((a) => a.title.trim());
    if (achievements.length > 10) errors.achievements = "Add up to 10 achievements.";
    achievements.forEach((a, i) => {
      if (!plainText(a.title, 80)) errors[`achievements.${i}.title`] = "Achievements are 1 to 80 characters of plain text.";
    });
    if (Object.keys(errors).length) return { ok: false, errors };
    return { ok: true, data: achievements.length ? { achievements: achievements.map((a) => ({ title: a.title.trim() })) } : {} };
  }
  return { ok: true, data: {} };
}
export const SUPPORTS_FIGURES: readonly Platform[] = ["leetcode", "hackerrank", "kaggle"];

/** Short human summary of what the student submitted, for cards and previews. */
export function submittedSummary(platform: Platform, submitted: Submitted | null | undefined): string[] {
  const s = submitted || {};
  const out: string[] = [];
  if (platform === "leetcode") {
    for (const field of LEETCODE_FIELDS) {
      const value = (s as LeetCodeFigures)[field.key];
      if (isCount(value)) out.push(`${field.label}: ${value.toLocaleString("en-IN")}`);
    }
  } else if (platform === "hackerrank") {
    const badges = Array.isArray(s.badges) ? s.badges : [];
    const certs = Array.isArray(s.certifications) ? s.certifications : [];
    if (badges.length) out.push(`${badges.length} ${badges.length === 1 ? "badge" : "badges"}: ` + badges.slice(0, 4).map((b) => `${b.name} (${b.stars} ${b.stars === 1 ? "star" : "stars"})`).join(", "));
    if (certs.length) out.push(`${certs.length} ${certs.length === 1 ? "certificate" : "certificates"}: ` + certs.slice(0, 3).map((c) => c.name).join(", "));
  } else if (platform === "kaggle") {
    const items = Array.isArray(s.achievements) ? s.achievements : [];
    if (items.length) out.push(items.slice(0, 4).map((a) => a.title).join(", "));
  }
  return out;
}

/** Field paths from INVALID_SUBMITTED_FIELDS mapped to readable names. */
export function invalidFieldText(fields: string[] | undefined): string {
  const names = (fields || []).map((f) => {
    const key = f.split(".")[0];
    const known = LEETCODE_FIELDS.find((x) => x.key === key);
    return known ? known.label : key === "badges" ? "Badges" : key === "certifications" ? "Certificates" : key === "achievements" ? "Achievements" : key;
  });
  return [...new Set(names)].join(", ");
}

// ---- Fine-grained token ---------------------------------------------------------
/** Mirrors the backend rule: only fine-grained personal access tokens are accepted. */
export function checkToken(value: string): string | null {
  const token = value.trim();
  if (!token) return "Paste your fine-grained token.";
  if (!token.startsWith("github_pat_")) return "Use a fine-grained token. It starts with github_pat_.";
  if (token.length > 300 || /\s/.test(token)) return "This does not look like a complete token. Copy it again from GitHub.";
  return null;
}

// ---- GitHub return (/student/connections/github/callback) ------------------------
const GITHUB_RETURN: Record<string, string> = {
  GITHUB_ACCESS_DENIED: "GitHub connection was cancelled. Nothing was linked.",
  OAUTH_STATE_INVALID: "This GitHub connection link expired or was already used. Start again.",
  OAUTH_EXCHANGE_FAILED: "GitHub did not accept the authorization. Please connect again.",
  GITHUB_ACCOUNT_IN_USE: "This GitHub account is already linked to another student.",
  GITHUB_APP_NOT_CONFIGURED: "Connecting through GitHub is not available on this server yet.",
  INTEGRATIONS_NOT_CONFIGURED: "GitHub connection is not available on this server yet.",
  PROVIDER_RATE_LIMITED: "GitHub is busy right now. Please try again in a few minutes.",
  PROVIDER_UNAVAILABLE: "GitHub is unavailable right now. Please try again shortly.",
};
/** Message for the ?github= result the callback route adds, or null. */
export function githubReturnNotice(github: string | null | undefined, code: string | null | undefined): { tone: "good" | "bad"; text: string } | null {
  if (github === "connected") return { tone: "good", text: "GitHub is connected. Your public repositories are syncing in the background." };
  if (github !== "error") return null;
  return { tone: "bad", text: (code && /^[A-Z0-9_]{2,40}$/.test(code) && GITHUB_RETURN[code]) || "GitHub could not be connected. Please try again." };
}
/** Only GitHub's own authorization page is followed after authorize. */
export function safeGitHubUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "github.com" && !parsed.username && !parsed.password ? parsed.href : null;
  } catch {
    return null;
  }
}
