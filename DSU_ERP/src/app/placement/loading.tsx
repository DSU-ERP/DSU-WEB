export default function Loading() {
  return (
    <div className="po-page-skeleton" role="status" aria-label="Loading placement records" aria-busy="true">
      <span className="erp-visually-hidden">Loading placement records…</span>
      {/* Page heading */}
      <div className="po-skel-heading" aria-hidden="true">
        <div className="po-skel po-skel-label" />
        <div className="po-skel po-skel-title" />
        <div className="po-skel po-skel-subtitle" />
      </div>
      {/* Metric row */}
      <div className="po-skel-metrics" aria-hidden="true">
        {[0,1,2,3].map((i) => (
          <div key={i} className="po-skel-metric-card">
            <div className="po-skel po-skel-metric-label" />
            <div className="po-skel po-skel-metric-value" />
          </div>
        ))}
      </div>
      {/* Main content panel */}
      <div className="po-skel-panel" aria-hidden="true">
        <div className="po-skel po-skel-panel-head" />
        {[0,1,2,3,4,5].map((i) => (
          <div key={i} className="po-skel po-skel-row" style={{ width: `${82 + (i % 3) * 6}%` }} />
        ))}
      </div>
      {/* Secondary panel */}
      <div className="po-skel-panel" aria-hidden="true">
        <div className="po-skel po-skel-panel-head" style={{ width: "38%" }} />
        {[0,1,2,3].map((i) => (
          <div key={i} className="po-skel po-skel-row" style={{ width: `${68 + (i % 4) * 8}%` }} />
        ))}
      </div>
    </div>
  );
}
