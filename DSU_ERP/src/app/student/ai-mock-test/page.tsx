import { backendApi } from "@/shared/http/backend";
import {
  MockTestBuilder,
  type AttemptHistory,
} from "@/features/student/components/Assessments";
export default async function Page() {
  return (
    <MockTestBuilder
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
