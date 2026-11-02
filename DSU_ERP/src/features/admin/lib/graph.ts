// Pure graph logic for the Agent Workflow page: layout, node status from
// recorded steps, and the edges a run really took. No rendering here, so it
// is unit-tested directly (tests/agent-graph.test.ts).
import type { RunDetail, RunStep, StepStatus, Workflow, WorkflowEdge, WorkflowNode } from "./types";

export type NodeState = StepStatus | "pending" | "not_run";
export type GraphNode = WorkflowNode & {
  x: number;
  y: number;
  state: NodeState;
  count: number;
  durationMs: number | null;
  childCount: number;
  expanded: boolean;
  terminal: boolean;
};
export type GraphEdge = WorkflowEdge & { id: string; taken: boolean; child?: boolean };

const TERMINALS: Record<string, WorkflowNode> = {
  failed: { id: "failed", kind: "terminal", label: "Run failed", purpose: "The run ended with an error. The failing step shows the category.", inputs: "error", outputs: "error response", functions: [] },
  denied: { id: "denied", kind: "terminal", label: "Access denied", purpose: "The real authorization check refused the request. No data was loaded after this point.", inputs: "account", outputs: "403", functions: [] },
};
const PRIORITY: NodeState[] = ["denied", "failed", "running", "completed", "skipped", "pending", "not_run"];
const COLUMN = 300;
const ROW = 114;
const CHILD_ROW = 74;

/** Steps visible at a point in a replay (all steps when `upto` is null). */
export function visibleSteps(run: RunDetail | null, upto: number | null = null): RunStep[] {
  if (!run) return [];
  const ordered = [...run.steps].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt) || a.seq - b.seq);
  if (upto === null) return ordered;
  return ordered.slice(0, upto).map((step, index, list) =>
    // The newest step of a replay is shown as running until the next one starts.
    index === list.length - 1 && upto < ordered.length && step.status !== "skipped" ? { ...step, status: "running" } : step,
  );
}

/** Aggregated state of each workflow node from its recorded steps. */
export function nodeStates(workflow: Workflow, steps: RunStep[], runFinished: boolean) {
  const states = new Map<string, { state: NodeState; count: number; durationMs: number | null }>();
  for (const node of workflow.nodes) states.set(node.id, { state: runFinished ? "not_run" : "pending", count: 0, durationMs: null });
  for (const step of steps) {
    const current = states.get(step.node);
    if (!current) continue;
    const better = current.count === 0 || PRIORITY.indexOf(step.status) < PRIORITY.indexOf(current.state) ? step.status : current.state;
    states.set(step.node, {
      state: better,
      count: current.count + (step.status === "skipped" ? 0 : 1),
      durationMs: step.durationMs === null ? current.durationMs : (current.durationMs ?? 0) + step.durationMs,
    });
  }
  // A parent with executed children reflects them when it has no step itself.
  for (const node of workflow.nodes) {
    if (!node.children?.length) continue;
    const own = states.get(node.id)!;
    if (own.count) continue;
    const kids = node.children.map((id) => states.get(id)!).filter((s) => s && s.count);
    if (!kids.length) continue;
    const state = kids.map((k) => k.state).sort((a, b) => PRIORITY.indexOf(a) - PRIORITY.indexOf(b))[0];
    states.set(node.id, { state, count: kids.reduce((n, k) => n + k.count, 0), durationMs: null });
  }
  return states;
}

/** The ordered path of executed top-level nodes (children map to their parent). */
export function executedPath(workflow: Workflow, steps: RunStep[]) {
  const parentOf = new Map(workflow.nodes.filter((n) => n.parent).map((n) => [n.id, n.parent!]));
  const path: string[] = [];
  for (const step of steps) {
    if (step.status === "skipped" || step.kind === "input" && path.length) continue;
    const id = parentOf.get(step.node) ?? step.node;
    if (path[path.length - 1] !== id) path.push(id);
  }
  return path;
}

/**
 * Edges between consecutive executed nodes. When the manifest has no direct
 * edge (a branch passed through steps that were skipped), the shortest route
 * through nodes that did not execute is used; nothing else is inferred.
 */
export function takenEdges(workflow: Workflow, path: string[]) {
  const taken = new Set<string>();
  const executed = new Set(path);
  const forward = workflow.edges.filter((e) => e.kind !== "error" && e.kind !== "denied");
  for (let i = 1; i < path.length; i++) {
    const [from, to] = [path[i - 1], path[i]];
    if (forward.some((e) => e.from === from && e.to === to)) {
      taken.add(`${from}->${to}`);
      continue;
    }
    const previous = new Map<string, string>([[from, ""]]);
    const queue = [from];
    while (queue.length && !previous.has(to)) {
      const at = queue.shift()!;
      for (const e of forward.filter((x) => x.from === at)) {
        if (previous.has(e.to) || (e.to !== to && executed.has(e.to))) continue;
        previous.set(e.to, at);
        queue.push(e.to);
      }
    }
    if (!previous.has(to)) continue;
    for (let at = to; at !== from; at = previous.get(at)!) taken.add(`${previous.get(at)}->${at}`);
  }
  return taken;
}

