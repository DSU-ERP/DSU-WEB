"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="erp-panel erp-empty">
      <h1>We couldn’t load this view.</h1>
      <p>
        Campus services may be temporarily unavailable. Your records have not
        been changed.
      </p>
      <button className="erp-primary" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
