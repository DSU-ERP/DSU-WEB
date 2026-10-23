import type { NextRequest } from "next/server";
import { backendApi } from "@/shared/http/backend";
import { CampusError } from "@/shared/http/errors";
import { workspaceAccess } from "@/shared/auth/workspace";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GitHub App web flow return URL (GITHUB_OAUTH_REDIRECT_URL in the backend).
// GitHub sends the browser here with ?code&state. The code is exchanged by the
// backend with the student's session token; it is never logged, stored or
// echoed, and the browser only ever receives a same-origin redirect.
const CODE = /^[A-Za-z0-9_-]{1,200}$/;
const STATE = /^[A-Za-z0-9_-]{32,200}$/;
const SAFE_CODE = /^[A-Z0-9_]{2,40}$/;

function go(path: string) {
  // A relative Location keeps the redirect on this origin by construction.
  return new Response(null, {
    status: 303,
    headers: {
      Location: path,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

async function destination() {
  try {
    const access = await workspaceAccess();
    // Same rule as the gate (skillsGateRedirect): only an explicit true means
    // onboarding is still required; older backends omit the flag.
    return access.onboardingRequired !== true ? "/student/connections" : "/student/onboarding";
  } catch {
    return "/student/onboarding";
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code") ?? "";
  const state = params.get("state") ?? "";
  const base = await destination();
  const failed = (reason: string) =>
    go(`${base}?github=error&code=${SAFE_CODE.test(reason) ? reason : "GITHUB_CONNECT_FAILED"}`);
  // The student cancelled on GitHub, or GitHub reported a problem.
  if (params.get("error")) return failed(params.get("error") === "access_denied" ? "GITHUB_ACCESS_DENIED" : "GITHUB_CONNECT_FAILED");
  if (!CODE.test(code) || !STATE.test(state)) return failed("OAUTH_STATE_INVALID");
  try {
    await backendApi("/student/skills/platforms/github/callback", {
      method: "POST",
      body: JSON.stringify({ code, state }),
    });
  } catch (error) {
    if (error instanceof CampusError && error.status === 401) return go("/login?portal=student&expired=1");
    return failed(error instanceof CampusError && error.code ? error.code : "GITHUB_CONNECT_FAILED");
  }
  return go(`${base}?github=connected`);
}
