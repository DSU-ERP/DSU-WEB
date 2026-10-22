import { backendApi } from "@/shared/http/backend";
import { StudentChat } from "@/features/student/components/StudentChat";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ drive?: string; prompt?: string }>;
}) {
  const query = await searchParams;
  const { data } = await backendApi<{
    data: { id: string; title: string; updated_at: string }[];
  }>("/student/conversations");
  return (
    <StudentChat
      initial={data}
      driveId={query.drive}
      prompt={query.prompt?.slice(0, 4000)}
    />
  );
}
