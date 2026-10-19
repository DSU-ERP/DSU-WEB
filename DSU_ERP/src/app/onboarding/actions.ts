"use server";
import { backendApi } from "@/shared/http/backend";
import { CampusError } from "@/shared/http/errors";
import type { ProfileDetails } from "@/features/student/lib/types";
import type { RegistrationAcademic } from "@/features/student/lib/registration-types";
export async function saveRegistration(input: {
  details: ProfileDetails;
  academic: RegistrationAcademic;
  step: number;
  revision: number;
  complete: boolean;
  consent: boolean;
}) {
  try {
    return {
      data: (
        await backendApi<{
          data: { revision: number; status: string; home: string | null };
        }>("/onboarding", { method: "POST", body: JSON.stringify(input) })
      ).data,
      error: "",
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof CampusError
          ? error.message
          : "Unable to save your setup. Please try again.",
    };
  }
}
