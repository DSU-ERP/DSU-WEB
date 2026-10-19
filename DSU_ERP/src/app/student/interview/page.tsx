import { backendApi } from "@/shared/http/backend";
import {
  InterviewCreator,
  InterviewDashboard,
  InterviewLibrary,
} from "@/features/student/components/InterviewWorkspace";
import type {
  InterviewStats,
  InterviewPlan,
} from "@/features/student/lib/interview-types";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; new?: string }>;
}) {
  const query = await searchParams;
  if (query.view === "create" || query.new === "1") return <InterviewCreator />;
  const { data: plans } = await backendApi<{ data: InterviewPlan[] }>(
    "/student/interviews",
  );
  if (query.view === "library") return <InterviewLibrary initial={plans} />;
  const { data: stats } = await backendApi<{ data: InterviewStats }>(
    "/student/interviews/stats",
  );
  return <InterviewDashboard stats={stats} plans={plans} />;
}
