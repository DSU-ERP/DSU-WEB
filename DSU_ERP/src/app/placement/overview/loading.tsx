export default function Loading() {
  return <div className="po-overview po-overview-loading" role="status" aria-label="Loading placement overview">
    <span className="erp-visually-hidden">Loading placement overview</span>
    <div className="po-skeleton po-skeleton-title"/>
    <div className="po-skeleton po-skeleton-toolbar"/>
    <div className="po-overview-primary">{[0,1,2,3].map(i=><div key={i} className="po-skeleton po-skeleton-kpi"/>)}</div>
    <div className="po-skeleton po-skeleton-toolbar"/>
    <div className="po-overview-charts"><div className="po-skeleton po-skeleton-chart"/><div className="po-skeleton po-skeleton-chart"/></div>
  </div>;
}
