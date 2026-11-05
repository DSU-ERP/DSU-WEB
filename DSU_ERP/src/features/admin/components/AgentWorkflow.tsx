"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { buildGraph, graphExtent, leadsTo } from "../lib/graph";
import {
  ASSISTANT_LABEL,
  STATUS_LABEL,
  clock,
  ms,
  when,
  type Assistant,
  type RunDetail,
  type RunList,
  type RunStep,
  type Workflow,
} from "../lib/types";
import { STATE_TEXT, WorkflowCanvas } from "./WorkflowCanvas";

const POLL_MS = 2000;
const ASSISTANTS: Assistant[] = ["student", "officer", "company"];
const RANGES: [string, string, number | null][] = [
  ["hour", "Last hour", 3600e3],
  ["day", "Last 24 hours", 86400e3],
  ["week", "Last 7 days", null],
];
const META_LABEL: Record<string, string> = {
  tool: "Tool", kind: "Request kind", decision: "Decision", reason: "Reason", count: "Count", rows: "Rows returned", results: "Results",
  chars: "Message length (characters)", history: "Earlier turns", detail: "Context detail", drives: "Drives", applications: "Applications",
  events: "Calendar events", notices: "Unread notices", hasResume: "Resume available", hasDrive: "Drive context", webSearch: "Web search requested",
  provider: "Provider", model: "Model", httpStatus: "HTTP status", code: "Code", iteration: "Round", toolCalls: "Tool calls requested",
  tokensIn: "Input tokens", tokensOut: "Output tokens", released: "Applicants released", candidates: "Candidate names included",
  contact: "Contact details included", enabled: "Enabled", citations: "Citations", card: "Career card",
};

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`/admin/api/${path}`, { cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (response.status === 401) {
    window.location.assign("/login?expired=1");
    throw new Error("Please sign in again.");
  }
  if (!response.ok || !body || !("data" in body)) throw new Error(body?.error || "The trace could not be loaded.");
  return body.data as T;
}

