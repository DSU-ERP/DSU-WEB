"use client";
import { useState } from "react";
import { FileText } from "lucide-react";
import { fileLink } from "@/shared/files/actions";

/** Opens a private PDF through a link that expires after a few minutes. */
export function FileButton({ id, label, className = "erp-secondary" }: { id: string; label: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const open = async () => {
    setBusy(true);
    setError("");
    // Open the tab inside the click so popup blockers allow it, then point it at the link.
    const tab = window.open("about:blank", "_blank");
    const result = await fileLink(id);
    setBusy(false);
    if (!result.ok) {
      tab?.close();
      return setError(result.error);
    }
    if (tab) {
      tab.opener = null;
      tab.location.href = result.url;
    } else window.location.assign(result.url);
  };
  return (
    <span className="cp-file">
      <button type="button" className={className} onClick={() => void open()} disabled={busy}>
        <FileText size={14} aria-hidden="true" /> {busy ? "Opening…" : label}
      </button>
      {error && <small className="erp-form-error" role="alert">{error}</small>}
    </span>
  );
}
