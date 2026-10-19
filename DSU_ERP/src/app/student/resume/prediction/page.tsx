import { backendApi } from "@/shared/http/backend";
import {
  CareerReport,
  type CareerData,
} from "@/features/student/components/Career";
export default async function Page() {
  return (
    <CareerReport
      data={(await backendApi<{ data: CareerData }>("/student/career")).data}
    />
  );
}
