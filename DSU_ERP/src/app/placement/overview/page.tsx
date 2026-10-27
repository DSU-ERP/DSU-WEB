// Static route supplies a dashboard-specific loading boundary while sharing
// the existing authenticated report loader.
import PlacementSection from "../[section]/page";
export default function OverviewPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  return <PlacementSection params={Promise.resolve({section:"overview"})} searchParams={searchParams}/>;
}
