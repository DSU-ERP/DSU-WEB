"use server";
import { backendApi } from "@/shared/http/backend";
import { CampusError } from "@/shared/http/errors";

/**
 * A short-lived link to a private file (JD PDF or resume). The backend checks
 * that the signed-in account may read it before signing the link.
 */
export async function fileLink(id: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return { ok: false, error: "Invalid file." };
  try {
    const { data } = await backendApi<{ data: { url: string } }>(`/files/${id}/link`);
    if (!/^https:\/\//.test(data.url) && !(process.env.NODE_ENV !== "production" && /^http:\/\//.test(data.url)))
      return { ok: false, error: "The file link was not valid." };
    return { ok: true, url: data.url };
  } catch (error) {
    return { ok: false, error: error instanceof CampusError ? error.message : "The file could not be opened. Try again." };
  }
}
