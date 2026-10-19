import { backendApi } from "@/shared/http/backend";
import {
  ResumeIntake,
  type CareerData,
} from "@/features/student/components/Career";
export default async function Page() {
  return (
    <ResumeIntake
      initial={(await backendApi<{ data: CareerData }>("/student/career")).data}
    />
  );
}
