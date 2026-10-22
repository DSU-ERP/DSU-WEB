import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return <div className="iw-loading" role="status" aria-label="Loading interview workspace"><span className="st-visually-hidden">Loading your interview workspace…</span><Skeleton className="iw-loading-title" /><Skeleton className="iw-loading-description" /><div>{[0, 1, 2, 3].map((key) => <Skeleton key={key} />)}</div><Skeleton className="iw-loading-chart" /></div>;
}
