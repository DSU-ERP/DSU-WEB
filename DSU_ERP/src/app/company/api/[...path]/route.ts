import { NextRequest } from "next/server";
import { backendApi } from "@/shared/http/backend";
import { userSession } from "@/shared/auth/session";
import { CampusError } from "@/shared/http/errors";
import { sameOrigin } from "@/features/placement/lib/request";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Same-origin proxy for the company portal's browser calls. Only these
// resources are forwarded; the backend authorizes every one of them.
const ALLOWED = new Set(["session", "requests", "drives", "files", "friday"]);
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

async function handle(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (req.method !== "GET" && !sameOrigin(req)) return json({ error: "Invalid request origin." }, 403);
  try {
    const { path } = await context.params;
    if (!ALLOWED.has(path[0]) || path.length > 5 || !path.every((part) => /^[a-zA-Z0-9-]{1,80}$/.test(part)))
      return json({ error: "Unknown resource." }, 404);
    const session = await userSession();
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
    const ai = (path[0] === "friday" && path[3] === "message") || (path[0] === "files" && req.method === "POST");
    const result = await backendApi(`/company/${path.join("/")}`, {
      method: req.method as "GET" | "POST",
      body,
      session,
      timeoutMs: ai ? 75000 : undefined,
    });
    return json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) return json({ error: "Please sign in again." }, 401);
    return json(
      { error: error instanceof CampusError ? error.message : "The request could not be completed." },
      error instanceof CampusError ? error.status : 400,
    );
  }
}
export { handle as GET, handle as POST };
