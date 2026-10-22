import { notFound } from "next/navigation";
import { backendApi } from "@/shared/http/backend";
import { InterviewPlanView } from "@/features/student/components/InterviewRoom";
import type { InterviewPlanDetail } from "@/features/student/lib/interview-types";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  return (
    <InterviewPlanView
      plan={
        (
          await backendApi<{ data: InterviewPlanDetail }>(
            `/student/interviews/${id}`,
          )
        ).data
      }
    />
  );
}
