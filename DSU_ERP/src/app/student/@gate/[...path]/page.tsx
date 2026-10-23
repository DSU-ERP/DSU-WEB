import { SkillsGate } from "@/features/student/components/SkillsGate";
export default async function Gate({ params }: { params: Promise<{ path: string[] }> }) {
  return <SkillsGate path={(await params).path} />;
}
