/**
 * Extra, user-relevant fields some backend errors carry (skills onboarding and
 * platform connections). Only these keys, with these types, are kept.
 */
export type CampusErrorDetails = {
  missing?: string[];
  fields?: string[];
  revision?: number;
  retryAfterSeconds?: number;
};
export class CampusError extends Error {
  constructor(
    public status: number,
    message: string,
    // Machine-readable reason (backend error code or a local diagnosis).
    public code?: string,
    public details?: CampusErrorDetails,
  ) {
    super(message);
    this.name = "CampusError";
  }
}

const shortList = (value: unknown) =>
  Array.isArray(value) && value.length <= 40 && value.every((v) => typeof v === "string" && /^[A-Za-z0-9_.]{1,80}$/.test(v))
    ? (value as string[])
    : undefined;
const wholeNumber = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 2147483647 ? value : undefined;
/** Picks the known extra fields from a backend error body, dropping anything else. */
export function errorDetails(failure: unknown): CampusErrorDetails | undefined {
  if (!failure || typeof failure !== "object") return undefined;
  const raw = failure as Record<string, unknown>;
  const details: CampusErrorDetails = {};
  const missing = shortList(raw.missing), fields = shortList(raw.fields);
  const revision = wholeNumber(raw.revision), retryAfterSeconds = wholeNumber(raw.retryAfterSeconds);
  if (missing) details.missing = missing;
  if (fields) details.fields = fields;
  if (revision !== undefined) details.revision = revision;
  if (retryAfterSeconds !== undefined) details.retryAfterSeconds = retryAfterSeconds;
  return Object.keys(details).length ? details : undefined;
}

const unavailable =
  "Campus services are temporarily unavailable. Please wait a moment and try again.";

// Backend codes whose messages are written for end users even outside 4xx.
const safe = new Set([
  "AI_NOT_CONFIGURED", "AI_UNAVAILABLE", "AI_TIMEOUT", "AI_OUTPUT_LIMIT", "AI_INVALID_RESPONSE", "AI_BUSY", "AI_RATE_LIMIT",
  "INVALID_GRADING", "BLUEPRINT_MISMATCH",
  "PROFILE_CHANGED", "NOT_ELIGIBLE", "TIME_ENDED", "ATTEMPT_CHANGED", "LEVEL_LOCKED",
  "ALREADY_TAKEN", "CODE_UNAVAILABLE", "CODE_REQUIRED", "SESSION_ENDED", "RETRY_UNAVAILABLE",
  "FINISH_FIRST", "ONBOARDING_NOT_ALLOWED", "STUDENT_ACCESS_REQUIRED",
  "PT400", "PT404", "PT409", "PT413", "PT429",
  // Student skills onboarding and platform connections (written for students).
  "ONBOARDING_REQUIRED", "ONBOARDING_INCOMPLETE", "GITHUB_APP_NOT_CONFIGURED", "INTEGRATIONS_NOT_CONFIGURED",
  "PROVIDER_RATE_LIMITED", "PROVIDER_UNAVAILABLE", "GITHUB_TOKEN_INVALID", "FINE_GRAINED_TOKEN_REQUIRED",
  "OAUTH_EXCHANGE_FAILED", "OAUTH_STATE_INVALID", "GITHUB_ACCOUNT_IN_USE", "GITHUB_AUTH_REQUIRED",
  "INVALID_PLATFORM_HANDLE", "INVALID_SUBMITTED_FIELDS", "NOT_SYNCABLE", "RECONNECT_REQUIRED", "REFRESH_LIMIT",
  "INVALID_FEATURED", "SUMMARY_LIMIT",
]);
// Status codes where the backend only sends deliberate, user-facing messages.
const userFacingStatuses = new Set([400, 404, 409, 413, 422, 429]);

export async function readCampusResponse<T>(response: Response): Promise<T> {
  // Hosting proxies can return HTML for cold starts, bad routes, or outages.
  // Never expose their response bodies or let JSON parsing crash the layout.
  const type = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (type !== "application/json" && !type?.endsWith("+json")) {
    await response.body?.cancel().catch(() => {});
    throw new CampusError(503, unavailable, "BACKEND_INVALID_RESPONSE");
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new CampusError(503, unavailable, "BACKEND_INVALID_RESPONSE");
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    throw new CampusError(503, unavailable, "BACKEND_INVALID_RESPONSE");

  if (!response.ok) {
    const failure = (payload as { error?: unknown }).error;
    // Fastify's own "route not found" body has a string `error`. The web is
    // calling a route this backend build does not have: it is out of date.
    if (response.status === 404 && (typeof failure === "string" || failure === undefined))
      throw new CampusError(503, unavailable, "BACKEND_OUTDATED");
    const { code, message } = (failure && typeof failure === "object" ? failure : {}) as {
      code?: unknown;
      message?: unknown;
    };
    const known = typeof code === "string" ? code : undefined;
    if (known === "DATABASE_UPDATE_PENDING")
      throw new CampusError(503, "The campus database update is pending. Please try again after it is applied.", known);
    if (
      known && typeof message === "string" && message.length <= 1000 && !known.startsWith("FST_") &&
      (safe.has(known) || userFacingStatuses.has(response.status))
    )
      throw new CampusError(response.status, message, known, errorDetails(failure));
    throw new CampusError(
      response.status,
      response.status === 403
        ? "Your account does not have access to this information."
        : response.status === 429
          ? "Too many requests. Please wait a moment and try again."
          : unavailable,
      known,
    );
  }
  if (!("data" in payload) || payload.data == null)
    throw new CampusError(503, unavailable, "BACKEND_INVALID_RESPONSE");
  return payload as T;
}
