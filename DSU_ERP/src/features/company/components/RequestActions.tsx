"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { companyFetch } from "../lib/client";

/** Withdraw a submitted request, delete a draft, or start a change to a live drive. */
export function RequestActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const act = async (action: "withdraw" | "delete", question: string) => {
    if (!window.confirm(question)) return;
    setBusy(true);
    setError("");
    try {
      await companyFetch(`requests/${id}/${action}`, { method: "POST", body: {} });
      if (action === "delete") router.push("/company/drives");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="cp-decisions">
      {status === "submitted" && (
        <button type="button" className="erp-secondary" disabled={busy} onClick={() => void act("withdraw", "Withdraw this request from review to edit it? You will need to submit it again.")}>
          Withdraw to edit
        </button>
      )}
      {(status === "draft" || status === "returned") && (
        <button type="button" className="erp-secondary cp-danger" disabled={busy} onClick={() => void act("delete", "Delete this request? This cannot be undone.")}>
          Delete request
        </button>
      )}
      {error && <span className="erp-form-error" role="alert">{error}</span>}
    </div>
  );
}

export function RequestChangeButton({ driveId, openChange }: { driveId: string; openChange: { id: string } | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (openChange)
    return (
      <button type="button" className="erp-secondary" onClick={() => router.push(`/company/requests/${openChange.id}`)}>
        Open your change request
      </button>
    );
  const start = async () => {
    setBusy(true);
    setError("");
    try {
      const request = await companyFetch<{ id: string }>("requests", { method: "POST", body: { drive_id: driveId } });
      router.push(`/company/requests/${request.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <span className="cp-file">
      <button type="button" className="erp-secondary" disabled={busy} onClick={() => void start()}>
        {busy ? "Starting…" : "Request a change"}
      </button>
      {error && <small className="erp-form-error" role="alert">{error}</small>}
    </span>
  );
}
