"use client";
import { useRef, useState } from "react";
import { Upload, FileCheck2, TriangleAlert } from "lucide-react";
import { studentFetch } from "../lib/client";
export type UploadedDocument = {
  id: string;
  filename: string;
  content: string;
  pageCount?: number | null;
  chars?: number;
  truncated?: boolean;
  lowText?: boolean;
};
export function DocumentUpload({
  kind,
  onReady,
  label = "Upload a document",
}: {
  kind: "resume" | "jd" | "attachment";
  onReady: (document: UploadedDocument) => void;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [name, setName] = useState(""),
    [drag, setDrag] = useState(false),
    [ready, setReady] = useState<UploadedDocument | null>(null);
  const read = async (file: File) => {
    if (
      !/\.(pdf|docx|txt|md)$/i.test(file.name) ||
      file.size > 10 * 1024 * 1024 ||
      !file.size
    ) {
      setError("Choose a PDF, DOCX, TXT or Markdown file of 10 MB or less.");
      return;
    }
    setBusy(true);
    setError("");
    setReady(null);
    setName(file.name);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const document = await studentFetch<UploadedDocument>("documents", {
        method: "POST",
        body: { filename: file.name, kind, data },
      });
      setReady(document);
      onReady(document);
    } catch (e) {
      setError((e as Error).message);
      setName("");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <div
        className={`st-upload${drag ? " st-upload-drag" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!busy && e.dataTransfer.files[0])
            void read(e.dataTransfer.files[0]);
        }}
      >
        <span className="st-upload-icon">
          {name && !busy ? <FileCheck2 size={24} /> : <Upload size={24} />}
        </span>
        <strong>{busy ? "Extracting readable text…" : name || label}</strong>
        <p>Drop a file here, or browse. PDF, DOCX, TXT or MD · up to 10 MB.</p>
        <button
          className="st-button st-button-secondary"
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          {busy ? "Reading…" : "Browse file"}
        </button>
        <input
          ref={input}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            // Cleared so the same file can be chosen again after an error.
            e.target.value = "";
            if (file) void read(file);
          }}
        />
      </div>
      {error && (
        <p className="st-error" role="alert">
          {error}
        </p>
      )}
      {ready && !busy && (
        <div role="status" className="st-upload-result">
          {ready.lowText ? (
            <p className="st-upload-warning">
              <TriangleAlert size={14} aria-hidden="true" />
              <span>
                This PDF looks scanned: very little text could be read
                {ready.pageCount ? ` from ${ready.pageCount} page${ready.pageCount === 1 ? "" : "s"}` : ""}.
                Paste the text instead so the analysis uses your real content.
              </span>
            </p>
          ) : (
            <p className="st-muted">
              Read {ready.pageCount ? `${ready.pageCount} page${ready.pageCount === 1 ? "" : "s"} · ` : ""}
              {(ready.chars ?? ready.content.length).toLocaleString("en-IN")} characters
            </p>
          )}
          {ready.truncated && (
            <p className="st-upload-warning">
              <TriangleAlert size={14} aria-hidden="true" />
              <span>
                This document is long, so only the first {ready.content.length.toLocaleString("en-IN")} characters
                were kept.
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
