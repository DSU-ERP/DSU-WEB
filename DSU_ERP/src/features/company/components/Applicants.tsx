"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText } from "lucide-react";
import { companyFetch } from "../lib/client";
import { APPLICANT_STATUS, type Applicants } from "../lib/types";

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? "" : String(value);
  // Neutralise spreadsheet formulas and quote every cell.
  return `"${(/^[=+\-@]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
};

/** Released applicants: profile, contact, resume and round results the company records. */
export function ApplicantsPanel({ driveId, data, title }: { driveId: string; data: Applicants; title: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [round, setRound] = useState("");
  const [result, setResult] = useState<"pass" | "fail" | "absent">("pass");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const rows = useMemo(
    () =>
      data.rows.filter(
        (row) =>
          (!status || row.status === status) &&
          (!search || `${row.name} ${row.usn} ${row.branch ?? ""}`.toLowerCase().includes(search.toLowerCase())),
      ),
    [data.rows, search, status],
  );
  const awaiting = (roundNo: number) => data.rows.filter((r) => ["registered", "in-progress"].includes(r.status) && r.currentRound === roundNo);
  const chosenRound = Number(round) || null;
  const eligible = chosenRound ? new Set(awaiting(chosenRound).map((r) => r.registrationId)) : new Set<string>();
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const record = async () => {
    const ids = selected.filter((id) => eligible.has(id));
    if (!chosenRound || !ids.length) return setError("Choose a round and select applicants who are waiting for it.");
    const label = result === "pass" ? "passed" : result === "fail" ? "did not pass" : "were absent for";
    if (!window.confirm(`Record that ${ids.length} applicant${ids.length === 1 ? "" : "s"} ${label} ${data.rounds[chosenRound - 1]}? Results cannot be edited afterwards.`)) return;
    setBusy(true);
    setError("");
    try {
      const saved = await companyFetch<{ count: number }>(`drives/${driveId}/results`, {
        method: "POST",
        body: { registration_ids: ids, round: chosenRound, result, ...(remarks.trim() ? { remarks: remarks.trim() } : {}) },
      });
      setMessage(`Saved results for ${saved.count} applicant${saved.count === 1 ? "" : "s"}.${chosenRound === data.rounds.length && result === "pass" ? " Passing the last round marks them selected; the placement office confirms offers." : ""}`);
      setSelected([]);
      setRemarks("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const openResume = async (id: string) => {
    const tab = window.open("about:blank", "_blank");
    try {
      const { url } = await companyFetch<{ url: string }>(`files/${id}/link`);
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else window.location.assign(url);
    } catch (e) {
      tab?.close();
      setError((e as Error).message);
    }
  };
  const exportCsv = () => {
    const header = ["Name", "USN", "Branch", "Batch", "CGPA", "Current backlogs", "Status", "Current round", "College email", "Phone", ...data.rounds];
    const lines = data.rows.map((r) => [
      r.name, r.usn, r.branch, r.batch, r.cgpa, r.backlogs, APPLICANT_STATUS[r.status], data.rounds[r.currentRound - 1] ?? "Finished", r.email, r.phone,
      ...data.rounds.map((_, i) => r.results.find((x) => x.round === i + 1)?.result ?? ""),
    ]);
    const blob = new Blob([[header, ...lines].map((line) => line.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${title.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "drive"}-applicants.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  if (!data.released)
    return (
      <section className="erp-panel">
        <h2>Applicants</h2>
        <p className="erp-muted">
          The placement office has not released applicants for this drive yet. You will get a notification when they do. Only students who
          applied and agreed to share their details will be listed.
        </p>
      </section>
    );
  return (
    <section className="erp-panel cp-applicants" aria-labelledby="co-applicants-title">
      <div className="erp-section-heading">
        <h2 id="co-applicants-title">
          Applicants <span className="erp-muted">({data.rows.length})</span>
        </h2>
        {data.rows.length > 0 && (
          <button type="button" className="erp-secondary" onClick={exportCsv}>
            <Download size={14} aria-hidden="true" />
            &nbsp;Download CSV
          </button>
        )}
      </div>
      {data.rows.length === 0 ? (
        <p className="erp-muted">No consenting applicants yet.</p>
      ) : (
        <>
          <div className="cp-results" role="group" aria-label="Record round results">
            <label>
              Round
              <select value={round} onChange={(e) => { setRound(e.target.value); setSelected([]); }}>
                <option value="">Choose a round</option>
                {data.rounds.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {i + 1}. {name} ({awaiting(i + 1).length} waiting)
                  </option>
                ))}
              </select>
            </label>
            <label>
              Result
              <select value={result} onChange={(e) => setResult(e.target.value as typeof result)}>
                <option value="pass">Passed</option>
                <option value="fail">Did not pass</option>
                <option value="absent">Absent</option>
              </select>
            </label>
            <label className="cp-remarks">
              Remarks (optional)
              <input value={remarks} onChange={(e) => setRemarks(e.target.value)} maxLength={2000} />
            </label>
            <button type="button" className="erp-primary" disabled={busy || !chosenRound || !selected.some((id) => eligible.has(id))} onClick={() => void record()}>
              {busy ? "Saving…" : `Record for ${selected.filter((id) => eligible.has(id)).length} selected`}
            </button>
          </div>
          {chosenRound && (
            <p className="erp-muted">
              Select applicants waiting for {data.rounds[chosenRound - 1]}.{" "}
              <button type="button" className="cp-row-action" style={{ color: "inherit" }} onClick={() => setSelected([...eligible])}>
                Select all {eligible.size} waiting
              </button>
            </p>
          )}
          {error && <p className="erp-form-error" role="alert">{error}</p>}
          {message && <p className="cp-success" role="status">{message}</p>}
          <div className="cp-search">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, USN or branch" aria-label="Search applicants" />
            <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" style={{ maxWidth: "12rem" }}>
              <option value="">All statuses</option>
              {Object.entries(APPLICANT_STATUS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="erp-table-scroll" tabIndex={0} role="region" aria-label="Applicants">
            <table className="erp-table po-table">
              <thead>
                <tr>
                  <th scope="col"><span className="erp-visually-hidden">Select</span></th>
                  <th scope="col">Applicant</th>
                  <th scope="col">Branch</th>
                  <th scope="col">CGPA</th>
                  <th scope="col">Backlogs</th>
                  <th scope="col">Contact</th>
                  <th scope="col">Resume</th>
                  <th scope="col">Rounds</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.registrationId}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(row.registrationId)}
                        disabled={!eligible.has(row.registrationId)}
                        onChange={() => toggle(row.registrationId)}
                        aria-label={`Select ${row.name}`}
                      />
                    </td>
                    <td>
                      {row.name}
                      <br />
                      <small className="erp-muted">{row.usn} · {row.batch}</small>
                    </td>
                    <td>{row.branch || "Not recorded"}</td>
                    <td>{row.cgpa ?? "Not recorded"}</td>
                    <td>{row.backlogs ?? "Not recorded"}</td>
                    <td>
                      <span className="cp-contact">
                        {row.email ? <a href={`mailto:${row.email}`}>{row.email}</a> : <span className="erp-muted">No email</span>}
                        {row.phone ? <a href={`tel:${row.phone}`}>{row.phone}</a> : null}
                      </span>
                    </td>
                    <td>
                      {row.resume ? (
                        <button type="button" className="cp-row-action" style={{ color: "inherit" }} onClick={() => void openResume(row.resume!.id)}>
                          <FileText size={12} aria-hidden="true" /> Resume
                        </button>
                      ) : (
                        <span className="erp-muted">None</span>
                      )}
                    </td>
                    <td>
                      <span className="cp-round-trail">
                        {data.rounds.map((name, i) => {
                          const done = row.results.find((x) => x.round === i + 1);
                          return (
                            <span key={name} className={done ? `is-${done.result}` : ""} title={`${name}: ${done ? done.result : "not recorded"}`}>
                              {i + 1}
                              {done ? (done.result === "pass" ? " passed" : done.result === "fail" ? " not passed" : " absent") : ""}
                            </span>
                          );
                        })}
                      </span>
                    </td>
                    <td>{APPLICANT_STATUS[row.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && <p className="erp-muted">No applicant matches this search.</p>}
        </>
      )}
    </section>
  );
}
