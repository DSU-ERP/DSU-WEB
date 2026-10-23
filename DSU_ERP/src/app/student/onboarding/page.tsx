import { redirect } from "next/navigation";
import { skillsProfile } from "@/features/student/lib/server";
import { SkillsOnboarding } from "@/features/student/components/SkillsOnboarding";
import { CampusError } from "@/shared/http/errors";
import { describeFailure } from "@/shared/http/diagnostics";
import type { SkillsProfile } from "@/features/student/lib/skills";

export const dynamic = "force-dynamic";

// Skills onboarding (docs/STUDENT-INTELLIGENCE.md section 4). Registration
// stays at /onboarding. State comes from the server on every load, so a reload
// resumes at the first unfinished step.
export default async function Page({ searchParams }: { searchParams: Promise<{ github?: string; code?: string }> }) {
  const query = await searchParams;
  let profile: SkillsProfile | null = null;
  let message = "";
  try {
    profile = await skillsProfile();
  } catch (error) {
    if (!(error instanceof CampusError)) throw error;
    message = describeFailure(error).message;
  }
  if (profile?.onboarding.complete) redirect("/student/dashboard");
  if (!profile)
    return (
      <section className="st-panel st-si-step" role="alert">
        <h1 className="st-si-h1">Your skills profile could not be loaded.</h1>
        <p className="st-muted">{message || "Campus services are unavailable. Please try again."}</p>
        <a className="st-button" href="/student/onboarding">
          Try again
        </a>
      </section>
    );
  return (
    <SkillsOnboarding
      initial={profile}
      github={typeof query.github === "string" ? query.github : undefined}
      githubCode={typeof query.code === "string" ? query.code : undefined}
    />
  );
}
