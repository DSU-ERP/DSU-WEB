import Link from "next/link";
import { notFound } from "next/navigation";
import {
  officerSession,
  placementRead,
  placementStudentIntelligence,
} from "@/features/placement/lib/server";
import { StudentProfile } from "@/features/placement/components/StudentProfile";
import {
  IntelligenceProfile,
  IntelligenceUnavailable,
} from "@/features/placement/components/UnifiedProfile";
import { CampusError } from "@/shared/http/errors";
import { type Row } from "@/features/placement/lib/types";

// Unified student profile: the recorded placement profile (as before) plus
// the skills intelligence view from the canonical backend profile service.
// The two load in parallel; if only the skills view fails, the recorded
// profile still renders with an honest error in its place.
export default async function Journey({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await officerSession();
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const [student, intelligence] = await Promise.all([
    placementRead<Row>("student", { id }),
    placementStudentIntelligence(id).then(
      (value) => ({ value, error: "" }),
      (error: unknown) => {
        if (!(error instanceof CampusError)) throw error;
        return { value: null, error: error.message };
      },
    ),
  ]);
  return (
    <>
      <Link href="/placement/student-analytics" className="erp-back">
        ← Student analytics
      </Link>
      <StudentProfile
        student={student}
        intelligence={
          intelligence.value ? (
            <IntelligenceProfile profile={intelligence.value} />
          ) : (
            <IntelligenceUnavailable message={intelligence.error} />
          )
        }
      />
    </>
  );
}
