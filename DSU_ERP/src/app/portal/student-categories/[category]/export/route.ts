import { campusApi, CampusError, membership } from "@/lib/campus-api";
import { analyticsFilters, filterQuery } from "@/lib/analytics/filters";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ category: string }> },
) {
  if ((await membership()).role !== "admin")
    return new Response("Administrator access required.", {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  const { category } = await params;
  const filters = analyticsFilters(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  try {
    const { data } = await campusApi<{
      data: { filename: string; content: string };
    }>(
      `/student-categories/${encodeURIComponent(category)}/export?${filterQuery(filters)}`,
    );
    // The filename is generated from a backend-validated category identifier.
    const filename = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    return new Response(data.content, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof CampusError)
      return new Response(
        error.status === 413
          ? "Select a smaller cohort before exporting."
          : "Unable to export. Return to the category and try again.",
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    throw error;
  }
}
