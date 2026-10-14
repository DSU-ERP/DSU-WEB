import { officerSession, placementRead } from "@/lib/placement/server";
import { CampusError } from "@/lib/campus-response";
import { csv, queryFrom, type Report } from "@/lib/placement/types";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  await officerSession();
  const { resource } = await params;
  if (!["batch", "students", "ranking", "offers", "talent"].includes(resource))
    return Response.json({ error: "Report not found" }, { status: 404 });
  try {
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
    return Response.json(
      { error: error instanceof CampusError ? error.message : "Export failed" },
      {
        status: error instanceof CampusError ? error.status : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
