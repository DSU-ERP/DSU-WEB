import { backendApi } from "@/shared/http/backend";
import { Readiness } from "@/features/student/components/Readiness";
import type { DashboardData } from "@/features/student/components/Dashboard";
export default async function Page() {
  const { data } = await backendApi<{ data: DashboardData }>(
    "/student/readiness",
  );
  return <Readiness data={data} />;
}
