"use client";
export default function ErrorView({ retry }: { retry: () => void }) {
  return (
    <section className="erp-panel">
      <h1>Unable to load this section.</h1>
      <p className="erp-muted">
        Please try again. If the problem continues, contact your campus
        administrator.
      </p>
      <button className="erp-primary" onClick={() => retry()}>
        Try again
      </button>
    </section>
  );
}
