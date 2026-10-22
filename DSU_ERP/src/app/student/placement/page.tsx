import { backendApi } from "@/shared/http/backend";
import {
  PlacementBoard,
  type OpportunityList,
} from "@/features/student/components/Placement";
import {
  PlacementRecord,
  type PlacementRecordData,
} from "@/features/student/components/PlacementRecord";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ drive?: string }>;
}) {
  const query = await searchParams;
  const [opportunities, record] = await Promise.all([
    backendApi<{ data: OpportunityList }>("/student/opportunities"),
    // The track record is optional: the opportunities stay usable without it.
    backendApi<{ data: PlacementRecordData }>("/student/placement-record").catch(() => null),
  ]);
  return (
    <>
      <PlacementBoard initial={opportunities.data} driveId={query.drive} />
      {record && <PlacementRecord record={record.data} />}
    </>
  );
}
