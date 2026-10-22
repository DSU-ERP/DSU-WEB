"use client";
export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <section className="erp-panel">
      <h1>Unable to load your workspace.</h1>
      <p>Please try again.</p>
      <button className="erp-primary" onClick={() => retry()}>
        Try again
      </button>
    </section>
  );
}
