"use server";
import { revalidatePath } from "next/cache";
import { placementMutate, officerSession } from "@/lib/placement/server";
import { CampusError } from "@/lib/campus-response";
import type { Row } from "@/lib/placement/types";
export type MutationState = { error: string; success?: string; id?: string };
export async function changePlacement(
  _previous: MutationState,
  form: FormData,
): Promise<MutationState> {
  await officerSession();
  try {
    const action = String(form.get("action") || ""),
      requestId = String(form.get("request_id") || "");
    const serialized = String(form.get("payload") || "{}");
    if (serialized.length > 260000 || !/^[0-9a-f-]{36}$/i.test(requestId))
      return { error: "Invalid request. Reload and try again." };
    const result = await placementMutate<Row>(
      action,
      JSON.parse(serialized),
      requestId,
    );
    revalidatePath("/placement", "layout");
    return {
      error: "",
      success: "Changes saved.",
      id: typeof result.id === "string" ? result.id : undefined,
    };
  } catch (error) {
    return {
      error:
        error instanceof CampusError
          ? error.message
          : "Unable to save. Check your entries and try again.",
    };
  }
}
