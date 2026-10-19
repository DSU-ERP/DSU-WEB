"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DocumentUpload } from "./DocumentUpload";
import { studentFetch } from "../lib/client";
import { useElapsed } from "../lib/useElapsed";
import { PageTitle, Panel, Empty, ErrorNote, Metric, Progress } from "./UI";
export type CareerContent = {
  summary: string;
  advice: string;
  alignment: number | null;
  atsHealth: number | null;
  bestFit: string;
  signals: string[];
  strengths: string[];
  weaknesses: string[];
  roadmap: { phase: string; actions: string[] }[];
  risks: { title: string; severity: string; mitigation: string }[];
  roles: { title: string; fit: number | null; reason: string }[];
  recommendations: string[];
  missingKeywords: string[];
  formattingIssues: string[];
};
export type CareerData = {
  report: {
    id: string;
    target: string;
    content: CareerContent;
    created_at: string;
  } | null;
  resume: { id: string; filename: string; content: string } | null;
};
export function ResumeIntake({ initial }: { initial: CareerData }) {
  const router = useRouter();
  const [text, setText] = useState(initial.resume?.content || ""),
    [target, setTarget] = useState(initial.report?.target || ""),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const waited = useElapsed(busy);
  const analyze = async () => {
    setError("");
    if (text.trim().length < 80 || target.trim().length < 2 || !consent) {
      setError(
        "Add at least 80 characters of resume text, a target role and permission to analyze your text.",
      );
      return;
    }
    setBusy(true);
    try {
      await studentFetch("career", {
        method: "POST",
        body: { resume: text, target, consent },
      });
      router.push("/student/resume/prediction");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle
        title="Your experience is the starting point."
        description="Upload your resume or paste its text. Turn what you’ve done into a clearer direction."
      />
      <div className="st-two-col">
        <Panel title="Resume intake">
          <div className="st-form">
            <label>
              Target role or company JD focus
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                maxLength={1000}
                placeholder="e.g. Business Analyst or Graduate Engineer"
              />
            </label>
            <DocumentUpload
              kind="resume"
              label="Add your resume"
              onReady={(document) => setText(document.content)}
            />
            <label>
              Extracted resume context
              <textarea
                rows={14}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={60000}
                placeholder="You can paste or edit your resume text here."
              />
            </label>
            <small className="st-muted">
              {text.length.toLocaleString()} characters · minimum 80
            </small>
            <label>
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              Send this text to the configured AI provider to generate my career
              report.
            </label>
            <ErrorNote message={error} />
            <button
              className="st-button"
              disabled={busy}
              onClick={() => void analyze()}
            >
              {busy
                ? `Analyzing your experience…${waited}`
                : "Generate career report ↗"}
            </button>
            {initial.report && (
              <Link className="st-muted" href="/student/resume/prediction">
                Open your latest report ↗
              </Link>
            )}
          </div>
        </Panel>
        <Panel title="More useful than a label.">
          <div className="st-extraction-visual" aria-hidden="true">
            <span>YOUR EXPERIENCE</span>
            <i />
            <span>YOUR EVIDENCE</span>
            <i />
            <span>YOUR NEXT STEP</span>
          </div>
          <p className="st-muted">
            Your report separates role alignment, resume screening health and
            practical next steps. Missing evidence stays missing. It never
            becomes an invented score.
          </p>
          <p className="st-muted" style={{ marginTop: 15 }}>
            Readable text is stored in your private workspace. Scanned or
            protected files may need pasted text.
          </p>
        </Panel>
      </div>
    </>
  );
}
const Items = ({ items }: { items: string[] }) =>
  items.length ? (
    <ul className="st-bullets">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  ) : (
    <p className="st-muted">No findings recorded.</p>
  );
export function CareerReport({ data }: { data: CareerData }) {
  if (!data.report)
    return (
      <>
        <PageTitle
          title="Your next chapter starts with evidence."
          description="A career report built from your experience and ambitions."
        />
        <Panel>
          <Empty
            title="Let’s get to know your experience."
            href="/student/resume/intake"
            label="Open resume intake"
          >
            Upload or paste your resume to generate a report. No example scores
            are used.
          </Empty>
        </Panel>
      </>
    );
  const report = data.report.content;
  return (
    <>
      <PageTitle
        title="A clearer picture of your possibilities."
        description={`Prepared for ${data.report.target} · ${new Date(data.report.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" })}`}
        action={
          <div className="st-actions st-no-print">
            <button
              type="button"
              className="st-button st-button-secondary"
              onClick={() => window.print()}
            >
              Save as PDF
            </button>
            <Link
              className="st-button st-button-secondary"
              href="/student/resume/intake"
            >
              Update resume ↗
            </Link>
          </div>
        }
      />
      <div className="st-metrics">
        <Metric
          label="Role alignment estimate"
          value={
            report.alignment === null ? "Unavailable" : `${report.alignment}%`
          }
        />
        <Metric
          label="Resume screening estimate"
          value={
            report.atsHealth === null ? "Unavailable" : `${report.atsHealth}%`
          }
          note="Formatting and evidence, not an employer ATS result"
        />
        <Metric
          label="Best-fit direction"
          value={<span style={{ fontSize: 19 }}>{report.bestFit}</span>}
        />
        <Metric
          label="Report saved"
          value="In your workspace"
          note="Available when you sign in on another device"
        />
      </div>
      <Panel title="What your experience suggests">
        <p className="st-preserve">{report.summary}</p>
        <p className="st-muted" style={{ marginTop: 15 }}>
          {report.advice}
        </p>
        <p className="st-muted" style={{ marginTop: 15 }}>
          AI guidance is advisory. Fit estimates do not guarantee a placement,
          salary or employer decision.
        </p>
      </Panel>
      <div className="st-two-col">
        <Panel title="Strengths worth building on">
          <Items items={report.strengths} />
        </Panel>
        <Panel title="Where you can grow">
          <Items items={report.weaknesses} />
        </Panel>
      </div>
      <Panel title="Your practical roadmap">
        <div className="st-grid">
          {report.roadmap.map((phase, index) => (
            <article className="st-roadmap" key={phase.phase}>
              <span className="st-tag">PHASE {index + 1}</span>
              <h3>{phase.phase}</h3>
              <Items items={phase.actions} />
            </article>
          ))}
        </div>
      </Panel>
      <div className="st-two-col">
        <Panel title="Risks, with a way forward">
          {report.risks.map((risk) => (
            <div className="st-list-row" key={risk.title}>
              <div>
                <span className="st-tag">{risk.severity} attention</span>
                <h3 style={{ margin: "8px 0" }}>{risk.title}</h3>
                <p className="st-muted">{risk.mitigation}</p>
              </div>
            </div>
          ))}
        </Panel>
        <Panel title="Directions to explore">
          {report.roles.map((role) => (
            <div key={role.title}>
              <Progress label={role.title} value={role.fit} />
              <p className="st-muted">{role.reason}</p>
            </div>
          ))}
        </Panel>
      </div>
      <div className="st-grid">
        <Panel title="Profile evidence">
          <Items items={report.signals} />
        </Panel>
        <Panel title="Missing keywords">
          <Items items={report.missingKeywords} />
        </Panel>
        <Panel title="Formatting notes">
          <Items items={report.formattingIssues} />
        </Panel>
      </div>
      <Panel title="Make it actionable">
        <Items items={report.recommendations} />
        <Link
          href="/student/interview?new=1"
          className="st-button"
          style={{ marginTop: 15 }}
        >
          Practise an interview ↗
        </Link>
      </Panel>
    </>
  );
}
