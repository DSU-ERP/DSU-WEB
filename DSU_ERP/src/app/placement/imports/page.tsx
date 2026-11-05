import { officerSession, placementImportHistory } from "@/features/placement/lib/server";
import { Refresh } from "@/features/placement/components/Controls";
import { ImportForm } from "./ImportForm";
import type { ImportSummary } from "./actions";
type Run = {
  id: string;
  source_batch: string;
  created_at: string;
  summary: ImportSummary;
};
// What a run changed, so a re-import of the same file is not mistaken for a duplicate.
function outcome(summary: ImportSummary) {
  const changed = Number(summary.inserted || 0) + Number(summary.updated || 0),
    review = Number(summary.failed || 0);
  const result = changed
    ? [
        summary.inserted ? `${summary.inserted} added` : "",
        summary.updated ? `${summary.updated} updated` : "",
      ]
        .filter(Boolean)
        .join(", ")
    : summary.unchanged
      ? "No changes · records already up to date"
      : "No changes";
  return review ? `${result} · ${review} need review` : result;
}
export default async function ImportsPage() {
  await officerSession();
  const data = await placementImportHistory<Run[]>();
  return (
    <>
      <p className="erp-eyebrow">DSU / PLACEMENT OFFICER</p>
      <div className="po-heading">
        <div>
          <h1>Data imports</h1>
          <p className="erp-muted">
            Validate, import and review official student exports.
          </p>
        </div>
        <div className="po-actions">
          <Refresh />
        </div>
      </div>
      <section className="erp-panel">
        <h2>Import a batch</h2>
        <ImportForm />
      </section>
      <section className="erp-panel">
        <h2>Recent imports</h2>
        <p className="erp-muted">
          Each row is one import run. Importing the same file again records a
          new run in which unchanged students are counted as unchanged.
        </p>
        {!data.length ? (
          <p className="erp-empty">No imports yet.</p>
        ) : (
          <div
            className="erp-table-scroll"
            role="region"
            aria-label="Recent imports"
            tabIndex={0}
          >
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Imported at</th>
                  <th>Result</th>
                  <th>Added</th>
                  <th>Updated</th>
                  <th>Unchanged</th>
                  <th>Needs review</th>
                </tr>
              </thead>
              <tbody>
                {data.map((run) => (
                  <tr key={run.id}>
                    <td>{run.source_batch}</td>
                    <td>
                      {new Date(run.created_at).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td>{outcome(run.summary)}</td>
                    <td>{run.summary.inserted}</td>
                    <td>{run.summary.updated}</td>
                    <td>{run.summary.unchanged}</td>
                    <td>{run.summary.failed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
