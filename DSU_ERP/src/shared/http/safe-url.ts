// External links that come from API data (profile links, repositories,
// certificates). Shared by the student and placement workspaces so both apply
// the same rule. No server-only imports: pages, client components and unit
// tests use it.

/** Only absolute https URLs without credentials are ever linked; anything else is null. */
export function safeHttps(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2000) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}
