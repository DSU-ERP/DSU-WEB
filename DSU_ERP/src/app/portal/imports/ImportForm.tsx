"use client";
import { useActionState, useState } from "react";
import { importCsv, type ImportState } from "./actions";
export function ImportForm() {
  const [state, action, pending] = useActionState(importCsv, {
    error: "",
    summary: null,
  } as ImportState);
  const [fileError, setFileError] = useState("");
  return (
    <>
      <form action={action} className="erp-form erp-import-form">
        <label htmlFor="batch">Source batch year</label>
        <input
          id="batch"
          name="batch"
          required
          pattern="20[0-9]{2}"
          placeholder="2026"
          inputMode="numeric"
          maxLength={4}
        />
        <label htmlFor="csv">Student export</label>
        <input
          id="csv"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          onChange={(event) => {
            const file = event.target.files?.[0];
            setFileError(
              file &&
                (!file.name.toLowerCase().endsWith(".csv") ||
                  file.size > 10 * 1024 * 1024)
                ? "Choose a CSV file smaller than 10 MB."
                : "",
            );
          }}
        />
        <p className="erp-muted">
          Use the university’s 40-column export. Maximum 10 MB. Existing records
          are updated only when their data changes. Review the summary for rows
          that need correction.
        </p>
        <button className="erp-primary" disabled={pending || !!fileError}>
          {pending ? "Validating and importing…" : "Import student records →"}
        </button>
        <p role="alert" className="erp-form-error">
          {fileError || state.error}
        </p>
      </form>
      {state.summary && (
        <section className="erp-import-result" aria-live="polite">
          <h3>Import complete</h3>
          <p>
            {state.summary.inserted} added · {state.summary.updated} updated ·{" "}
            {state.summary.unchanged} unchanged · {state.summary.skipped}{" "}
            skipped · {state.summary.failed} need review
          </p>
          {state.summary.issues.length > 0 && (
            <details>
              <summary>Review reported rows</summary>
              <ul>
                {state.summary.issues.map((issue, i) => (
                  <li key={i}>
                    Row {issue.row}: {issue.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}
    </>
  );
}
