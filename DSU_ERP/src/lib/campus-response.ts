export class CampusError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "CampusError";
  }
}

const unavailable =
  "Campus services are temporarily unavailable. Please wait a moment and try again.";

export async function readCampusResponse<T>(response: Response): Promise<T> {
  // Hosting proxies can return HTML for cold starts, bad routes, or outages.
  // Never expose their response bodies or let JSON parsing crash the layout.
  const type = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (type !== "application/json" && !type?.endsWith("+json")) {
    await response.body?.cancel().catch(() => {});
    throw new CampusError(503, unavailable);
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new CampusError(503, unavailable);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    throw new CampusError(503, unavailable);

  if (!response.ok) {
    throw new CampusError(
      response.status,
      response.status === 403
        ? "Your account does not have access to this information."
        : response.status === 429
          ? "Too many requests. Please wait a moment and try again."
          : unavailable,
    );
  }
  if (!("data" in payload) || payload.data == null)
    throw new CampusError(503, unavailable);
  return payload as T;
}
