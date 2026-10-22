import { backendApi } from "@/shared/http/backend";
import {
  AssignedTests,
  type AttemptHistory,
} from "@/features/student/components/Assessments";
export default async function Page() {
  return (
    <AssignedTests
      history={
        (
          await backendApi<{ data: AttemptHistory[] }>(
            "/student/assessments/history",
          )
        ).data
      }
    />
  );
}
