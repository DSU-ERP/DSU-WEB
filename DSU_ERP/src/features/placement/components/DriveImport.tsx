"use client";
import { useRef, useState } from "react";
import { FileText, TriangleAlert } from "lucide-react";
import { DriveEditor } from "./DriveEditor";
import type { Report, Row } from "@/features/placement/lib/types";
import {
  FIELD_LABELS,
  driveImportDefaults,
  type DriveImportResult,
} from "@/features/placement/lib/driveImport";

const LIMIT = 10 * 1024 * 1024;

/**
 * New-drive form with an optional "Import from drive PDF" step. Suggestions
 * only prefill the form; the officer reviews and saves (or publishes) it.
 */
export function DriveCreator({
  companies,
  options,
  defaultCompany,
}: {
  companies: Row[];
  options: Report["options"];
  defaultCompany?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<DriveImportResult | null>(null),
    [applied, setApplied] = useState<{ prefill: Row; notes: string[] } | null>(null),
    [version, setVersion] = useState(0);
  // Set when the officer types or clicks in the form below, so filling it
  // from the PDF never silently replaces their work.
  const edited = useRef(false);
  const read = async () => {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) || !file.size || file.size > LIMIT) {
      setError("Choose a PDF of 10 MB or less.");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    // Notes about the previous PDF no longer apply; the form itself is kept.
    setApplied((previous) => previous && { ...previous, notes: [] });
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
        reader.onerror = () => reject(new Error("This file could not be read."));
        reader.readAsDataURL(file);
      });
      const response = await fetch("/placement/drive-import-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, data }),
        cache: "no-store",
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.data)
        throw new Error(body?.error || "The drive PDF could not be read. Fill in the form manually.");
      setResult(body.data as DriveImportResult);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const apply = () => {
    if (!result) return;
    if (
      edited.current &&
      !window.confirm(
        "Replace everything in the drive form below with the values from this PDF? What you typed will be lost.",
      )
    )
      return;
    const departments = Array.isArray(options.departments) ? options.departments : [];
    const next = driveImportDefaults(result.fields, companies, departments);
    setApplied({ prefill: next.prefill as Row, notes: next.notes });
    setVersion((v) => v + 1);
    edited.current = false;
  };
  const markEdited = () => {
    edited.current = true;
  };
  const found = result ? Object.keys(FIELD_LABELS).length - result.missingFields.length : 0;
  return (
    <>
      <section className="erp-panel po-import" aria-labelledby="po-import-title">
        <h2 id="po-import-title">Import from drive PDF · optional</h2>
        <p className="erp-muted">
          Upload the recruiter’s drive notice (PDF, up to 10 MB). AI suggests values for the form below.
          Nothing is saved or published until you review the form and press Save. The extracted text is kept
          for officers; the PDF itself is not stored.
        </p>
        <div className="po-import-row">
          <input
            ref={input}
            type="file"
            accept="application/pdf,.pdf"
            aria-label="Drive PDF"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setResult(null);
              setError("");
            }}
          />
          <button type="button" className="erp-secondary" disabled={!file || busy} onClick={() => void read()}>
            <FileText size={14} aria-hidden="true" />
            {busy ? "Reading the PDF…" : "Read PDF"}
          </button>
        </div>
        <p role="status" aria-live="polite" className={error ? "erp-form-error" : "erp-muted"}>
          {error || (busy ? "Extracting text and suggesting fields. This can take up to a minute." : "")}
        </p>
        {result && (
          <div className="po-import-review">
            <p>
              <strong>{result.document.filename}</strong> · {result.document.pageCount ?? "?"} page
              {result.document.pageCount === 1 ? "" : "s"} · {result.document.chars.toLocaleString("en-IN")} characters ·{" "}
              {found} of {Object.keys(FIELD_LABELS).length} fields found
            </p>
            {!!result.warnings.length && (
              <ul className="po-import-warnings">
                {result.warnings.map((warning, index) => (
                  <li key={index}>
                    <TriangleAlert size={13} aria-hidden="true" /> {warning}
                  </li>
                ))}
              </ul>
            )}
            {!!result.missingFields.length && (
              <p className="erp-muted">
                Not found in the PDF (fill in yourself):{" "}
                {result.missingFields.map((field) => FIELD_LABELS[field] || field).join(", ")}.
              </p>
            )}
            <dl className="po-import-fields">
              {Object.entries(FIELD_LABELS)
                .filter(([field]) => !result.missingFields.includes(field))
                .map(([field, label]) => {
                  const value = result.fields[field as keyof typeof result.fields];
                  return (
                    <div key={field}>
                      <dt>{label}</dt>
                      <dd>{Array.isArray(value) ? value.join(", ") : String(value)}</dd>
                    </div>
                  );
                })}
            </dl>
            {result.text && (
              <details>
                <summary>Extracted text</summary>
                <pre className="po-import-text">{result.text}</pre>
              </details>
            )}
            <div className="po-form-actions">
              <button type="button" className="erp-primary" onClick={apply} disabled={found === 0}>
                {applied ? "Fill the form again" : "Fill the form with these values"}
              </button>
              <p className="erp-muted">
                Fills the form below. If you have already typed in it, you are asked before anything is replaced.
              </p>
            </div>
          </div>
        )}
        {applied && !!applied.notes.length && (
          <ul className="po-import-warnings">
            {applied.notes.map((note, index) => (
              <li key={index}>
                <TriangleAlert size={13} aria-hidden="true" /> {note}
              </li>
            ))}
          </ul>
        )}
        {applied && (
          <p className="po-note" role="status">
            Form filled from the PDF. Check every field, add the batch and academic year, then save. Publishing
            stays off until you tick it.
          </p>
        )}
      </section>
      <section
        className="erp-panel"
        onInputCapture={markEdited}
        onClickCapture={(e) => {
          // Round editor buttons (add, move, remove) change the form without typing.
          if ((e.target as HTMLElement).closest("button")) markEdited();
        }}
      >
        <DriveEditor
          key={version}
          companies={companies}
          options={options}
          defaultCompany={
            typeof applied?.prefill.company_id === "string" ? applied.prefill.company_id : defaultCompany
          }
          prefill={applied?.prefill}
        />
      </section>
    </>
  );
}
