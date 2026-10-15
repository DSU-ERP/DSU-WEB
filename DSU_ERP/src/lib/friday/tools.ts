import "server-only";
import { placementRead } from "@/lib/placement/server";
import type { Report, Row } from "@/lib/placement/types";

// Every tool is narrow, validated, bounded and read-only. Writes stay in the
// existing proposal/confirmation flow and are never callable by the model.

export type ToolResult = { ok: true; data: unknown } | { ok: false; error: string };

const BATCH = /^20\d{2}$/;
const UUID = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
const TOOL_TIMEOUT_MS = 12000;

function str(v: unknown, max = 100): string | undefined {
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
        "Return students ordered by stored CGPA with college and department ranks. Supports a minimum CGPA and an eligibility filter. Use for 'top N by CGPA' and 'how many are eligible' style questions.",
      parameters: {
        type: "object",
        properties: {
          batch: { type: "string" },
          department: { type: "string" },
          minimum: { type: "string", description: "Minimum CGPA, e.g. 8.5" },
          eligibility: {
            type: "string",
            enum: ["eligible", "ineligible", "unclassified"],
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
        "Full student profile as available to the officer on the student records page: all academic and admission fields, contact and family fields (email, student/parent phone numbers, WhatsApp, gender, language and location), timestamps, eligibility, drive registrations, offers and recorded points. Use for full details or any field missing from search/ranking summaries. Requires the student UUID returned by find_students or rank_students.",
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
): Promise<ToolResult> {
  try {
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
        const data = await withTimeout(
          placementRead<Report>("ranking", {
            limit: limit(args.limit, 20, 25),
            ...(str(args.batch, 4) ? { batch: str(args.batch, 4)! } : {}),
            ...(str(args.department) ? { department: str(args.department)! } : {}),
            ...(minimum ? { minimum } : {}),
            ...(eligibility ? { eligibility } : {}),
          }),
        );
        return {
          ok: true,
          data: {
            total: data.pagination?.total ?? null,
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