function ranks(workflow: Workflow) {
  const top = workflow.nodes.filter((n) => !n.parent).map((n) => n.id);
  const forward = workflow.edges.filter((e) => e.kind !== "loop" && e.kind !== "error" && e.kind !== "denied" && top.includes(e.to));
  const rank = new Map<string, number>(top.map((id) => [id, 0]));
  // Longest path from the entry; the graph minus loop and error edges is acyclic.
  // Nodes reached only through an error edge (a guard) sit below their source.
  const guards = workflow.edges.filter((e) => (e.kind === "error" || e.kind === "denied") && top.includes(e.to)
    && !forward.some((f) => f.to === e.to));
  for (let pass = 0; pass < top.length; pass++)
    for (const edge of [...forward, ...guards]) {
      const next = (rank.get(edge.from) ?? 0) + 1;
      if (next > (rank.get(edge.to) ?? 0)) rank.set(edge.to, next);
    }
  return rank;
}

/** Builds positioned nodes and edges for the canvas. */
export function buildGraph(workflow: Workflow, options: { run?: RunDetail | null; upto?: number | null; expanded?: Set<string> } = {}) {
  const run = options.run ?? null;
  const steps = visibleSteps(run, options.upto ?? null);
  const finished = !!run && run.status !== "running" && (options.upto === null || options.upto === undefined || options.upto >= run.steps.length);
  const states = nodeStates(workflow, steps, finished);
  const rank = ranks(workflow);
  const executedKids = new Set(steps.map((s) => s.node));
  const expanded = options.expanded ?? new Set<string>();
  const byRank = new Map<number, string[]>();
  for (const node of workflow.nodes.filter((n) => !n.parent)) {
    const r = rank.get(node.id) ?? 0;
    byRank.set(r, [...(byRank.get(r) ?? []), node.id]);
  }
  const position = new Map<string, { x: number; y: number }>();
  for (const [r, ids] of byRank)
    ids.forEach((id, i) => position.set(id, { x: i * COLUMN - ((ids.length - 1) * COLUMN) / 2, y: r * ROW }));
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  for (const node of workflow.nodes) {
    if (node.parent) continue;
    const p = position.get(node.id)!;
    const s = states.get(node.id)!;
    const kids = (node.children ?? []).map((id) => workflow.nodes.find((n) => n.id === id)!).filter(Boolean);
    const open = expanded.has(node.id);
    nodes.push({ ...node, ...p, ...s, childCount: kids.length, expanded: open, terminal: false });
    if (!open) continue;
    // Executed children first; in a run only the executed ones unless none ran.
    const shown = run ? kids.filter((k) => executedKids.has(k.id)) : kids;
    const list = (shown.length ? shown : kids).sort((a, b) => Number(executedKids.has(b.id)) - Number(executedKids.has(a.id)));
    const columns = list.length > 8 ? 2 : 1;
    list.forEach((kid, i) => {
      const ks = states.get(kid.id)!;
      nodes.push({
        ...kid, x: p.x + COLUMN + (i % columns) * (COLUMN - 40), y: p.y + Math.floor(i / columns) * CHILD_ROW,
        ...ks, childCount: 0, expanded: false, terminal: false,
      });
      edges.push({ id: `${node.id}->${kid.id}`, from: node.id, to: kid.id, taken: ks.count > 0, child: true });
    });
  }
  // Terminal nodes sit to the left of the step that can end there.
  const terminalTargets = new Set(workflow.edges.filter((e) => TERMINALS[e.to]).map((e) => e.to));
  for (const id of terminalTargets) {
    const sources = workflow.edges.filter((e) => e.to === id).map((e) => position.get(e.from)).filter(Boolean) as { x: number; y: number }[];
    const y = sources.length ? sources.reduce((n, p) => n + p.y, 0) / sources.length : 0;
    const x = Math.min(...[...position.values()].map((p) => p.x)) - COLUMN;
    const reached = !!run && finished && run.status === id;
    nodes.push({ ...TERMINALS[id], x, y: id === "denied" ? y - ROW / 2 : y + ROW / 2, state: reached ? (id === "denied" ? "denied" : "failed") : finished ? "not_run" : "pending",
      count: reached ? 1 : 0, durationMs: null, childCount: 0, expanded: false, terminal: true });
  }
  const path = executedPath(workflow, steps);
  const transitions = takenEdges(workflow, path);
  const last = path[path.length - 1];
  for (const edge of workflow.edges) {
    const id = `${edge.from}->${edge.to}`;
    const taken = transitions.has(id) || (!!run && finished && TERMINALS[edge.to] !== undefined && run.status === edge.to && edge.from === last);
    edges.push({ ...edge, id, taken });
  }
  return { nodes, edges, path, steps, states };
}
