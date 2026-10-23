"use client";
import { useState } from "react";
import { Eye, EyeOff, RefreshCw, Sparkles } from "lucide-react";
import { dateText, provenanceLabel, type Cited, type SkillSummary, type SummaryContent } from "../lib/skills";
import { errorCode, errorText, skillsApi } from "../lib/skills-client";
import { Badge } from "./PlatformCards";

const SECTIONS: { key: keyof SummaryContent; title: string }[] = [
  { key: "skills", title: "Skills shown by the evidence" },
  { key: "projects", title: "Projects" },
  { key: "academicStrengths", title: "Academic strengths" },
  { key: "achievements", title: "Achievements" },
  { key: "developmentAreas", title: "Areas to develop" },
  { key: "potentialRoles", title: "Roles you could explore" },
];

function Sources({ ids }: { ids: string[] }) {
  if (!ids?.length) return null;
  return <small className="st-si-sources">Evidence {ids.join(", ")}</small>;
}

/**
 * The student's AI skill summary: grounded claims with their evidence ids,
 * clear AI labelling, and the student's controls (generate, review, hide).
 */
export function AiSummary({ initial, shared }: { initial: SkillSummary | null; shared: boolean }) {
  const [summary, setSummary] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const run = async (key: string, body: Parameters<typeof skillsApi.summary>[0]) => {
    setBusy(key);
    setError("");
    setNote("");
    try {
      const next = await skillsApi.summary(body);
      setSummary(next);
      if (key === "generate" && next.cached) setNote("Your profile has not changed since the last summary, so that summary was kept.");
    } catch (e) {
      setError(
        errorCode(e) === "SUMMARY_LIMIT"
          ? "You can generate a new summary up to 3 times an hour. Please try again later."
          : errorText(e),
      );
    } finally {
      setBusy(null);
    }
  };
  const content = summary?.content || {};
  const evidence = summary?.evidence || [];
  return (
    <div className="st-si-summary">
      <div className="st-si-summary-meta">
        <Badge tone="neutral">
          <Sparkles size={11} aria-hidden="true" /> AI generated
        </Badge>
        {summary && <small>Generated {dateText(summary.createdAt, true)}</small>}
        {summary && <small>{summary.reviewedAt ? `Reviewed by you ${dateText(summary.reviewedAt)}` : "Not reviewed yet"}</small>}
        {summary?.hidden && <Badge tone="warn">Hidden from placement officers</Badge>}
        {summary && !summary.hidden && !shared && <Badge tone="warn">Not shared: your visibility settings hide it</Badge>}
      </div>
      {!summary ? (
        <p className="st-si-hidden">
          No summary yet. Generate one to get a short, evidence-backed description of your skills, written by AI from your official record and the
          platform data you shared. Every statement cites the evidence it is based on.
        </p>
      ) : (
        <>
          {content.summary?.text && (
            <p className="st-si-summary-text">
              {content.summary.text} <Sources ids={content.summary.evidence} />
            </p>
          )}
          <div className="st-si-summary-grid">
            {SECTIONS.map(({ key, title }) => {
              const items = (content[key] as (Cited & Record<string, string>)[] | undefined) || [];
              if (!Array.isArray(items) || !items.length) return null;
              return (
                <div key={key}>
                  <h4>{title}</h4>
                  <ul>
                    {items.map((item, i) => (
                      <li key={i}>
                        {key === "potentialRoles" ? (
                          <>
                            <strong>{item.role}</strong>: {item.rationale}
                          </>
                        ) : (
                          item.name || item.text
                        )}{" "}
                        <Sources ids={item.evidence} />
                      </li>
                    ))}
                  </ul>
                  {key === "potentialRoles" && content.rolesNote && <small className="st-si-fine">{content.rolesNote}</small>}
                </div>
              );
            })}
          </div>
          {evidence.length > 0 && (
            <details className="st-si-evidence">
              <summary>Evidence used ({evidence.length})</summary>
              <ol>
                {evidence.map((item) => (
                  <li key={item.id}>
                    <span className="st-si-evidence-id">{item.id}</span>
                    <span>
                      {item.label}: {item.value}
                      <small className="st-si-provenance">{provenanceLabel(item.provenance)}</small>
                    </span>
                  </li>
                ))}
              </ol>
            </details>
          )}
          <p className="st-si-fine">AI can be wrong. Review the summary and its evidence before relying on it. It is never a placement decision.</p>
        </>
      )}
      {error && (
        <p className="st-error" role="alert">
          {error}
        </p>
      )}
      {note && (
        <p className="st-si-note" role="status">
          {note}
        </p>
      )}
      <div className="st-actions">
        <button className="st-button" disabled={busy !== null} onClick={() => void run("generate", { action: "generate" })}>
          <RefreshCw size={14} aria-hidden="true" />
          {busy === "generate" ? "Generating" : summary ? "Regenerate" : "Generate summary"}
        </button>
        {summary && !summary.reviewedAt && (
          <button className="st-button st-button-secondary" disabled={busy !== null} onClick={() => void run("review", { action: "review", id: summary.id })}>
            Mark as reviewed
          </button>
        )}
        {summary && (
          <button
            className="st-button st-button-secondary"
            disabled={busy !== null}
            onClick={() => void run("hide", { action: "hide", id: summary.id, hidden: !summary.hidden })}
          >
            {summary.hidden ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
            {summary.hidden ? "Show to placement officers" : "Hide from placement officers"}
          </button>
        )}
      </div>
    </div>
  );
}
