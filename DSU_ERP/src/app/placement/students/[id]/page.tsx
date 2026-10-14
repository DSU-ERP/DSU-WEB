import Link from "next/link";
import { notFound } from "next/navigation";
import { officerSession, placementRead } from "@/lib/placement/server";
import { StudentProfile } from "@/components/placement/StudentProfile";
import { type Row } from "@/lib/placement/types";
export default async function Journey({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await officerSession();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const student = await placementRead<Row>("student", { id });
  return (
    <>
      <Link href="/placement/student-analytics" className="erp-back">
        ← Student analytics
      </Link>
      <StudentProfile student={student} />
    </>
  );
}
