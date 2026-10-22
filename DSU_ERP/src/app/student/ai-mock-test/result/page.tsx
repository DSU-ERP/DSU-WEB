import { notFound } from "next/navigation";
import { backendApi } from "@/shared/http/backend";
import {
  TestResults,
  type Attempt,
} from "@/features/student/components/Assessments";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ attempt?: string }>;
}) {
  const { attempt } = await searchParams;
  if (!attempt || !/^[0-9a-f-]{36}$/i.test(attempt)) notFound();
  return (
    <TestResults
      initial={
        (await backendApi<{ data: Attempt }>(`/student/attempts/${attempt}`))
          .data
      }
    />
  );
}
