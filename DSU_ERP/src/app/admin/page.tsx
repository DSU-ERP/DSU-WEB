import Link from "next/link";
import { Workflow } from "lucide-react";
import { agentRuns } from "@/features/admin/lib/server";
import { ASSISTANT_LABEL, STATUS_LABEL, ms, when, type Assistant } from "@/features/admin/lib/types";

export const metadata = { title: "Overview · Admin" };

export default async function AdminOverview() {
  const [all, problems] = await Promise.all([
    agentRuns({ limit: "10" }),
    agentRuns({ status: "failed", limit: "5" }),
  ]);
  const denied = await agentRuns({ status: "denied", limit: "5" });
  const recentProblems = [...problems.rows, ...denied.rows].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)).slice(0, 6);
  const c = all.counts;
  return (
    <>
      <div className="co-section-head" style={{ marginTop: 0 }}>
        <h1 style={{ margin: 0 }}>Administration</h1>
        <Link className="erp-primary" href="/admin/agent-workflow">
          <Workflow size={15} aria-hidden="true" />
          &nbsp;Open agent workflow
        </Link>
      </div>
      <p className="erp-muted cp-lede">F.R.I.D.A.Y. activity over the last 7 days, from recorded traces. Older traces are deleted automatically.</p>
      <div className="co-stats">
        <div>
          <span>Runs</span>
          <strong>{c.total}</strong>
        </div>
        <div>
          <span>Failed</span>
          <strong>{c.failed}</strong>
        </div>
        <div>
          <span>Authorization denied</span>
          <strong>{c.denied}</strong>
        </div>
        <div>
          <span>Median duration</span>
          <strong>{ms(c.medianMs)}</strong>
        </div>
      </div>
      <div className="co-dashboard">
        <section className="erp-panel">
          <h2>Runs by assistant</h2>
          <dl className="po-facts">
            {(["student", "officer", "company"] as Assistant[]).map((a) => (
              <div key={a}>
                <dt>
                  <Link href={`/admin/agent-workflow?assistant=${a}`}>{ASSISTANT_LABEL[a]} F.R.I.D.A.Y.</Link>
                </dt>
                <dd>{c.byAssistant[a]}</dd>
              </div>
            ))}
            <div>
              <dt>Running now</dt>
              <dd>{c.running}</dd>
            </div>
          </dl>
          <h2 style={{ marginTop: "1.75rem" }}>Latest runs</h2>
          {all.rows.length ? (
            <ul className="cp-request-list">
              {all.rows.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/agent-workflow?run=${r.id}`}>
                    <div>
                      <strong>{ASSISTANT_LABEL[r.assistant]} F.R.I.D.A.Y.</strong>
                      <span className="erp-muted">
                        {when(r.startedAt)} · {ms(r.durationMs)} · {r.steps} steps{r.tools ? ` · ${r.tools} tools` : ""}
                        {r.company ? ` · ${r.company}` : ""}
                      </span>
                    </div>
                    <div className="cp-request-meta">
                      <span className={`aw-status aw-status-${r.status}`}>{STATUS_LABEL[r.status]}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="erp-muted">No runs yet. Runs appear as soon as anyone asks F.R.I.D.A.Y. a question.</p>
          )}
        </section>
        <section className="erp-panel">
          <h2>Failures and denials</h2>
          {recentProblems.length ? (
            <ul className="cp-request-list">
              {recentProblems.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/agent-workflow?run=${r.id}`}>
                    <div>
                      <strong>{ASSISTANT_LABEL[r.assistant]}</strong>
                      <span className="erp-muted">
                        {when(r.startedAt)} · {(r.errorCategory ?? "no category").replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="cp-request-meta">
                      <span className={`aw-status aw-status-${r.status}`}>{STATUS_LABEL[r.status]}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="erp-muted">None in the last 7 days.</p>
          )}
        </section>
      </div>
    </>
  );
}
