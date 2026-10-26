import "server-only";
import {COMPETENCY_TOOLS,runCompetencyTool} from '@/features/competency/friday-tools';
import { placementRead } from "@/features/placement/lib/server";
import type { Report, Row } from "@/features/placement/lib/types";
import { backendApi } from "@/shared/http/backend";
import { profileLink, type ProfileLink } from "./protocol";

// Every tool is narrow, validated, bounded and read-only. Writes stay in the
// existing proposal/confirmation flow and are never callable by the model.

export type ToolResult = { ok: true; data: unknown } | { ok: false; error: string };

/**
 * Per-request state shared by every tool call in one assistant turn. Student
 * ids returned by a tool are remembered so student_profile only accepts an id
 * the server itself produced in this request, never one the model made up or
 * carried over from an earlier answer. Resolved profiles are collected for
 * the profile_link stream event.
 */
export type ToolContext = { students: Set<string>; profiles: ProfileLink[] };

export function createToolContext(): ToolContext {
  return { students: new Set(), profiles: [] };
}

const BATCH = /^20\d{2}$/;
const UUID = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
const USN = /^[A-Za-z0-9][A-Za-z0-9-]{1,29}$/;
const CATEGORIES = ["advanced", "medium", "needs-improvement"] as const;
const SKILL_STATUSES = ["complete", "incomplete", "not_started"] as const;
const TOOL_TIMEOUT_MS = 12000;
const UNKNOWN_STUDENT = "Use a USN or a student returned by an earlier lookup.";
const DENSE_RULE =
  "Dense ranks by official CGPA within the passing-out batch. Students with the same CGPA share a rank and the next rank is not skipped. Category rank counts only students in the same category in that batch. Department and other filters hide rows but never change a rank.";

/** Officer read from the campus backend. Authorisation is re-checked there. */
async function officerGet<T>(path: string, query: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams(query).toString();
  return (await backendApi<{ data: T }>(path + (qs ? "?" + qs : ""))).data;
}

function remember(ctx: ToolContext, rows: Row[]) {
  for (const r of rows)
    if (typeof r.id === "string" && UUID.test(r.id)) ctx.students.add(r.id.toLowerCase());
}

const arr = (v: unknown): Row[] =>
  Array.isArray(v) ? (v.filter((x) => x && typeof x === "object" && !Array.isArray(x)) as Row[]) : [];
const obj = (v: unknown): Row | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Row) : null;

/**
 * Bounded copy of AI summary content without internal evidence ids. Strings,
 * arrays and nesting are capped so a large summary cannot flood the context.
 */
function boundedContent(v: unknown, depth = 0): unknown {
  if (typeof v === "string") return v.slice(0, 600);
  if (typeof v !== "object" || v === null) return v;
  if (depth > 3) return null;
  if (Array.isArray(v)) return v.slice(0, 10).map((x) => boundedContent(x, depth + 1));
  return Object.fromEntries(
    Object.entries(v)
      .filter(([k]) => k !== "evidence" && k !== "id")
      .slice(0, 20)
      .map(([k, x]) => [k, boundedContent(x, depth + 1)]),
  );
}

// Day by day series are never sent to the model; the derived counts are.
const OMITTED_METRICS = new Set(["activity.calendar"]);
const METRIC_VALUE_CHARS = 600;
/**
 * One metric value, bounded like summary content and capped in total size. A
 * value that is still too large after bounding is dropped rather than cut
 * mid-structure.
 */
function boundedValue(v: unknown, depth = 0): unknown {
  if (typeof v === "string") return v.slice(0, 200);
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "object" || v === null) return typeof v === "boolean" ? v : null;
  if (depth > 2) return null;
  if (Array.isArray(v)) return v.slice(0, 10).map((x) => boundedValue(x, depth + 1));
  return Object.fromEntries(
    Object.entries(v)
      .slice(0, 12)
      .map(([k, x]) => [k.slice(0, 40), boundedValue(x, depth + 1)]),
  );
}
function boundedMetric(v: unknown): unknown {
  const value = boundedValue(v);
  const text = JSON.stringify(value);
  return text !== undefined && text.length > METRIC_VALUE_CHARS ? null : value;
}
function compactMetrics(metrics: unknown, max: number) {
  return arr(metrics)
    .filter((m) => !OMITTED_METRICS.has(String(m.metric)))
    .slice(0, max)
    .map((m) => ({
      label: typeof (m.label ?? m.metric) === "string" ? String(m.label ?? m.metric).slice(0, 100) : null,
      value: boundedMetric(m.value ?? null),
      provenance: m.verification ?? "unavailable",
    }));
}

