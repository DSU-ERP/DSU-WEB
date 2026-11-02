// Browser calls to the company portal's same-origin API (src/app/company/api).
export class CompanyApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "CompanyApiError";
  }
}
export async function companyFetch<T>(path: string, options: { method?: "GET" | "POST"; body?: unknown } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/company/api/${path}`, {
      method: options.method || "GET",
      headers: options.body === undefined ? {} : { "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
    });
  } catch {
    throw new CompanyApiError(
      typeof navigator !== "undefined" && navigator.onLine === false
        ? "You appear to be offline. Check your connection and try again."
        : "Could not reach the placement portal. Try again.",
      0,
    );
  }
  const result = await response.json().catch(() => null);
  if (response.status === 401 && typeof window !== "undefined") {
    window.location.assign("/login?expired=1");
    throw new CompanyApiError("Please sign in again.", 401);
  }
  if (!response.ok || !result || !("data" in result))
    throw new CompanyApiError(
      result?.error || (response.status >= 500 ? "The portal is busy. Try again in a moment." : "The request could not be completed."),
      response.status,
    );
  return result.data as T;
}

export const readBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(new Error("The file could not be read."));
    reader.readAsDataURL(file);
  });
