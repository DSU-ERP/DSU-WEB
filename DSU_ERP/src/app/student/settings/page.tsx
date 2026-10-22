import { studentProfile } from "@/features/student/lib/server";
import { ProfileForm } from "@/features/student/components/ProfileForm";
export default async function Page() {
  return <ProfileForm initial={await studentProfile()} />;
}
