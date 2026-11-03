import "server-only";
import { FRIDAY_TOOLS, toolLabel } from "@/features/assistant/lib/tools";
import { COMPETENCY_TOOLS } from "@/features/competency/friday-tools";
import { MAX_TOOL_ITERATIONS } from "@/features/assistant/lib/engine";
import { FRIDAY_MODEL } from "@/features/assistant/lib/config";
import type { Workflow, WorkflowNode } from "./types";

// Officer F.R.I.D.A.Y. as a graph. Built from the engine's real tool list and
// round limit, so adding a tool adds its node. Node ids match the names the
// engine and route record (src/features/admin/lib/officer-trace.ts).
export function officerWorkflow(): Workflow {
  const tools: WorkflowNode[] = [...FRIDAY_TOOLS, ...COMPETENCY_TOOLS].map((tool) => ({
    id: `tool:${tool.function.name}`,
    kind: "tool",
    label: tool.function.name,
    purpose: `${toolLabel(tool.function.name)}. ${tool.function.description}`.slice(0, 400),
    inputs: Object.keys((tool.function.parameters as { properties?: Record<string, unknown> }).properties || {}).join(", ") || "none",
    outputs: "bounded JSON result",
    functions: ["runTool", tool.function.name.startsWith("competency_") ? "runCompetencyTool" : "placementRead / backendApi"],
    parent: "tools",
  }));
  return {
    id: "officer",
    title: "Placement Officer F.R.I.D.A.Y.",
    version: "officer-friday-v2",
    runtime: "DSU_ERP web app, POST /placement/friday-api (streamed over server-sent events)",
    orchestration: `LangGraph state graph (agent ⇄ tools) with LangChain ChatOpenAI on OpenRouter (${FRIDAY_MODEL}). The model chooses read-only tools; each tool re-checks the officer in the database. At most ${MAX_TOOL_ITERATIONS} tool rounds.`,
    nodes: [
      { id: "input", kind: "input", label: "Officer question", purpose: "Validated question (max length enforced) and the turns on screen.", inputs: "message, history", outputs: "request", functions: ["readBody", "readHistory"] },
      { id: "identity", kind: "auth", label: "Placement officer session", purpose: "Requires an active placement officer; every later lookup re-checks this in the database.", inputs: "Supabase session", outputs: "officer", functions: ["officerSession", "placement.assert_officer()"] },
      { id: "limit", kind: "limit", label: "Request limit", purpose: "At most 20 assistant requests a minute per officer, counted in the database.", inputs: "officer", outputs: "allowed", functions: ["placementMutate('assistant.request')"] },
      { id: "context", kind: "context", label: "Conversation", purpose: "Loads the officer's own conversation, or starts a new one.", inputs: "conversation id", outputs: "history", functions: ["placementRead('conversation')"] },
      { id: "model.call", kind: "model", label: "Model call", purpose: "Streams a reply or requests tools. Reasoning text is never streamed, stored or shown.", inputs: "system rules, history, tool results", outputs: "text or tool calls", functions: ["runFriday", "LangGraph node: agent", "ChatOpenAI.stream"] },
      { id: "tools", kind: "tool", label: "Tool round", purpose: "Runs every tool the model requested in this round, in order, then returns the results to the model.", inputs: "tool calls", outputs: "tool results", functions: ["LangGraph node: tools", "runTool"], children: tools.map((t) => t.id) },
      ...tools,
      { id: "loop.limit", kind: "guard", label: "Round limit", purpose: `Stops after ${MAX_TOOL_ITERATIONS} tool rounds and asks for a narrower question.`, inputs: "round count", outputs: "error", functions: ["LangGraph node: limit", "MAX_TOOL_ITERATIONS"] },
      { id: "output", kind: "output", label: "Answer streamed", purpose: "The final answer text, streamed to the officer.", inputs: "model text", outputs: "answer", functions: ["text_delta events"] },
      { id: "persist", kind: "persist", label: "Save conversation", purpose: "Stores the question and answer in the officer's conversation.", inputs: "answer", outputs: "conversation", functions: ["conversation.create", "conversation.append"] },
    ],
    edges: [
      { from: "input", to: "identity" },
      { from: "identity", to: "limit", condition: "active officer" },
      { from: "limit", to: "context", condition: "under the limit" },
      { from: "limit", to: "failed", condition: "rate limited", kind: "error" },
      { from: "context", to: "model.call" },
      { from: "model.call", to: "tools", condition: "model requested tools", kind: "branch" },
      { from: "tools", to: "model.call", condition: "results returned", kind: "loop" },
      { from: "model.call", to: "output", condition: "model answered", kind: "branch" },
      { from: "model.call", to: "loop.limit", condition: `${MAX_TOOL_ITERATIONS} rounds used`, kind: "error" },
      { from: "model.call", to: "failed", condition: "provider error or cancelled", kind: "error" },
      { from: "output", to: "persist" },
    ],
  };
}
