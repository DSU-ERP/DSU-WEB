import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="st-home st-home-loading" role="status" aria-label="Loading dashboard" aria-busy="true">
      <span className="st-visually-hidden">Loading your dashboard…</span>
      <div className="st-home-welcome" aria-hidden="true"><Skeleton className="st-home-loading-date" /><Skeleton className="st-home-loading-title" /><Skeleton className="st-home-loading-subtitle" /></div>
      <div className="st-home-launcher" aria-hidden="true">{[0, 1, 2].map((key) => <Skeleton className="st-home-loading-action" key={key} />)}</div>
      <Skeleton className="st-home-loading-next" aria-hidden="true" />
      <div className="st-home-stats" aria-hidden="true">{[0, 1, 2, 3].map((key) => <Skeleton className="st-home-loading-stat" key={key} />)}</div>
    </div>
  );
}

