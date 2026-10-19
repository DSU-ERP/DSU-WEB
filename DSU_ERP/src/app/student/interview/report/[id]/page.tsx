import { notFound } from "next/navigation";
import { backendApi } from "@/shared/http/backend";
import { InterviewResults } from "@/features/student/components/InterviewRoom";
import type { InterviewSession } from "@/features/student/lib/interview-types";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  return (
    <InterviewResults
      initial={
        (
          await backendApi<{ data: InterviewSession }>(
            `/student/sessions/${id}`,
          )
        ).data
      }
    />
  );
}