/**
 * Compact, grounded view of the purpose=ai profile. The backend never
 * includes contact or family data for this purpose and nothing here adds any.
 * Every skill or platform fact carries its provenance value.
 */
function compactProfile(p: Row) {
  const core = obj(p.core) ?? {};
  const ranking = obj(p.ranking) ?? obj(core.ranking) ?? {};
  const skills = obj(p.skills) ?? {};
  const summary = obj(p.summary);
  const readiness = obj(p.readiness);
  return {
    core: {
      usn: core.usn ?? null,
      name: core.name ?? null,
      department: core.department ?? null,
      department_name: core.departmentName ?? null,
      program: core.program ?? null,
      batch: core.batch ?? null,
      semester: core.semester ?? null,
      cgpa: core.cgpa ?? null,
      category: core.category ?? null,
      category_label: core.categoryLabel ?? null,
      eligible: core.eligible ?? null,
      provenance: core.provenance ?? "institution_verified",
    },
    ranking: {
      batch_rank: ranking.batchRank ?? null,
      batch_size: ranking.batchSize ?? null,
      category_rank: ranking.categoryRank ?? null,
      category_size: ranking.categorySize ?? null,
      scope: "passing-out batch",
      rank_type: "dense",
      rule: DENSE_RULE,
    },
    placement: obj(core.placement),
    skill_status: core.skillStatus ?? null,
    skills: {
      onboarding: obj(skills.onboarding),
      visibility: obj(skills.visibility),
      accounts: arr(skills.accounts).slice(0, 10).map((a) => ({
        platform: a.platform,
        state: a.state,
        handle: a.handle ?? null,
        provenance: a.ownership ?? (a.state === "linked" ? "student_submitted" : "unavailable"),
        sync_status: a.syncStatus ?? null,
        metrics: compactMetrics(a.metrics, 12),
        student_submitted_figures:
          obj(a.submitted) && Object.keys(a.submitted as Row).length
            ? boundedContent(a.submitted)
            : null,
      })),
      featured_projects: arr(skills.featured).slice(0, 6).map((f) => {
        const repo = obj(f.repo) ?? {};
        return {
          selection: f.source ?? null,
          name: repo.name ?? null,
          description: typeof repo.description === "string" ? repo.description.slice(0, 300) : null,
          primary_language: repo.primaryLanguage ?? null,
          stars: repo.stars ?? null,
          provenance: "platform_verified",
        };
      }),
      repositories: arr(skills.repositories).slice(0, 8).map((r) => ({
        name: r.name ?? null,
        primary_language: r.primaryLanguage ?? null,
        stars: r.stars ?? null,
        provenance: "platform_verified",
      })),
      activity: compactMetrics(skills.activity, 10),
    },
    // Withheld: the latest summary used information the student has since
    // hidden, so the backend returned none. Say so instead of "no summary".
    summary_withheld: p.summaryWithheld === true,
    summary: summary
      ? {
          label: "ai_generated",
          provenance: "ai_generated",
          reviewed_by_student: Boolean(summary.reviewedAt),
          sections: boundedContent(summary.content ?? {}),
        }
      : null,
    readiness: arr(readiness?.items).slice(0, 10).map((i) => ({
      label: i.label ?? i.key,
      state: i.state ?? null,
      detail: typeof i.detail === "string" ? i.detail.slice(0, 400) : null,
      provenance: i.provenance ?? null,
    })),
    provenance_legend: obj(p.provenance),
  };
}

async function loadProfile(
  ctx: ToolContext,
  id: string,
  known: { usn?: unknown; name?: unknown } = {},
): Promise<ToolResult> {
  const raw = await withTimeout(
    officerGet<Row>(`/placement/students/${encodeURIComponent(id)}/profile`, { purpose: "ai" }),
  );
  const data = compactProfile(obj(raw) ?? {});
  const usn = typeof data.core.usn === "string" ? data.core.usn : String(known.usn ?? "");
  const name = typeof data.core.name === "string" ? data.core.name : String(known.name ?? "");
  const link = profileLink({ id, usn, name });
  ctx.students.add(id);
  if (link && !ctx.profiles.some((p) => p.id === link.id)) ctx.profiles.push(link);
  return {
    ok: true,
    data: {
      status: "found",
      profile: link ? { id: link.id, usn: link.usn, name: link.name, url: link.url } : null,
      ...data,
    },
  };
}

