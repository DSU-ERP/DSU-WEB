import { campusApi, CampusError, membership } from "@/lib/campus-api";
import {
  batchFilters,
  batchQuery,
  batchCsv,
  type BatchView,
} from "@/lib/analytics/batches";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ batch: string }> },
) {
  if ((await membership()).role !== "admin")
    return new Response("Administrator access required.", {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  const { batch } = await params;
  if (!/^20\d{2}$/.test(batch))
    return new Response("Batch not found.", { status: 404 });
  const filters = {
    ...batchFilters(Object.fromEntries(new URL(request.url).searchParams)),
    batch,
  };
  try {
    const { data } = await campusApi<{ data: BatchView }>(
      `/batches/export?${batchQuery(filters)}`,
    );
    return new Response(batchCsv(data), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="dsu-batch-${batch}.csv"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    if (e instanceof CampusError)
      return new Response(e.message, {
        status: e.status,
        headers: { "Cache-Control": "no-store" },
      });
    throw e;
  }
}
