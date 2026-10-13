import { redirect } from "next/navigation";
import { campusApi, membership } from "@/lib/campus-api";
import { ImportForm } from "./ImportForm";
import type { ImportSummary } from "./actions";
type Run = {
  id: string;
  source_batch: string;
  created_at: string;
  summary: ImportSummary;
};
export default async function ImportsPage() {
  const access = await membership();
  if (access.role !== "admin") redirect("/portal");
  const { data } = await campusApi<{ data: Run[] }>("/imports");
  return (
    <>
      <p className="erp-eyebrow">DATA MANAGEMENT</p>
      <div className="erp-page-heading">
        <div>
          <h1>Keep your campus current.</h1>
          <p>Validate, import, and review official student exports.</p>
        </div>
        <span className="erp-role">Administrator</span>
      </div>
      <section className="erp-panel">
        <h2>Import a batch</h2>
        <ImportForm />
      </section>
      <section className="erp-panel">
        <h2>Recent imports</h2>
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
                  <th>Date</th>
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
                      {new Date(run.created_at).toLocaleDateString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      })}
                    </td>
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
