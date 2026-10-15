"use server";
import { revalidatePath } from "next/cache";
import { campusApi, CampusError } from "@/lib/campus-api";
import { officerSession } from "@/lib/placement/server";
export type ImportSummary = {
  id: string;
  total: number;
  valid: number;
  inserted: number;
  updated: number;
  unchanged: number;
  skipped: number;
  failed: number;
  issues: { row: number; reason: string }[];
};
export type ImportState = { error: string; summary: ImportSummary | null };
export async function importCsv(
  _previous: ImportState,
  form: FormData,
): Promise<ImportState> {
  await officerSession();
  const file = form.get("file");
  const batch = String(form.get("batch") || "");
  if (
    !(file instanceof File) ||
    !file.size ||
    file.size > 10 * 1024 * 1024 ||
    !file.name.toLowerCase().endsWith(".csv") ||
    !/^20\d{2}$/.test(batch)
  )
    return {
      error:
        "Choose a CSV file under 10 MB and enter its four-digit batch year.",
      summary: null,
    };
  try {
    const result = await campusApi<{ data: ImportSummary }>(
      `/imports?batch=${batch}`,
      { method: "POST", body: await file.text() },
    );
    revalidatePath("/placement", "layout");
    return { error: "", summary: result.data };
  } catch (e) {
    if (e instanceof CampusError) return { error: e.message, summary: null };
    throw e;
  }
}
