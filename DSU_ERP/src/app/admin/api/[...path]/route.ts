import { NextRequest } from "next/server";
import { backendApi } from "@/shared/http/backend";
import { userSession } from "@/shared/auth/session";
import { CampusError } from "@/shared/http/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read-only proxy for the Admin portal's live view. Only trace reads are
// forwarded, and the backend checks the admin list on every one.
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    if (path[0] !== "agent-runs" || path.length > 2 || (path[1] && !/^[0-9a-f-]{36}$/i.test(path[1])))
      return json({ error: "Unknown resource." }, 404);
    const allowed = new Set(["assistant", "status", "tool", "since", "until", "changedAfter", "limit"]);
    const query = new URLSearchParams([...req.nextUrl.searchParams].filter(([key]) => allowed.has(key)));
    const session = await userSession();
    const result = await backendApi(`/admin/${path.join("/")}${query.size ? `?${query}` : ""}`, { session });
    return json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) return json({ error: "Please sign in again." }, 401);
    return json({ error: error instanceof CampusError ? error.message : "The request could not be completed." }, error instanceof CampusError ? error.status : 400);
  }
}
