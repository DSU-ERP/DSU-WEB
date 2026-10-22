import { backendApi } from "@/shared/http/backend";
import { CampusError } from "@/shared/http/errors";
import {
  CareerReport,
  type CareerData,
  type CareerHistoryItem,
} from "@/features/student/components/Career";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ report?: string }>;
}) {
  const { report } = await searchParams;
  const [latest, history] = await Promise.all([
    backendApi<{ data: CareerData }>("/student/career"),
    backendApi<{ data: CareerHistoryItem[] }>("/student/career/reports"),
  ]);
  let data = latest.data,
    unavailable = false;
  if (report && report !== data.report?.id) {
    if (!/^[0-9a-f-]{36}$/i.test(report)) unavailable = true;
    else
      try {
        const selected = await backendApi<{ data: CareerData["report"] }>(
          `/student/career/reports/${report}`,
        );
        data = { ...data, report: selected.data };
      } catch (error) {
        if (!(error instanceof CampusError) || error.status !== 404) throw error;
        unavailable = true;
      }
  }
  return (
    <CareerReport data={data} history={history.data} unavailable={unavailable} />
  );
}
