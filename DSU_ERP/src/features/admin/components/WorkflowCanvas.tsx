"use client";
import { memo, useEffect, useMemo } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Ban,
  Bot,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleDashed,
  CircleSlash,
  CircleX,
  Database,
  FileInput,
  FileOutput,
  Gauge,
  GitBranch,
  KeyRound,
  Layers,
  Loader,
  Save,
  ShieldAlert,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { GraphEdge, GraphNode, NodeState } from "../lib/graph";
import { ms } from "../lib/types";

const KIND_ICON: Record<string, LucideIcon> = {
  input: FileInput, auth: KeyRound, guard: ShieldAlert, limit: Gauge, context: Layers, route: GitBranch, retrieval: Database,
  tool: Wrench, model: Bot, validate: ShieldCheck, persist: Save, output: FileOutput, terminal: CircleSlash,
};
const STATE_ICON: Record<NodeState, LucideIcon> = {
  pending: CircleDashed, not_run: CircleDashed, running: Loader, completed: CircleCheck, failed: CircleX, skipped: CircleSlash, denied: Ban,
};
export const STATE_TEXT: Record<NodeState, string> = {
  pending: "Pending", not_run: "Not run", running: "Running", completed: "Completed", failed: "Failed", skipped: "Skipped", denied: "Authorization denied",
};
type Data = GraphNode & { selected: boolean; mode: "architecture" | "run"; onToggle: (id: string) => void };

const FlowNode = memo(function FlowNode({ data }: NodeProps<Node<Data>>) {
  const Icon = KIND_ICON[data.kind] ?? Layers;
  const StateIcon = STATE_ICON[data.state];
  return (
    <div
      className={`aw-node aw-kind-${data.kind} aw-state-${data.mode === "run" ? data.state : "idle"}${data.selected ? " is-selected" : ""}${data.parent ? " is-child" : ""}`}
      data-node={data.id}
    >
      <Handle type="target" position={Position.Top} id="top" />
      <Handle type="target" position={Position.Left} id="left" />
      <Handle type="target" position={Position.Right} id="right-in" />
      <div className="aw-node-head">
        <Icon size={14} aria-hidden="true" />
        <span className="aw-node-kind">{data.terminal ? "end" : data.kind}</span>
        {data.mode === "run" && (
          <span className="aw-node-state" title={STATE_TEXT[data.state]}>
            <StateIcon size={13} aria-hidden="true" />
            <span className="aw-visually-hidden">{STATE_TEXT[data.state]}</span>
          </span>
        )}
      </div>
      <strong className="aw-node-label">{data.label}</strong>
      {data.mode === "run" && data.count > 0 && (
        <span className="aw-node-meta">
          {data.count > 1 ? `${data.count} times · ` : ""}
          {data.durationMs === null ? "timing not available" : ms(data.durationMs)}
        </span>
      )}
      {data.childCount > 0 && (
        <button
          type="button"
          className="aw-node-toggle nodrag"
          aria-expanded={data.expanded}
          onClick={(event) => {
            event.stopPropagation();
            data.onToggle(data.id);
          }}
        >
          {data.expanded ? <ChevronDown size={12} aria-hidden="true" /> : <ChevronRight size={12} aria-hidden="true" />}
          {data.expanded ? "Collapse" : `${data.childCount} ${data.kind === "tool" ? "tools" : "steps"}`}
        </button>
      )}
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="source" position={Position.Right} id="right" />
      <Handle type="source" position={Position.Left} id="left-out" />
    </div>
  );
});
const nodeTypes = { step: FlowNode };

function Fit({ signature }: { signature: string }) {
  const flow = useReactFlow();
  useEffect(() => {
    const id = window.requestAnimationFrame(() => flow.fitView({ padding: 0.12, duration: 0 }));
    return () => window.cancelAnimationFrame(id);
  }, [flow, signature]);
  return null;
}

/** The interactive graph: zoom, pan, drag, fit, click to inspect, expand nested steps. */
export function WorkflowCanvas({
  nodes,
  edges,
  mode,
  selected,
  onSelect,
  onToggle,
  layoutKey,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  mode: "architecture" | "run";
  selected: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  layoutKey: string;
}) {
  const flowNodes = useMemo<Node<Data>[]>(
    () =>
      nodes.map((n) => ({
        id: n.id,
        type: "step",
        position: { x: n.x, y: n.y },
        data: { ...n, selected: n.id === selected, mode, onToggle },
        ariaLabel: `${n.label}${mode === "run" ? `, ${STATE_TEXT[n.state]}` : ""}`,
      })),
    [nodes, selected, mode, onToggle],
  );
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const flowEdges = useMemo<Edge[]>(
    () =>
      edges
        .filter((e) => byId.has(e.from) && byId.has(e.to))
        .map((e) => {
          const target = byId.get(e.to)!;
          const loop = e.kind === "loop";
          const toTerminal = target.terminal;
          const active = mode === "run" && e.taken;
          return {
            id: e.id,
            source: e.from,
            target: e.to,
            sourceHandle: e.child ? "right" : toTerminal ? "left-out" : loop ? "right" : "bottom",
            targetHandle: e.child ? "left" : toTerminal ? "right-in" : loop ? "right-in" : "top",
            type: loop ? "default" : "smoothstep",
            label: e.child ? undefined : e.condition,
            className: `aw-edge aw-edge-${e.kind ?? "flow"}${active ? " is-taken" : ""}${mode === "run" && !e.taken ? " is-idle" : ""}`,
            markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
            labelBgPadding: [4, 2] as [number, number],
            labelBgBorderRadius: 3,
          };
        }),
    [edges, byId, mode],
  );
  return (
    <div className="aw-canvas" aria-label="Agent workflow graph">
      <ReactFlowProvider>
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => onSelect(node.id)}
          fitView
          minZoom={0.2}
          maxZoom={1.8}
          nodesConnectable={false}
          elementsSelectable
        >
          <Background gap={22} size={1} className="aw-dots" />
          <Controls showInteractive={false} position="bottom-right" />
          <Fit signature={layoutKey} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
