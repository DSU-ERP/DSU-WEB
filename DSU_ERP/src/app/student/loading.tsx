export default function Loading() {
  return (
    <div className="st-page-skeleton" role="status" aria-label="Loading" aria-busy="true">
      <span className="st-visually-hidden">Loading your student workspace…</span>
      {/* Breadcrumb skeleton is in topbar — show heading skeleton */}
      <div className="st-skel-heading" aria-hidden="true">
        <div className="st-skel st-skel-eyebrow" />
        <div className="st-skel st-skel-title" />
        <div className="st-skel st-skel-subtitle" />
      </div>
      {/* Metric tiles */}
      <div className="st-skel-metrics" aria-hidden="true">
        {[0,1,2,3].map((i) => (
          <div key={i} className="st-skel-metric-card">
            <div className="st-skel st-skel-metric-label" />
            <div className="st-skel st-skel-metric-value" />
            <div className="st-skel st-skel-metric-sub" />
          </div>
        ))}
      </div>
      {/* Content panel */}
      <div className="st-skel-panel" aria-hidden="true">
        <div className="st-skel st-skel-panel-head" />
        {[0,1,2,3,4].map((i) => (
          <div key={i} className="st-skel st-skel-row" style={{ width: `${78 + (i % 3) * 7}%` }} />
        ))}
      </div>
    </div>
  );
}