function str(v: unknown, max = 100): string | undefined {
  // Models sometimes send numeric filters (batch 2028, minimum 8.5) as numbers.
  if (typeof v === "number" && Number.isFinite(v)) v = String(v);
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t.slice(0, max) : undefined;
}

function limit(v: unknown, fallback: number, max: number): string {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 1) return String(fallback);
  return String(Math.min(Math.floor(n), max));
}

/** Keep search results compact; contact information requires a detail lookup. */
function slimStudent(r: Row) {
  return {
    id: r.id,
    usn: r.usn,
    name: r.name,
    department: r.department,
    batch: r.batch,
    cgpa: r.cgpa,
    sgpa: r.sgpa,
    backlogs: r.backlogs,
    attendance: r.attendance,
    eligible: r.eligible,
    college_rank: r.college_rank,
    department_rank: r.department_rank,
    profile_url: r.id ? `/placement/students/${r.id}` : undefined,
  };
}

export const FRIDAY_TOOLS = [
  ...COMPETENCY_TOOLS,
  {
    type: "function" as const,
    function: {
      name: "batch_summary",
      description:
        "Aggregate academic and eligibility figures for a passing-out batch: student counts, valid CGPA counts, unclassified records, averages, eligible totals, per-category breakdown, branch breakdown and CGPA distribution. Use for cohort-level questions rather than listing students.",
      parameters: {
        type: "object",
        properties: {
          batch: { type: "string", description: "Passing-out year, e.g. 2028" },
          department: { type: "string", description: "Optional branch filter" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "find_students",
      description:
        "Search students by name or USN and return their recorded academic fields. Use when the officer names a student or asks who matches a text term.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Name or USN, full or partial" },
          batch: { type: "string" },
          department: { type: "string" },
          limit: { type: "number", description: "Max rows, 1 to 25" },
        },
        required: ["search"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "rank_students",
      description:
        "Return students ordered by stored CGPA. Two rank definitions exist. With `category` (advanced, medium or needs-improvement) the result is the official category directory: dense ranks by CGPA within the passing-out batch, giving category_rank (within that category in the batch) and batch_rank (within the whole batch); ties share a rank and no number is skipped. Prefer `category` whenever a category is named, for example 'Advanced students from CSE' or 'top medium-category students'. Without `category` the legacy college and department ranks are returned, which skip numbers after ties; use that for plain 'top N by CGPA', minimum-CGPA and 'how many are eligible' questions. A minimum CGPA cannot be combined with a category.",
      parameters: {
        type: "object",
        properties: {
          batch: { type: "string", description: "Passing-out year, e.g. 2028" },
          department: { type: "string" },
          category: {
            type: "string",
            enum: ["advanced", "medium", "needs-improvement"],
            description: "CGPA category; switches to the dense category ranking",
          },
          minimum: { type: "string", description: "Minimum CGPA, e.g. 8.5 (not with category)" },
          eligibility: {
            type: "string",
            enum: ["eligible", "ineligible", "unclassified"],
            description: "unclassified is not available with category",
          },
          limit: { type: "number", description: "Max rows, 1 to 25" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "student_detail",
      description:
        "Full student record as available to the officer on the student records page: all academic and admission fields, contact and family fields (email, student/parent phone numbers, WhatsApp, gender, language and location), timestamps, eligibility, drive registrations, offers and recorded points. Use for full record details, contact or family details, or any field missing from search/ranking summaries. For skills, platforms, projects, readiness, dense ranks or a student's profile summary, prefer student_profile instead. Requires the student UUID returned by find_students or rank_students.",
      parameters: {
        type: "object",
        properties: { id: { type: "string", description: "Student UUID" } },
        required: ["id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "student_profile",
      description:
        "A student's intelligence profile: official academic core (CGPA, category, eligibility), dense batch and category ranks with their scope, placement status, skills onboarding status, linked platform accounts with metrics and provenance, featured projects, an AI generated summary when one is shared, and descriptive readiness notes. Contains no contact or family data. Use for skills, platform, project, readiness or profile questions about one student. Pass a USN, or a student_id that an earlier tool returned in this same request. If the USN matches several students the result lists candidates and you must ask which one.",
      parameters: {
        type: "object",
        properties: {
          usn: { type: "string", description: "Student USN, e.g. 1DS23CS001" },
          student_id: {
            type: "string",
            description: "Student UUID returned by an earlier tool in this request",
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "skill_profiles",
      description:
        "List students by skills-profile status (complete, incomplete or not_started onboarding) with their category, CGPA, completion date and linked platforms. Use for 'who has completed their skills profile' or 'which students have not started' questions. Linked platforms only show what a student connected; an absent platform says nothing about skill.",
      parameters: {
        type: "object",
        properties: {
          batch: { type: "string", description: "Passing-out year, e.g. 2028" },
          department: { type: "string" },
          status: {
            type: "string",
            enum: ["complete", "incomplete", "not_started"],
            description: "Defaults to complete",
          },
          limit: { type: "number", description: "Max rows, 1 to 25" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_drives",
      description:
        "Recruitment drives with company, role, status, package category and dates. Use for questions about open, upcoming or completed drives.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["upcoming", "ongoing", "completed", "cancelled"],
          },
          search: { type: "string", description: "Company or role text" },
          limit: { type: "number" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "placement_overview",
      description:
        "University-wide placement statistics: placed and unplaced counts, placement percentage, offer counts, average, highest and median package, drive and company totals, and per-department comparison.",
      parameters: {
        type: "object",
        properties: { batch: { type: "string" } },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "eligibility_rules",
      description:
        "The institution's configured CGPA category boundaries and baseline placement eligibility rule. Call this before explaining why a student falls into a category so the thresholds quoted are the configured ones.",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    },
  },
] as const;

export type FridayToolName = (typeof FRIDAY_TOOLS)[number]["function"]["name"];

export const FRIDAY_TOOL_NAMES: readonly string[] = FRIDAY_TOOLS.map(
  (t) => t.function.name,
);

/** Human-readable label for the tool_status stream event. */
export function toolLabel(name: string): string {
  switch (name) {
    case "batch_summary":
      return "Retrieving batch figures";
    case "find_students":
      return "Searching student records";
    case "rank_students":
      return "Ranking students by CGPA";
    case "student_detail":
      return "Opening student record";
    case "student_profile":
      return "Opening student profile";
    case "skill_profiles":
      return "Checking skills profiles";
    case "list_drives":
      return "Retrieving recruitment drives";
    case "placement_overview":
      return "Retrieving placement statistics";
    case "eligibility_rules":
      return "Checking eligibility rules";
    default:
      return "Retrieving campus information";
  }
}

async function withTimeout<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("This lookup took too long.")),
          TOOL_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Executes one validated tool call. The caller has already confirmed the
 * officer session, and placementRead re-checks authorisation in the database
 * function, so a model-supplied role or id can never widen access.
 */
export async function runTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext = createToolContext(),
): Promise<ToolResult> {
  try {
    if(name.startsWith('competency_'))return {ok:true,data:await withTimeout(runCompetencyTool(name,args,ctx.students))};
    switch (name) {
      case "eligibility_rules": {
        // Thresholds are configured in the database (erp.cgpa_rules and
        // erp.placement_policy) and surfaced through every report's options.
        // They are never duplicated in application code.
        const data = await withTimeout(placementRead<Report>("batch", {}));
        return {
          ok: true,
          data: {
            categories: data.options?.categories ?? [],
            baseline: data.options?.policy ?? null,
            note: "Categories and baseline eligibility come from the institution's configured grading scale and are applied to the exact stored CGPA, not a rounded display value.",
          },
        };
      }

      case "batch_summary": {
        const batch = str(args.batch, 4);
        if (batch && !BATCH.test(batch))
          return { ok: false, error: "Batch must be a four-digit year such as 2028." };
        const data = await withTimeout(
          placementRead<Report>("batch", {
            ...(batch ? { batch } : {}),
            ...(str(args.department) ? { department: str(args.department)! } : {}),
          }),
        );
        return {
          ok: true,
          data: {
            summary: data.summary,
            categories: data.categories,
            distribution: data.distribution,
            branches: (data.rows ?? []).slice(0, 30),
            policy: data.options?.policy,
          },
        };
      }

      case "find_students": {
        const search = str(args.search);
        if (!search) return { ok: false, error: "Provide a name or USN to search for." };
        const data = await withTimeout(
          placementRead<Report>("students", {
            search,
            limit: limit(args.limit, 10, 25),
            ...(str(args.batch, 4) ? { batch: str(args.batch, 4)! } : {}),
            ...(str(args.department) ? { department: str(args.department)! } : {}),
          }),
        );
        remember(ctx, data.rows ?? []);
        return {
          ok: true,
          data: {
            total: data.pagination?.total ?? null,
            students: (data.rows ?? []).map(slimStudent),
          },
        };
      }

      case "rank_students": {
        const minimum = str(args.minimum, 5);
        if (minimum && !/^(10(\.0+)?|\d(\.\d+)?)$/.test(minimum))
          return { ok: false, error: "Minimum CGPA must be between 0 and 10." };
        const eligibility = str(args.eligibility, 20);
        if (
          eligibility &&
          !["eligible", "ineligible", "unclassified"].includes(eligibility)
        )
          return { ok: false, error: "Eligibility must be eligible, ineligible or unclassified." };
        const category = str(args.category, 30);
        if (category !== undefined) {
          if (!(CATEGORIES as readonly string[]).includes(category))
            return { ok: false, error: "Category must be advanced, medium or needs-improvement." };
          const batch = str(args.batch, 4);
          if (batch && !BATCH.test(batch))
            return { ok: false, error: "Batch must be a four-digit year such as 2028." };
          if (minimum)
            return { ok: false, error: "A minimum CGPA cannot be combined with a category. Use one or the other." };
          if (eligibility === "unclassified")
            return { ok: false, error: "Category rankings only include classified students, so use eligible or ineligible." };
          const data = await withTimeout(
            officerGet<Report>(`/placement/categories/${category}/students`, {
              limit: limit(args.limit, 20, 25),
              sort: "rank",
              ...(batch ? { batch } : {}),
              ...(str(args.department) ? { department: str(args.department)! } : {}),
              ...(eligibility ? { eligibility } : {}),
            }),
          );
          const rows = arr(data?.rows).slice(0, 25);
          remember(ctx, rows);
          return {
            ok: true,
            data: {
              total: data?.pagination?.total ?? null,
              scope: obj(data?.scope),
              rank_type: "dense",
              rank_rule: DENSE_RULE,
              students: rows.map((r) => ({
                id: r.id,
                usn: r.usn,
                name: r.name,
                department: r.department,
                batch: r.batch,
                semester: r.semester ?? null,
                cgpa: r.cgpa,
                category: r.category,
                eligible: r.eligible ?? null,
                category_rank: r.categoryRank ?? null,
                batch_rank: r.batchRank ?? null,
                skill_status: r.skillStatus ?? null,
              })),
            },
          };
        }
        const data = await withTimeout(
          placementRead<Report>("ranking", {
            limit: limit(args.limit, 20, 25),
            ...(str(args.batch, 4) ? { batch: str(args.batch, 4)! } : {}),
            ...(str(args.department) ? { department: str(args.department)! } : {}),
            ...(minimum ? { minimum } : {}),
            ...(eligibility ? { eligibility } : {}),
          }),
        );
        remember(ctx, data.rows ?? []);
        return {
          ok: true,
          data: {
            total: data.pagination?.total ?? null,
            rank_type: "legacy college and department ranks (ties skip the following numbers)",
            students: (data.rows ?? []).map(slimStudent),
            policy: data.options?.policy,
          },
        };
      }

      case "student_detail": {
        const id = str(args.id, 36);
        if (!id || !UUID.test(id))
          return { ok: false, error: "A student UUID from a previous search is required." };
        const s = await withTimeout(placementRead<Row>("student", { id }));
        // Same source as StudentProfile's contact section. Keep the student's
        // number as text and never substitute a parent's or WhatsApp number.
        const contact = s.contact && typeof s.contact === "object" && !Array.isArray(s.contact)
          ? s.contact as Row
          : null;
        const mobile = typeof contact?.phoneStudent1 === "string" && contact.phoneStudent1.trim()
          ? contact.phoneStudent1
          : null;
        const offers = Array.isArray(s.offers) ? (s.offers as Row[]) : [];
        const registrations = Array.isArray(s.registrations)
          ? (s.registrations as Row[])
          : [];
        return {
          ok: true,
          data: {
            ...slimStudent(s),
            // Forward the same authorized sections used by StudentProfile,
            // rather than silently dropping admission and family fields.
            profile: s.profile ?? null,
            academic: s.academic ?? null,
            contact: { ...contact, mobile },
            baseline_eligibility: s.eligible == null
              ? "Unclassified"
              : s.eligible ? "Eligible" : "Not Eligible",
            offers: offers.slice(0, 20),
            registrations: registrations.slice(0, 20).map((r) => ({
              drive: r.drive,
              company: r.company,
              status: r.status,
              current_round: r.current_round,
            })),
            points: s.points ?? null,
          },
        };
      }

      case "student_profile": {
        const usnArg = str(args.usn, 40);
        const idArg = str(args.student_id, 40);
        if (usnArg !== undefined) {
          if (!USN.test(usnArg))
            return { ok: false, error: "A USN contains only letters, digits and hyphens." };
          const found = await withTimeout(
            officerGet<{ exact?: unknown; matches?: unknown }>("/placement/students/lookup", { usn: usnArg }),
          );
          const matches = arr(obj(found)?.matches).slice(0, 10);
          if (!matches.length)
            return {
              ok: true,
              data: { status: "not_found", message: `No student with USN ${usnArg} was found.` },
            };
          const exact = matches.filter((m) => m.exact === true);
          const chosen = exact.length === 1 ? exact[0] : matches.length === 1 ? matches[0] : null;
          if (!chosen)
            return {
              ok: true,
              data: {
                status: "ambiguous",
                message: `${matches.length} students match ${usnArg}. Ask the officer which one they mean.`,
                candidates: matches.map((m) => ({
                  usn: m.usn ?? null,
                  name: m.name ?? null,
                  department: m.department ?? null,
                  batch: m.batch ?? null,
                })),
              },
            };
          if (typeof chosen.id !== "string" || !UUID.test(chosen.id))
            return { ok: false, error: "That student record could not be opened." };
          return await loadProfile(ctx, chosen.id.toLowerCase(), chosen);
        }
        if (idArg !== undefined) {
          const key = idArg.toLowerCase();
          if (!UUID.test(idArg) || !ctx.students.has(key))
            return { ok: false, error: UNKNOWN_STUDENT };
          return await loadProfile(ctx, key);
        }
        return { ok: false, error: UNKNOWN_STUDENT };
      }

      case "skill_profiles": {
        const batch = str(args.batch, 4);
        if (batch && !BATCH.test(batch))
          return { ok: false, error: "Batch must be a four-digit year such as 2028." };
        const status = str(args.status, 20) ?? "complete";
        if (!(SKILL_STATUSES as readonly string[]).includes(status))
          return { ok: false, error: "Status must be complete, incomplete or not_started." };
        const data = await withTimeout(
          officerGet<Report>("/placement/skills/students", {
            status,
            limit: limit(args.limit, 15, 25),
            ...(batch ? { batch } : {}),
            ...(str(args.department) ? { department: str(args.department)! } : {}),
          }),
        );
        const rows = arr(data?.rows).slice(0, 25);
        remember(ctx, rows);
        return {
          ok: true,
          data: {
            status,
            total: data?.pagination?.total ?? null,
            note: "Linked platforms are accounts the student connected. A platform that is not listed says nothing about the student's skill.",
            students: rows.map((r) => ({
              id: r.id,
              usn: r.usn,
              name: r.name,
              department: r.department,
              batch: r.batch,
              cgpa: r.cgpa ?? null,
              category: r.category ?? null,
              skill_status: r.skillStatus ?? null,
              completed_at: r.completedAt ?? null,
              linked_platforms: Array.isArray(r.linkedPlatforms)
                ? r.linkedPlatforms.filter((x): x is string => typeof x === "string").slice(0, 10)
                : [],
            })),
          },
        };
      }

      case "list_drives": {
        const status = str(args.status, 20);
        if (status && !["upcoming", "ongoing", "completed", "cancelled"].includes(status))
          return { ok: false, error: "Status must be upcoming, ongoing, completed or cancelled." };
        const data = await withTimeout(
          placementRead<Report>("drives", {
            limit: limit(args.limit, 15, 25),
            ...(status ? { status } : {}),
            ...(str(args.search) ? { search: str(args.search)! } : {}),
          }),
        );
        return {
          ok: true,
          data: {
            total: data.pagination?.total ?? null,
            drives: (data.rows ?? []).slice(0, 25).map((d) => ({
              company: d.company,
              title: d.title,
              status: d.status,
              category: d.category,
              package_lpa: d.package_lpa,
              drive_date: d.drive_date,
              drive_url: d.id ? `/placement/drives/${d.id}` : undefined,
            })),
          },
        };
      }

      case "placement_overview": {
        const data = await withTimeout(
          placementRead<Report>("overview", {
            ...(str(args.batch, 4) ? { batch: str(args.batch, 4)! } : {}),
          }),
        );
        return {
          ok: true,
          data: {
            summary: data.summary,
            departments: Array.isArray(data.departments)
              ? data.departments.slice(0, 30)
              : [],
          },
        };
      }

      default:
        return { ok: false, error: `Unknown tool: ${name}` };
    }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "That campus lookup could not be completed.",
    };
  }
}
