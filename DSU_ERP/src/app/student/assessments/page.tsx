import { backendApi } from "@/shared/http/backend";
import {
  AssessmentHub,
  type PracticeData,
  type AttemptHistory,
} from "@/features/student/components/Assessments";
export default async function Page() {
  const data = (await backendApi<{ data: PracticeData }>("/student/practice"))
      .data,
    history = (
      await backendApi<{ data: AttemptHistory[] }>(
        "/student/assessments/history",
      )
    ).data;
  return <AssessmentHub data={data} history={history} />;
}
