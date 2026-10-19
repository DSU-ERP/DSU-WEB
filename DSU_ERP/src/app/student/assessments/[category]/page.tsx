import { notFound } from "next/navigation";
import { backendApi } from "@/shared/http/backend";
import {
  PracticeCategory,
  type PracticeData,
} from "@/features/student/components/Assessments";
export default async function Page({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params,
    { data } = await backendApi<{ data: PracticeData }>("/student/practice");
  if (!Object.hasOwn(data.categories, category)) notFound();
  return <PracticeCategory category={category} data={data} />;
}
