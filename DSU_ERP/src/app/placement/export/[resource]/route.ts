import {
  officerSession,
  placementRankedStudents,
  placementRead,
} from "@/features/placement/lib/server";
import { unstable_rethrow } from "next/navigation";
import { CampusError } from "@/shared/http/errors";
import { csv, queryFrom, type Report } from "@/features/placement/lib/types";
import {
  RANKED_HEADERS,
  directoryQuery,
  isCategory,
  rankedCsvRows,
  rankedFilename,
} from "@/features/placement/lib/intelligence";

const CSV_HEADERS = {
  "Content-Type": "text/csv; charset=utf-8",
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

// Ranked category directory: same filters and ranks as the on-screen
// directory, every matching row (the backend caps and audits exports).
async function rankedExport(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const category = params.category;
  if (!isCategory(category))
    return Response.json(
      { error: "Choose a valid category." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  await officerSession();
  const { page: _page, ...filters } = directoryQuery(params);
  void _page;
  const data = await placementRankedStudents(category, { ...filters, export: "true" });
  return new Response(csv(RANKED_HEADERS, rankedCsvRows(data.rows)), {
    headers: {
      ...CSV_HEADERS,
      "Content-Disposition": `attachment; filename="${rankedFilename(category, data.scope?.batch ?? filters.batch)}"`,
    },
  });
}
export async function GET(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const { resource } = await params;
  if (!["batch", "students", "offers", "ranked"].includes(resource))
    return Response.json({ error: "Report not found" }, { status: 404 });
  try {
    if (resource === "ranked") return await rankedExport(request);
    await officerSession();
    const query = queryFrom(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const report = await placementRead<Report>(resource, {
      ...query,
      page: "1",
      export: "true",
    });
    const columns: Record<string, string[]> = {
      batch: [
        "department",
        "total",
        "male",
        "female",
        "other_gender",
        "dsat",
        "cet",
        "comedk",
        "unigauge",
        "dcet",
        "management",
        "other_quota",
        "at_least_six",
        "below_six",
        "eligible",
        "not_eligible",
        "unclassified",
        "average",
      ],
      students: [
        "usn",
        "name",
        "batch",
        "department",
        "gender",
        "quota",
        "cgpa",
        "sgpa",
        "backlogs",
        "attendance",
        "eligible",
        "category",
      ],
      ranking: [
        "college_rank",
        "department_rank",
        "usn",
        "name",
        "department",
        "cgpa",
        "sgpa",
        "backlogs",
        "attendance",
        "eligible",
      ],
      offers: [
        "usn",
        "name",
        "department",
        "company",
        "title",
        "package_lpa",
        "category",
        "status",
        "active",
      ],
      talent: [
        "usn",
        "name",
        "department",
        "cgpa",
        "points",
        "readiness",
        "risk",
        "roles",
        "domains",
        "skills",
        "languages",
        "strengths",
        "risks",
        "recommendations",
        "alignment",
        "practical",
        "theoretical",
        "course_fit",
        "generated_at",
      ],
    };
    const keys = columns[resource];
    return new Response(
      csv(
        keys,
        report.rows.map((row) =>
          keys.map((key) =>
            Array.isArray(row[key])
              ? (row[key] as unknown[]).join("; ")
              : row[key],
          ),
        ),
      ),
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="dsu-placement-${resource}.csv"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    // Let sign-in redirects through instead of turning them into a 500.
    unstable_rethrow(error);
    if (error instanceof CampusError && error.status === 429)
      return Response.json(
        {
          error:
            "Too many exports in the last minute. Please wait a minute and try again.",
        },
        {
          status: 429,
          headers: { "Cache-Control": "no-store", "Retry-After": "60" },
        },
      );
    return Response.json(
      { error: error instanceof CampusError ? error.message : "Export failed" },
      {
        status: error instanceof CampusError ? error.status : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
