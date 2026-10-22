import { NextRequest } from "next/server";
import { backendApi } from "@/shared/http/backend";
import { CampusError } from "@/shared/http/errors";
import { sameOrigin } from "@/features/placement/lib/request";
import { officerSession } from "@/features/placement/lib/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
// Forwards a drive PDF (base64 JSON, 10 MB file limit) to the backend parser.
// The backend verifies the officer, extracts text and returns suggestions only.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "Invalid request origin." }, 403);
  try {
    await officerSession();
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
        return json({ error: "Choose a PDF of 10 MB or less." }, 413);
      }
      chunks.push(value);
    }
    const body = Buffer.concat(chunks).toString("utf8");
    JSON.parse(body);
    return json(await backendApi("/placement/drives/parse", { method: "POST", body }));
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT"))
      return json({ error: "Please sign in again." }, 401);
    return json(
      { error: error instanceof CampusError ? error.message : "The drive PDF could not be read." },
      error instanceof CampusError ? error.status : 400,
    );
  }
}
