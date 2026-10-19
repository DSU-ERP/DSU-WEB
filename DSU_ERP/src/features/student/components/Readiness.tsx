"use client";
import { useState } from "react";
import Link from "next/link";
import { studentFetch } from "../lib/client";
import { useElapsed } from "../lib/useElapsed";
import { PageTitle, Panel, Metric, Empty, Progress, ErrorNote } from "./UI";
import type { DashboardData } from "./Dashboard";
export function Readiness({ data }: { data: DashboardData }) {
  const [plan, setPlan] = useState<{
      title: string;
      actions: {
        priority: number;
        title: string;
        reason: string;
        practice: string;
      }[];
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const waited = useElapsed(busy);
  const generate = async () => {
    setBusy(true);
    setError("");
    try {
      setPlan(
        await studentFetch("readiness/plan", { method: "POST", body: {} }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle
        title="Know where you stand."
        description="Every preparation signal, scored and explained."
        action={
          <button
            className="st-button"
            disabled={busy}
            onClick={() => void generate()}
          >
            {busy ? `Building your plan…${waited}` : "Generate a practice plan ↗"}
          </button>
        }
      />
      <ErrorNote message={error} />
      <div className="st-metrics">
        <Metric
          label="AI interview readiness"
          value={data.score === null ? "Not measured" : `${data.score}%`}
          note={data.band}
        />
        <Metric label="Completed interviews" value={data.sessions} />
        <Metric label="Recent applications" value={data.applications.length} />
        <Metric
          label="Official attendance"
          value={
            data.official.attendance === null
              ? "Unavailable"
              : `${data.official.attendance}%`
          }
        />
      </div>
      <div className="st-two-col">
        <Panel title="Your skill map" subtitle={data.basis}>
          {data.sessions ? (
            <>
              {Object.entries(data.skills).map(([key, value]) => (
                <Progress
                  key={key}
                  label={
                    {
                      overall: "Overall AI readiness",
                      communication: "Communication",
                      accuracy: "Technical & business",
                      confidence: "Confidence & delivery",
                    }[key] || key
                  }
                  value={value}
                />
              ))}
            </>
          ) : (
            <Empty
              title="Let’s establish your baseline."
              href="/student/interview"
              label="Take your first interview"
            >
              A completed interview creates rubric scores. Missing preparation
              evidence is not a score of zero.
            </Empty>
          )}
        </Panel>
        <Panel title="Your next best actions">
          {plan ? (
            <>
              <h3>{plan.title}</h3>
              {plan.actions.map((action) => (
                <div className="st-list-row" key={action.priority}>
                  <div>
                    <span className="st-tag">Priority {action.priority}</span>
                    <h3 style={{ margin: "8px 0" }}>{action.title}</h3>
                    <p className="st-muted">{action.reason}</p>
                    <p style={{ marginTop: 7 }}>{action.practice}</p>
                  </div>
                </div>
              ))}
            </>
          ) : data.latestSession?.report.nextPlan?.length ? (
            data.latestSession.report.nextPlan.map((action, index) => (
              <div className="st-list-row" key={index}>
                <div>
                  <span className="st-tag">Priority {index + 1}</span>
                  <p style={{ marginTop: 8 }}>{action}</p>
                </div>
              </div>
            ))
          ) : (
            <Empty
              title="A practical next step awaits."
              href={data.next.href}
              label={data.next.label}
            >
              {data.next.reason}
            </Empty>
          )}
        </Panel>
      </div>
      <Link className="st-muted" href="/student/dashboard">
        ← Back to dashboard
      </Link>
    </>
  );
}
