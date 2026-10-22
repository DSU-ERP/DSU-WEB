import { backendApi } from "@/shared/http/backend";
import { StudentChat } from "@/features/student/components/StudentChat";
import { CampusError } from "@/shared/http/errors";
import "./haki.css";
import "./haki-navigation.css";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ drive?: string | string[]; prompt?: string | string[] }>;
}) {
  // A repeated parameter (?prompt=a&prompt=b) arrives as an array: ignore it.
  const raw = await searchParams;
  const query = {
    drive: typeof raw.drive === "string" ? raw.drive : undefined,
    prompt: typeof raw.prompt === "string" ? raw.prompt : undefined,
  };
  let data: { id: string; title: string; updated_at: string }[] = [];
  let initialError: string | undefined;
  try { ({ data } = await backendApi<{ data: typeof data }>("/student/conversations")); }
  catch (error) {
    if (!(error instanceof CampusError) || error.status < 500) throw error;
    initialError = "Your conversation history couldn’t load. Reconnect to try again; you can keep your draft here.";
  }
  return (
    <StudentChat
      initial={data}
      initialError={initialError}
      driveId={
        query.drive && /^[0-9a-f-]{36}$/i.test(query.drive)
          ? query.drive
          : undefined
      }
      prompt={query.prompt?.slice(0, 4000)}
    />
  );
}
