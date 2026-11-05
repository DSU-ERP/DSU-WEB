import "server-only";
import { MAX_TOOL_ITERATIONS, officerGraph } from "@/features/assistant/lib/engine";
import { FRIDAY_MODEL } from "@/features/assistant/lib/config";
import { graphWorkflow, type StepInfo } from "./langgraph-workflow";
import type { Workflow } from "./types";

// Officer F.R.I.D.A.Y. drawn from its compiled LangGraph (engine.ts): the
// boxes and arrows are the graph's nodes and edges, and their descriptions
// are the node metadata. The route checks the officer, the request limit and
// the conversation before the graph runs, and saves the answer after it; those
// recorded steps are listed under Start and End.

const BEFORE: StepInfo[] = [
  { id: "input", kind: "input", label: "Officer question", purpose: "Validated question (max length enforced) and the turns on screen.", inputs: "message, history", outputs: "request", functions: ["readBody", "readHistory"] },
  { id: "identity", kind: "auth", label: "Placement officer session", purpose: "Requires an active placement officer; every later lookup re-checks this in the database.", inputs: "Supabase session", outputs: "officer", functions: ["officerSession", "placement.assert_officer()"] },
  { id: "limit", kind: "limit", label: "Request limit", purpose: "At most 20 assistant requests a minute per officer, counted in the database.", inputs: "officer", outputs: "allowed", functions: ["placementMutate('assistant.request')"] },
  { id: "context", kind: "context", label: "Conversation", purpose: "Loads the officer's own conversation, or starts a new one.", inputs: "conversation id", outputs: "history", functions: ["placementRead('conversation')"] },
];
const AFTER: StepInfo[] = [
  { id: "output", kind: "output", label: "Answer streamed", purpose: "The final answer text, streamed to the officer.", inputs: "model text", outputs: "answer", functions: ["text_delta events"] },
  { id: "persist", kind: "persist", label: "Save conversation", purpose: "Stores the question and answer in the officer's conversation.", inputs: "answer", outputs: "conversation", functions: ["conversation.create", "conversation.append"] },
];

export function officerWorkflow(): Workflow {
  return graphWorkflow(officerGraph(), {
    id: "officer",
    title: "Placement Officer F.R.I.D.A.Y.",
    version: "officer-friday-v3",
    runtime: "DSU_ERP web app, POST /placement/friday-api (streamed over server-sent events)",
    orchestration: `LangGraph state graph with LangChain ChatOpenAI on OpenRouter (${FRIDAY_MODEL}). The agent chooses read-only tools; each tool re-checks the officer in the database. At most ${MAX_TOOL_ITERATIONS} tool rounds.`,
    start: BEFORE,
    end: AFTER,
  });
}
