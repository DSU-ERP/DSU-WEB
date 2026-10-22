"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { placementMutate, officerSession } from "@/features/placement/lib/server";
import { CampusError } from "@/shared/http/errors";
import type { Row } from "@/features/placement/lib/types";
export type MutationState = { error: string; success?: string; id?: string };
export async function changePlacement(
  _previous: MutationState,
  form: FormData,
): Promise<MutationState> {
  await officerSession();
  // Deletions leave the record's page: navigate on the server, because
  // re-rendering the deleted record's page would only show its error view.
  const leaveTo = String(form.get("redirect") || "");
  const safeLeave = /^\/placement(?:\/[a-z0-9-]+)*$/i.test(leaveTo) ? leaveTo : "";
  let state: MutationState;
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
    state = {
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
  if (safeLeave) redirect(safeLeave);
  return state;
}
