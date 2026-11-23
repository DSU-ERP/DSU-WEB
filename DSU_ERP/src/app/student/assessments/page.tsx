import { backendApi } from "@/shared/http/backend";
import {
  AssessmentHub,
  type PracticeData,
  type AttemptHistory,
} from "@/features/student/components/Assessments";
export default async function Page() {
  // Independent reads: fetch together instead of one after the other.
  const [practice, history] = await Promise.all([
    backendApi<{ data: PracticeData }>("/student/practice"),
    backendApi<{ data: AttemptHistory[] }>("/student/assessments/history"),
  ]);
  return <AssessmentHub data={practice.data} history={history.data} />;
}
