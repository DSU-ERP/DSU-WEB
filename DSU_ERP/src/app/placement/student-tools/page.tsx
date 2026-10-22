import { backendApi } from "@/shared/http/backend";
import {
  StudentTools,
  type AssignedTest,
  type CampusEvent,
  type CampusNotice,
} from "@/features/placement/components/StudentTools";
export default async function Page() {
  const tests = (
    await backendApi<{ data: AssignedTest[] }>("/placement/tools/assessments")
  ).data;
  const events = (
    await backendApi<{ data: CampusEvent[] }>("/placement/tools/events")
  ).data;
  const notices = (
    await backendApi<{ data: CampusNotice[] }>("/placement/tools/notices")
  ).data;
  return (
    <StudentTools
      initialTests={tests}
      initialEvents={events}
      initialNotices={notices}
    />
  );
}
