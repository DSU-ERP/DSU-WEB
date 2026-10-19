export async function studentFetch<T>(
  path: string,
  options: {
    method?: "GET" | "POST";
    body?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/student/api/${path}`, {
      method: options.method || "GET",
      signal: options.signal,
      headers: options.body ? { "Content-Type": "application/json" } : {},
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error;
    throw new Error(
      typeof navigator !== "undefined" && navigator.onLine === false
        ? "You appear to be offline. Check your connection and try again."
        : "Could not reach campus services. Check your connection and try again.",
    );
  }
  const result = await response.json().catch(() => null);
  // The session ended in another tab or expired: sign in again, then return.
  if (response.status === 401 && typeof window !== "undefined") {
    window.location.assign("/login?portal=student&expired=1");
    throw new Error("Please sign in again.");
  }
  if (!response.ok || !result || !("data" in result))
    throw new Error(
      result?.error ||
        (response.status >= 500
          ? "Campus services are busy right now. Please try again in a moment."
          : "The request could not be completed. Please try again."),
    );
  return result.data as T;
}
