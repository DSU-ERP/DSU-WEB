import { backendOrigin, authConfiguration } from "@/shared/config/env";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    authConfiguration();
    const response = await fetch(new URL("/health/ready", backendOrigin()), { cache: "no-store", signal: AbortSignal.timeout(3000), redirect: "error" });
    if (!response.ok) throw Error();
    return Response.json({ status: "ready" }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
