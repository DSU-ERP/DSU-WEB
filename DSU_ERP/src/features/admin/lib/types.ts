// Agent workflow shapes shared by the Admin portal pages and components.
export type Assistant = "student" | "officer" | "company";
export type NodeKind = "input" | "auth" | "guard" | "limit" | "context" | "route" | "retrieval" | "tool" | "model" | "validate" | "persist" | "output" | "terminal";
export type WorkflowNode = {
  id: string;
  kind: NodeKind;
  label: string;
  purpose: string;
  inputs: string;
  outputs: string;
  functions: string[];
  children?: string[];
  parent?: string;
};
export type WorkflowEdge = { from: string; to: string; condition?: string; kind?: "branch" | "error" | "denied" | "loop" };
export type Workflow = {
  id: Assistant;
  title: string;
  version: string;
  runtime: string;
  orchestration: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};
export type StepStatus = "running" | "completed" | "failed" | "skipped" | "denied";
export type RunStatus = "running" | "completed" | "failed" | "denied";
export type RunSummary = {
  id: string;
  assistant: Assistant;
  workflowVersion: string;
  role: Assistant | "none";
  company: string | null;
  status: RunStatus;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  errorCategory: string | null;
  summary: Record<string, string | number | boolean>;
  updatedAt: string;
  steps: number;
  tools: number;
  errors: number;
  toolNames: string[];
};
export type RunStep = {
  seq: number;
  parentSeq: number | null;
  node: string;
  kind: NodeKind;
  label: string;
  status: StepStatus;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  attempt: number;
  errorCategory: string | null;
  meta: Record<string, string | number | boolean>;
};
export type RunDetail = Omit<RunSummary, "steps"> & { steps: RunStep[] };
export type RunList = {
  rows: RunSummary[];
  counts: {
    total: number;
    running: number;
    completed: number;
    failed: number;
    denied: number;
    byAssistant: Record<Assistant, number>;
    medianMs: number | null;
  };
  tools: string[];
  serverTime: string;
};
export const ASSISTANT_LABEL: Record<Assistant, string> = { student: "Student", officer: "Placement Officer", company: "Company" };
export const STATUS_LABEL: Record<StepStatus | RunStatus | "pending", string> = {
  pending: "Pending",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  skipped: "Skipped",
  denied: "Authorization denied",
};
export const ms = (value: number | null | undefined) =>
  value === null || value === undefined ? "Not available" : value < 1000 ? `${Math.round(value)} ms` : `${(value / 1000).toFixed(value < 10000 ? 2 : 1)} s`;
export const clock = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) +
      `.${String(new Date(value).getMilliseconds()).padStart(3, "0")}`
    : "Not available";
export const when = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }) : "Not available";
