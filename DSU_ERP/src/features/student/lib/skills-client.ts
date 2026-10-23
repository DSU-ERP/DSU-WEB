// Browser calls for the skills profile, through the /student/api proxy (which
// allows exactly these paths). Every change is followed by a fresh GET of the
// profile so the screen, the onboarding sections and the revision always come
// from the server.
import { useCallback, useState } from "react";
import { StudentApiError, studentFetch } from "./client";
import type { Platform, PlatformAccount, SkillSummary, SkillsProfile, Submitted, Visibility } from "./skills";

export type OnboardingResult = SkillsProfile["onboarding"] & { visibility: Visibility; revision: number };
export const skillsApi = {
  profile: () => studentFetch<SkillsProfile>("skills/profile"),
  confirmIdentity: () => studentFetch<OnboardingResult>("skills/onboarding", { method: "POST", body: { action: "confirm_identity" } }),
  saveVisibility: (visibility: Visibility, revision: number) =>
    studentFetch<OnboardingResult>("skills/onboarding", { method: "POST", body: { action: "visibility", visibility, revision } }),
  complete: (revision: number) =>
    studentFetch<OnboardingResult>("skills/onboarding", { method: "POST", body: { action: "complete", consent: true, revision } }),
  link: (platform: Platform, value: string, submitted: Submitted) =>
    studentFetch<PlatformAccount>(`skills/platforms/${platform}`, { method: "POST", body: { action: "link", value, submitted } }),
  declareNone: (platform: Platform) => studentFetch<PlatformAccount>(`skills/platforms/${platform}`, { method: "POST", body: { action: "declare_none" } }),
  disconnect: (platform: Platform) => studentFetch<PlatformAccount>(`skills/platforms/${platform}`, { method: "POST", body: { action: "disconnect" } }),
  accountVisibility: (platform: Platform, visible: boolean) =>
    studentFetch<PlatformAccount>(`skills/platforms/${platform}`, { method: "POST", body: { action: "visibility", visible } }),
  authorizeGitHub: () => studentFetch<{ url: string }>("skills/platforms/github/authorize", { method: "POST", body: {} }),
  githubToken: (token: string) => studentFetch<PlatformAccount>("skills/platforms/github/token", { method: "POST", body: { token } }),
  refresh: (platform: Platform) => studentFetch<PlatformAccount>(`skills/platforms/${platform}/refresh`, { method: "POST", body: {} }),
  featured: (repoIds: string[]) => studentFetch<unknown>("skills/featured", { method: "POST", body: { repoIds } }),
  summary: (body: { action: "generate" } | { action: "review"; id: string } | { action: "hide"; id: string; hidden: boolean }) =>
    studentFetch<SkillSummary>("skills/summary", { method: "POST", body }),
};

export const errorCode = (error: unknown) => (error instanceof StudentApiError ? error.code : undefined);
export const errorDetails = (error: unknown) => (error instanceof StudentApiError ? error.details : {});
export const errorText = (error: unknown) =>
  error instanceof Error && error.message ? error.message : "The request could not be completed. Please try again.";

/**
 * Shared profile state for the onboarding, connections and dashboard screens.
 * `act` runs one change at a time, records a readable error and reloads the
 * profile afterwards (also after PROFILE_CHANGED, so the next try uses the
 * latest revision).
 */
export function useSkillsProfile(initial: SkillsProfile) {
  const [profile, setProfile] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const reload = useCallback(async () => {
    const next = await skillsApi.profile();
    setProfile(next);
    return next;
  }, []);
  const act = useCallback(
    async <T,>(key: string, work: () => Promise<T>, options: { reload?: boolean } = {}): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> => {
      setBusy(key);
      try {
        const value = await work();
        if (options.reload !== false) await reload().catch(() => {});
        return { ok: true, value };
      } catch (error) {
        if (errorCode(error) === "PROFILE_CHANGED" || errorCode(error) === "ONBOARDING_INCOMPLETE") await reload().catch(() => {});
        return { ok: false, error };
      } finally {
        setBusy(null);
      }
    },
    [reload],
  );
  return { profile, setProfile, busy, act, reload };
}
