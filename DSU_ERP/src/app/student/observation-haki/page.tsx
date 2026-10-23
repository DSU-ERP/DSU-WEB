import { redirect } from "next/navigation";

/** Preserves old bookmarked student-assistant links during the F.R.I.D.A.Y. rename. */
export default async function ObservationHakiRedirect({
  searchParams,
}: {
  searchParams: Promise<{ drive?: string | string[]; prompt?: string | string[] }>;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  if (typeof raw.drive === "string" && /^[0-9a-f-]{36}$/i.test(raw.drive)) params.set("drive", raw.drive);
  if (typeof raw.prompt === "string") params.set("prompt", raw.prompt.slice(0, 4000));
  redirect(`/student/friday${params.size ? `?${params}` : ""}`);
}
