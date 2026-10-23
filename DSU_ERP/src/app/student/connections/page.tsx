import { skillsProfile } from "@/features/student/lib/server";
import { Connections } from "@/features/student/components/Connections";
import { PageTitle } from "@/features/student/components/UI";
import { CampusError } from "@/shared/http/errors";
import { describeFailure } from "@/shared/http/diagnostics";
import type { SkillsProfile } from "@/features/student/lib/skills";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ github?: string; code?: string; preview?: string }> }) {
  const query = await searchParams;
  let profile: SkillsProfile | null = null;
  let message = "";
  try {
    profile = await skillsProfile();
  } catch (error) {
    if (!(error instanceof CampusError)) throw error;
    message = describeFailure(error).message;
  }
  if (!profile)
    return (
      <>
        <PageTitle title="Skills profile" description="Your developer platforms, featured projects and visibility." />
        <section className="st-panel" role="alert">
          <p>{message || "Your skills profile could not be loaded. Please try again."}</p>
        </section>
      </>
    );
  return (
    <Connections
      initial={profile}
      github={typeof query.github === "string" ? query.github : undefined}
      githubCode={typeof query.code === "string" ? query.code : undefined}
      preview={query.preview === "1"}
    />
  );
}
