import { notFound } from "next/navigation";
import { backendApi } from "@/shared/http/backend";
import { InterviewResultCard } from "@/features/student/components/InterviewResultCard";
import type { InterviewSession } from "@/features/student/lib/interview-types";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ open?: string | string[] }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const query = await searchParams;
  return (
    <InterviewResultCard
      autoOpen={query.open === "1"}
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
