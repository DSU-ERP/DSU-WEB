/**
 * Same-origin check for state-changing requests.
 *
 * Comparing the Origin header against `new URL(req.url).origin` is wrong in
 * practice: Next rebuilds req.url from its own host resolution, so a browser
 * on http://127.0.0.1:3108 is compared against http://localhost:3108 and a
 * legitimate request is rejected with "Invalid request origin". The same
 * mismatch appears behind a proxy and when the dev server falls back to a
 * different port.
 *
 * The Host header is what the browser actually addressed, so comparing the
 * Origin's host against it is both correct and strict: a genuine cross-site
 * POST always carries a different Origin host, which is the case CSRF
 * protection needs to catch.
 */
export function sameOrigin(req: {
  headers: { get(name: string): string | null };
}): boolean {
  const origin = req.headers.get("origin");
  // A browser always sends Origin on a cross-site POST, so a missing Origin
  // is not a CSRF vector. It is still rejected here to preserve the stricter
  // behaviour this endpoint already had.
  if (!origin) return false;
  const host = req.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
