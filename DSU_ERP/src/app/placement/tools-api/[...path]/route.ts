import { NextRequest } from "next/server";
import { backendApi } from "@/shared/http/backend";
import { CampusError } from "@/shared/http/errors";
import { sameOrigin } from "@/features/placement/lib/request";
export const dynamic = "force-dynamic";
async function handle(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  if (req.method !== "GET" && !sameOrigin(req))
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const { path } = await context.params;
    if (!path.every((p) => /^[a-z0-9-]{1,80}$/.test(p)))
      return Response.json({ error: "Invalid resource." }, { status: 400 });
    let body: string | undefined;
    if (req.method === "POST") {
      const reader = req.body?.getReader();
      if (!reader) throw Error();
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 256000) {
          await reader.cancel();
          return Response.json(
            { error: "Request exceeds 250 KB." },
            { status: 413 },
          );
        }
        chunks.push(value);
      }
      body = Buffer.concat(chunks).toString("utf8");
      JSON.parse(body);
    }
    return Response.json(
      await backendApi("/placement/tools/" + path.join("/"), {
        method: req.method as "GET" | "POST",
        body,
      }),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof CampusError
            ? e.message
            : "Unable to complete the request.",
      },
      { status: e instanceof CampusError ? e.status : 400 },
    );
  }
}
export { handle as GET, handle as POST };
