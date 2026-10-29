import { notFound } from "next/navigation";
import { officerSession, placementRankingStudent } from "@/features/placement/lib/server";
import { RankingDetail } from "@/features/placement/components/StudentsRanking";
import { CampusError } from "@/shared/http/errors";

// One student's scores, explanation, positions and topic evidence.
export default async function StudentRankingDetail({ params }: { params: Promise<{ id: string }> }) {
  await officerSession();
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  try {
    return <RankingDetail data={await placementRankingStudent(id)} />;
  } catch (error) {
    if (error instanceof CampusError && error.status === 404) notFound();
    throw error;
  }
}
