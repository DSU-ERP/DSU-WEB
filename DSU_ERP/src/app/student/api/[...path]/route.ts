import { NextRequest } from "next/server";
import { backendApi } from "@/shared/http/backend";
import { CampusError } from "@/shared/http/errors";
import { sameOrigin } from "@/features/placement/lib/request";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
async function handle(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  if (req.method !== "GET" && !sameOrigin(req))
    return json({ error: "Invalid request origin." }, 403);
  try {
    const { path } = await context.params;
    if (
      !path.every(
        (part) =>
          /^[a-zA-Z0-9.-]{1,80}$/.test(part) && part !== "." && part !== "..",
      )
    )
      return json({ error: "Invalid resource." }, 400);
    let body: string | undefined;
    if (req.method === "POST") {
      const reader = req.body?.getReader();
      if (!reader) return json({ error: "Request is empty." }, 400);
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 15 * 1024 * 1024) {
          await reader.cancel();
          return json({ error: "Request exceeds 15 MB." }, 413);
        }
        chunks.push(value);
      }
      body = Buffer.concat(chunks).toString("utf8");
      JSON.parse(body);
    }
    const result = await backendApi(
      `/student/${path.join("/")}${req.nextUrl.search}`,
      { method: req.method as "GET" | "POST", body,
        // A full plan has a 60 s provider deadline plus authenticated database
        // reads and persistence. Other AI work retains its 75 s transport.
        timeoutMs: req.method === "POST" && path[0] === "interviews" && path.length === 1
          ? 85000
          : (path[0] === "conversations" && path[2] === "message") ||
              (req.method === "POST" && path[0] === "sessions" && ["answer", "evaluate", "coach"].includes(path[2]))
            ? 75000 : undefined,
      },
    );
    return json(result);
  } catch (error) {
    if (process.env.NODE_ENV === "development" && error instanceof CampusError)
      console.warn("Student API request failed", { status: error.status, code: error.code });
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT"))
      return json({ error: "Please sign in again." }, 401);
    return json(
      {
        code: error instanceof CampusError ? error.code : undefined,
        error:
          error instanceof CampusError
            ? error.message
            : "The request could not be completed.",
      },
      error instanceof CampusError ? error.status : 400,
    );
  }
}
export { handle as GET, handle as POST };
