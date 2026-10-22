import { backendApi } from "@/shared/http/backend";
import {
  Dashboard,
  type DashboardData,
} from "@/features/student/components/Dashboard";
export default async function Page() {
  const { data } = await backendApi<{ data: DashboardData }>(
    "/student/dashboard",
  );
  return <Dashboard data={data} />;
}
