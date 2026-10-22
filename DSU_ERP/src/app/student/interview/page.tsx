import { backendApi } from "@/shared/http/backend";
import {
  InterviewLibrary,
} from "@/features/student/components/InterviewLibrary";
import { InterviewCreator } from "@/features/student/components/InterviewCreator";
import { InterviewDashboard } from "@/features/student/components/InterviewOverview";
import { InterviewSessions, type SessionPage } from "@/features/student/components/InterviewSessions";
import type {
  InterviewStats,
  InterviewPlan,
} from "@/features/student/lib/interview-types";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; new?: string; search?: string; status?: string; page?: string }>;
}) {
  const query = await searchParams;
  if (query.view === "create" || query.new === "1") return <InterviewCreator />;
  if (query.view === "sessions") {
    const search = (query.search || "").slice(0, 100);
    const status = ["active", "completed", "terminated"].includes(query.status || "") ? query.status! : "all";
    const page = Math.min(200, Math.max(1, Number.parseInt(query.page || "1", 10) || 1));
    const { data } = await backendApi<{ data: SessionPage }>("/student/interview-sessions?" + new URLSearchParams({ search, status, page: String(page) }));
    return <InterviewSessions initial={data} search={search} status={status} />;
  }
  if (query.view !== "library") {
    const [plans, stats] = await Promise.all([
      backendApi<{ data: InterviewPlan[] }>("/student/interviews"),
      backendApi<{ data: InterviewStats }>("/student/interviews/stats"),
    ]);
    return <InterviewDashboard stats={stats.data} plans={plans.data} />;
  }
  const { data: plans } = await backendApi<{ data: InterviewPlan[] }>(
    "/student/interviews",
  );
  if (query.view === "library") return <InterviewLibrary initial={plans} />;
  return <InterviewLibrary initial={plans} />;
}
