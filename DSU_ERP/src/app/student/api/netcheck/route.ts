import { NextRequest } from "next/server";
import { userSession } from "@/shared/auth/session";
import { backendOrigin } from "@/shared/config/env";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Streams the backend's random-byte probe so the interview room can time a
// real transfer along the same path its API calls take. The generic student
// proxy only relays JSON, so this probe has its own route. Sign-in is checked
// here and the backend also requires a linked student account, as for every
// other student route. Backend error bodies are never passed through.
const MIN_BYTES = 1024;
const MAX_BYTES = 200 * 1024;
const noStore = {
  "Cache-Control": "private, no-store, no-cache, max-age=0",
  Pragma: "no-cache",
};
const json = (error: string, status: number) =>
  Response.json({ error }, { status, headers: noStore });
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("bytes") ?? "65536";
  const bytes = /^\d{4,6}$/.test(raw) ? Number(raw) : NaN;
  if (!(bytes >= MIN_BYTES && bytes <= MAX_BYTES))
    return json("Invalid probe size.", 400);
  let token: string;
  try {
    ({ token } = await userSession());
  } catch {
    return json("Please sign in again.", 401);
  }
  let origin: URL;
  try {
    origin = backendOrigin();
  } catch {
    return json("Campus services have not been configured correctly.", 503);
  }
  let response: Response;
  try {
    response = await fetch(
      new URL(`/api/v1/student/netcheck?bytes=${bytes}`, origin),
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        redirect: "error",
        // Stop the upstream transfer when the browser gives up on the probe.
        signal: AbortSignal.any([req.signal, AbortSignal.timeout(15000)]),
      },
    );
  } catch {
    return json("Campus services are temporarily unavailable.", 503);
  }
  const type = response.headers.get("content-type")?.split(";")[0].trim();
  if (!response.ok || type !== "application/octet-stream" || !response.body) {
    await response.body?.cancel().catch(() => {});
    return json(
      response.status === 429
        ? "Network checks are paused briefly."
        : response.status === 403
          ? "Student access is required for network checks."
          : "The network check could not be completed.",
      [400, 401, 403, 429].includes(response.status) ? response.status : 503,
    );
  }
  // Relay at most the requested number of bytes.
  let sent = 0;
  const capped = response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        const room = bytes - sent;
        if (room <= 0) return controller.terminate();
        const part = chunk.byteLength > room ? chunk.subarray(0, room) : chunk;
        sent += part.byteLength;
        controller.enqueue(part);
      },
    }),
  );
  return new Response(capped, {
    status: 200,
    headers: { ...noStore, "Content-Type": "application/octet-stream" },
  });
}
