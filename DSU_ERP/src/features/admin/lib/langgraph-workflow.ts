import "server-only";
import { END, START } from "@langchain/langgraph";
import type { NodeKind, Workflow, WorkflowEdge, WorkflowNode } from "./types";

// Describes a compiled LangGraph for the Agent Workflow page. The same rules
// as the backend's graphWorkflow (DSU-Backend src/platform/agents/graph.js):
// nodes and edges come from graph.getGraph(); each node's description is the
// `metadata` passed to addNode; metadata.steps lists the tracer steps recorded
// inside that node (a step named like its node is the node's own step).

export type StepInfo = { id: string; kind: string; label: string; purpose?: string; inputs?: string; outputs?: string; functions?: string[] };
type NodeInfo = Partial<Omit<WorkflowNode, "id" | "children" | "parent">> & { steps?: StepInfo[] };
type Drawable = {
  getGraph(): {
    nodes: Record<string, { id: string; metadata?: Record<string, unknown> }>;
    edges: Array<{ source: string; target: string; data?: unknown; conditional?: boolean }>;
  };
};

const ENDPOINTS: Record<string, NodeInfo> = {
  [START]: { kind: "input", label: "Start", purpose: "LangGraph entry point. Steps recorded before the graph runs are listed here." },
  [END]: { kind: "output", label: "End", purpose: "LangGraph exit point. Steps recorded after the graph finishes are listed here." },
};

export function graphWorkflow(
  compiled: Drawable,
  { start = [], end = [], ...meta }: Omit<Workflow, "nodes" | "edges"> & { start?: StepInfo[]; end?: StepInfo[] },
): Workflow {
  const drawn = compiled.getGraph();
  // An edge back to a node on the current path from START is a loop.
  const loops = new Set<(typeof drawn.edges)[number]>();
  const visited = new Set<string>();
  const visit = (at: string, path: Set<string>) => {
    visited.add(at);
    path.add(at);
    for (const e of drawn.edges.filter((x) => x.source === at)) {
      if (path.has(e.target)) loops.add(e);
      else if (!visited.has(e.target)) visit(e.target, path);
    }
    path.delete(at);
  };
  visit(START, new Set());

  const nodes: WorkflowNode[] = [];
  for (const node of Object.values(drawn.nodes)) {
    const info: NodeInfo = ENDPOINTS[node.id] ?? (node.metadata as NodeInfo | undefined) ?? {};
    const steps = node.id === START ? start : node.id === END ? end : info.steps ?? [];
    // One recorded step is the node's own; several are listed under it.
    const others = steps.filter((s) => s.id !== node.id);
    const children = others.length > 1 || steps.length > others.length ? others : [];
    const records = others.length === 1 && !children.length ? [others[0].id] : [];
    nodes.push({
      id: node.id,
      kind: (info.kind ?? "context") as NodeKind,
      label: info.label ?? node.id,
      purpose: info.purpose ?? "",
      inputs: info.inputs ?? "graph state",
      outputs: info.outputs ?? "graph state",
      functions: ENDPOINTS[node.id] ? [`LangGraph ${node.id}`] : [`LangGraph node: ${node.id}`, ...(info.functions ?? [])],
      ...(children.length ? { children: children.map((s) => s.id) } : {}),
      ...(records.length ? { records } : {}),
    });
    for (const step of children)
      nodes.push({
        id: step.id, kind: step.kind as NodeKind, label: step.label, purpose: step.purpose ?? "",
        inputs: step.inputs ?? "", outputs: step.outputs ?? "", functions: step.functions ?? [], parent: node.id,
      });
  }
  const edges: WorkflowEdge[] = drawn.edges.map((e) => ({
    from: e.source,
    to: e.target,
    ...(e.data ? { condition: String(e.data) } : {}),
    ...(loops.has(e) ? { kind: "loop" as const } : e.conditional ? { kind: "branch" as const } : {}),
  }));
  return { ...meta, nodes, edges };
}
