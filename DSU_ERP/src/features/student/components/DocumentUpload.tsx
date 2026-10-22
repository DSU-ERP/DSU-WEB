"use client";
import { useRef, useState } from "react";
import { Upload, FileCheck2 } from "lucide-react";
import { studentFetch } from "../lib/client";
export type UploadedDocument = {
  id: string;
  filename: string;
  content: string;
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
    [drag, setDrag] = useState(false);
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
            if (e.target.files?.[0]) void read(e.target.files[0]);
          }}
        />
      </div>
      {error && (
        <p className="st-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