/** The Agent Workflow page: architecture graph, live runs, replay and inspection. */
export function AgentWorkflow({
  workflows,
  initialRuns,
  initialRun,
  initialAssistant,
}: {
  workflows: Record<Assistant, Workflow>;
  initialRuns: RunList;
  initialRun: RunDetail | null;
  initialAssistant: Assistant;
}) {
  const [assistant, setAssistant] = useState<Assistant>(initialAssistant);
  const [mode, setMode] = useState<"architecture" | "run">(initialRun ? "run" : "architecture");
  const [runs, setRuns] = useState(initialRuns);
  const [run, setRun] = useState<RunDetail | null>(initialRun);
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [live, setLive] = useState(true);
  const [follow, setFollow] = useState(false);
  const [status, setStatus] = useState("");
  const [tool, setTool] = useState("");
  const [range, setRange] = useState("week");
  const [cursor, setCursor] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const workflow = workflows[assistant];
  const runId = run?.id;

  const query = useCallback(() => {
    const q = new URLSearchParams({ assistant, limit: "60" });
    if (status) q.set("status", status);
    if (tool) q.set("tool", tool);
    const span = RANGES.find(([key]) => key === range)?.[2];
    if (span) q.set("since", new Date(Date.now() - span).toISOString());
    return q;
  }, [assistant, status, tool, range]);

  const loadRuns = useCallback(async () => {
    try {
      const list = await getJson<RunList>(`agent-runs?${query()}`);
      setRuns(list);
      setError("");
      return list;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }, [query]);
  const openRun = useCallback(async (id: string, keepCursor = false) => {
    try {
      const detail = await getJson<RunDetail>(`agent-runs/${id}`);
      setRun(detail);
      setMode("run");
      if (!keepCursor) {
        setCursor(null);
        setPlaying(false);
      }
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  // Live: refresh the list, follow the newest run when asked, and keep a
  // running run's steps current. Polling pauses while the tab is hidden.
  useEffect(() => {
    if (!live) return;
    let stopped = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      const list = await loadRuns();
      if (stopped || !list) return;
      const newest = list.rows[0];
      if (follow && newest && newest.id !== runId) await openRun(newest.id);
      else if (runId) {
        const fresh = list.rows.find((r) => r.id === runId);
        if (fresh && (fresh.status === "running" || (run && fresh.updatedAt !== run.updatedAt))) await openRun(runId, true);
      }
    };
    const timer = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [live, follow, loadRuns, openRun, runId, run]);
  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  // Replay: step through the recorded order at a readable pace.
  const total = run?.steps.length ?? 0;
  useEffect(() => {
    if (!playing || cursor === null) return;
    if (cursor >= total) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setCursor((c) => (c === null ? null : c + 1)), 650);
    return () => window.clearTimeout(timer);
  }, [playing, cursor, total]);

  const toggle = useCallback((id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const activeRun = mode === "run" && run && run.assistant === assistant ? run : null;
  // In a run, groups with executed children open automatically.
  const autoExpanded = useMemo(() => {
    const set = new Set(expanded);
    if (activeRun)
      for (const node of workflow.nodes)
        if (node.parent && activeRun.steps.some((s) => s.node === node.id)) set.add(node.parent);
    return set;
  }, [expanded, activeRun, workflow]);
  const graph = useMemo(() => buildGraph(workflow, { run: activeRun, upto: cursor, expanded: autoExpanded }), [workflow, activeRun, cursor, autoExpanded]);
  // The largest architecture graph sets the opening zoom for all three.
  const fitExtent = useMemo(() => {
    const sizes = ASSISTANTS.map((a) => graphExtent(buildGraph(workflows[a]).nodes));
    return { width: Math.max(...sizes.map((e) => e.width)), height: Math.max(...sizes.map((e) => e.height)) };
  }, [workflows]);
  const selectedNode = workflow.nodes.find((n) => n.id === selected) ?? null;
  const selectedSteps = activeRun ? graph.steps.filter((s) => s.node === selected) : [];
  const start = activeRun ? Date.parse(activeRun.startedAt) : 0;
  const span = activeRun ? Math.max(activeRun.durationMs ?? 0, ...activeRun.steps.map((s) => (s.endedAt ? Date.parse(s.endedAt) : Date.parse(s.startedAt)) - start), 1) : 1;
  const toolSteps = graph.steps.filter((s) => s.kind === "tool" && s.node !== "tools");
  const problems = graph.steps.filter((s) => s.status === "failed" || s.status === "denied");
  const tokens = graph.steps.reduce(
    (sum, s) => ({ in: sum.in + (typeof s.meta.tokensIn === "number" ? s.meta.tokensIn : 0), out: sum.out + (typeof s.meta.tokensOut === "number" ? s.meta.tokensOut : 0),
      seen: sum.seen || typeof s.meta.tokensIn === "number" }),
    { in: 0, out: 0, seen: false },
  );
  const nextOf = (step: RunStep) => {
    const index = graph.steps.findIndex((s) => s.seq === step.seq);
    return graph.steps.slice(index + 1).find((s) => s.status !== "skipped")?.label ?? "None";
  };

  return (
    <div className="aw">
      <header className="aw-top">
        <div className="aw-title">
          <h1>Agent workflow</h1>
          <p className="erp-muted">
            How F.R.I.D.A.Y. handles a request, from recorded runs. Traces hold step names, timings, tool names and redacted metadata only, and
            are kept for 7 days.
          </p>
        </div>
        <div className="aw-controls">
          <div className="aw-segment" role="tablist" aria-label="Assistant">
            {ASSISTANTS.map((a) => (
              <button
                key={a}
                type="button"
                role="tab"
                aria-selected={assistant === a}
                onClick={() => {
                  setAssistant(a);
                  setSelected(null);
                  setExpanded(new Set());
                  setCursor(null);
                  setPlaying(false);
                }}
              >
                {ASSISTANT_LABEL[a]}
              </button>
            ))}
          </div>
          <div className="aw-segment" role="tablist" aria-label="View">
            <button type="button" role="tab" aria-selected={mode === "architecture"} onClick={() => setMode("architecture")}>
              Architecture
            </button>
            <button type="button" role="tab" aria-selected={mode === "run"} onClick={() => setMode("run")}>
              Execution
            </button>
          </div>
        </div>
      </header>

      {mode === "run" && (
        <section className="aw-runbar" aria-label="Run selection">
          <label>
            Run
            <select
              value={activeRun?.id ?? ""}
              onChange={(e) => (e.target.value ? void openRun(e.target.value) : setRun(null))}
              aria-label="Choose a recorded run"
            >
              <option value="">{runs.rows.length ? "Choose a run" : "No runs match"}</option>
              {runs.rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {when(r.startedAt)} · {STATUS_LABEL[r.status]} · {ms(r.durationMs)} · {r.steps} steps{r.tools ? ` · ${r.tools} tools` : ""}
                  {r.company ? ` · ${r.company}` : ""}
                  {r.role === "none" || r.role !== r.assistant ? " · other account" : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Any</option>
              {(["running", "completed", "failed", "denied"] as const).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tool
            <select value={tool} onChange={(e) => setTool(e.target.value)} disabled={!runs.tools.length}>
              <option value="">Any</option>
              {runs.tools.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            When
            <select value={range} onChange={(e) => setRange(e.target.value)}>
              {RANGES.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="aw-check">
            <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
            Live updates
          </label>
          <label className="aw-check">
            <input type="checkbox" checked={follow} disabled={!live} onChange={(e) => setFollow(e.target.checked)} />
            Follow newest run
          </label>
        </section>
      )}

      {mode === "run" && activeRun && (
        <section className="aw-summary" aria-label="Run summary">
          <div>
            <span>Status</span>
            <strong className={`aw-status aw-status-${activeRun.status}`}>{STATUS_LABEL[activeRun.status]}</strong>
          </div>
          <div>
            <span>Total duration</span>
            <strong>{activeRun.status === "running" ? "In progress" : ms(activeRun.durationMs)}</strong>
          </div>
          <div>
            <span>Started</span>
            <strong>{clock(activeRun.startedAt)}</strong>
          </div>
          <div>
            <span>Steps · tools · errors</span>
            <strong>
              {activeRun.steps.length} · {toolSteps.length} · {activeRun.errors}
            </strong>
          </div>
          <div>
            <span>Account</span>
            <strong>{activeRun.role === "none" ? "No matching role" : ASSISTANT_LABEL[activeRun.role]}{activeRun.company ? `, ${activeRun.company}` : ""}</strong>
          </div>
          <div className="aw-replay">
            <span>Replay</span>
            <div>
              <button type="button" className="erp-secondary" aria-label={playing ? "Pause replay" : "Play replay"}
                onClick={() => {
                  if (playing) return setPlaying(false);
                  setCursor((c) => (c === null || c >= total ? 1 : c));
                  setPlaying(true);
                }}>
                {playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
              </button>
              <button type="button" className="erp-secondary" aria-label="Next step" disabled={cursor === null || cursor >= total}
                onClick={() => { setPlaying(false); setCursor((c) => Math.min(total, (c ?? 0) + 1)); }}>
                <SkipForward size={14} aria-hidden="true" />
              </button>
              <button type="button" className="erp-secondary" aria-label="Reset to the full run" disabled={cursor === null}
                onClick={() => { setPlaying(false); setCursor(null); }}>
                <RotateCcw size={14} aria-hidden="true" />
              </button>
              <small aria-live="polite">{cursor === null ? "Full run" : `Step ${Math.min(cursor, total)} of ${total}`}</small>
            </div>
          </div>
        </section>
      )}
      {error && <p className="erp-form-error" role="alert">{error}</p>}

      <div className="aw-main">
        <WorkflowCanvas
          nodes={graph.nodes}
          edges={graph.edges}
          mode={activeRun ? "run" : "architecture"}
          selected={selected}
          onSelect={setSelected}
          onToggle={toggle}
          layoutKey={`${assistant}:${mode}:${[...autoExpanded].sort().join(",")}`}
          fitExtent={fitExtent}
        />
        <aside className="aw-panel" aria-label="Selected node">
          {!selectedNode ? (
            <div className="aw-panel-empty">
              <h2>{workflow.title}</h2>
              <p>{workflow.orchestration}</p>
              <dl className="aw-facts">
                <div><dt>Runs in</dt><dd>{workflow.runtime}</dd></div>
                <div><dt>Workflow version</dt><dd>{workflow.version}</dd></div>
                <div><dt>Framework</dt><dd>{workflow.id === "officer" ? "LangGraph state graph with LangChain ChatOpenAI." : "Custom orchestration. LangChain and LangGraph are not used."}</dd></div>
              </dl>
              <p className="erp-muted">Select a node to see what it does{mode === "run" ? " and what it recorded in this run" : ""}.</p>
            </div>
          ) : (
            <div>
              <p className="aw-panel-kind">{selectedNode.kind}</p>
              <h2>{selectedNode.label}</h2>
              <p>{selectedNode.purpose}</p>
              <dl className="aw-facts">
                <div><dt>Inputs</dt><dd>{selectedNode.inputs || "Not available"}</dd></div>
                <div><dt>Outputs</dt><dd>{selectedNode.outputs || "Not available"}</dd></div>
                <div><dt>Code</dt><dd>{selectedNode.functions.length ? selectedNode.functions.join(", ") : "Not available"}</dd></div>
                <div>
                  <dt>Leads to</dt>
                  <dd>
                    {leadsTo(workflow, selectedNode.id).map((e) => `${e.label}${e.condition ? ` (${e.condition})` : ""}`).join("; ") || "End of the run"}
                  </dd>
                </div>
              </dl>
              {activeRun && (
                <>
                  <h3>In this run</h3>
                  {selectedSteps.length ? (
                    selectedSteps.map((s) => (
                      <dl className="aw-facts aw-step" key={s.seq}>
                        <div><dt>Status</dt><dd className={`aw-status aw-status-${s.status}`}>{STATUS_LABEL[s.status]}</dd></div>
                        <div><dt>Start</dt><dd>{clock(s.startedAt)}</dd></div>
                        <div><dt>End</dt><dd>{clock(s.endedAt)}</dd></div>
                        <div><dt>Duration</dt><dd>{ms(s.durationMs)}</dd></div>
                        {s.attempt > 1 && <div><dt>Attempt</dt><dd>{s.attempt}</dd></div>}
                        {s.errorCategory && <div><dt>Error category</dt><dd>{s.errorCategory.replace(/_/g, " ")}</dd></div>}
                        {Object.entries(s.meta).map(([key, value]) => (
                          <div key={key}><dt>{META_LABEL[key] ?? key}</dt><dd>{String(value)}</dd></div>
                        ))}
                        <div><dt>Next executed</dt><dd>{nextOf(s)}</dd></div>
                      </dl>
                    ))
                  ) : (
                    <p className="erp-muted">{STATE_TEXT[graph.states.get(selectedNode.id)?.state ?? "not_run"]}. This node did not record a step in this run.</p>
                  )}
                </>
              )}
            </div>
          )}
        </aside>
      </div>

      {activeRun ? (
        <div className="aw-bottom">
          <section aria-labelledby="aw-timeline-title" className="aw-timeline">
            <h2 id="aw-timeline-title">Timeline</h2>
            <ol>
              {graph.steps.map((s) => {
                const offset = Date.parse(s.startedAt) - start;
                const width = s.durationMs === null ? 0 : (s.durationMs / span) * 100;
                return (
                  <li key={s.seq} className={`aw-status-${s.status}${s.parentSeq ? " is-nested" : ""}`}>
                    <button type="button" onClick={() => setSelected(workflow.nodes.some((n) => n.id === s.node) ? s.node : null)}>
                      <span className="aw-tl-time">+{ms(Math.max(0, offset))}</span>
                      <span className="aw-tl-label" title={s.label}>{s.label}</span>
                      <span className="aw-tl-status" title={STATUS_LABEL[s.status]}>{STATUS_LABEL[s.status]}</span>
                      <span className="aw-tl-bar" aria-hidden="true">
                        <i style={{ marginLeft: `${(Math.max(0, offset) / span) * 100}%`, width: `${Math.max(width, s.status === "skipped" ? 0 : 0.6)}%` }} />
                      </span>
                      <span className="aw-tl-duration">{ms(s.durationMs)}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
          <div className="aw-side">
            <section aria-labelledby="aw-tools-title">
              <h2 id="aw-tools-title">Tool calls</h2>
              {toolSteps.length ? (
                <ul className="aw-list">
                  {toolSteps.map((s) => (
                    <li key={s.seq}>
                      <code>{String(s.meta.tool ?? s.label)}</code>
                      <span className={`aw-status aw-status-${s.status}`}>{STATUS_LABEL[s.status]}</span>
                      <span>{ms(s.durationMs)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="erp-muted">{activeRun.assistant === "officer" ? "No tools were called in this run." : "This assistant has no model-chosen tools. Database reads appear in the timeline."}</p>
              )}
            </section>
            <section aria-labelledby="aw-errors-title">
              <h2 id="aw-errors-title">Errors and denials</h2>
              {problems.length ? (
                <ul className="aw-list">
                  {problems.map((s) => (
                    <li key={s.seq}>
                      <strong>{s.label}</strong>
                      <span className={`aw-status aw-status-${s.status}`}>{STATUS_LABEL[s.status]}</span>
                      <span>{(s.errorCategory ?? "not available").replace(/_/g, " ")}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="erp-muted">None recorded.</p>
              )}
            </section>
            <section aria-labelledby="aw-final-title">
              <h2 id="aw-final-title">Result</h2>
              <dl className="aw-facts">
                <div><dt>Outcome</dt><dd>{activeRun.status === "running" ? "Still running" : graph.steps.some((s) => s.node === "output" && s.status === "completed") ? "Answer returned" : "No answer returned"}</dd></div>
                <div><dt>Error category</dt><dd>{activeRun.errorCategory?.replace(/_/g, " ") ?? "None"}</dd></div>
                <div><dt>Model tokens</dt><dd>{tokens.seen ? `${tokens.in} in, ${tokens.out} out` : "Not available"}</dd></div>
                <div><dt>Answer text</dt><dd>Not stored, by design</dd></div>
              </dl>
            </section>
          </div>
        </div>
      ) : mode === "run" ? (
        <section className="aw-empty">
          <h2>{runs.rows.length ? "Choose a run to inspect" : "No runs recorded yet"}</h2>
          <p className="erp-muted">
            {runs.rows.length
              ? "Pick a run above, or turn on Follow newest run and ask F.R.I.D.A.Y. a question in another tab."
              : `Ask ${ASSISTANT_LABEL[assistant]} F.R.I.D.A.Y. a question; its run appears here within a few seconds while Live updates is on.`}
          </p>
        </section>
      ) : null}
    </div>
  );
}
