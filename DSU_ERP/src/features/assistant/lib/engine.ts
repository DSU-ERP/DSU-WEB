import "server-only";
import { ChatOpenAI } from "@langchain/openai";
import {
  AIMessage,
  AIMessageChunk,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import {
  Annotation,
  END,
  MessagesAnnotation,
  START,
  StateGraph,
  type LangGraphRunnableConfig,
} from "@langchain/langgraph";
import {
  FRIDAY_MODEL,
  FRIDAY_PROVIDER,
  FRIDAY_PROVIDERS,
  FALLBACK_PROVIDERS,
  openRouterBaseUrl,
  openRouterKey,
} from "./config";
import { FRIDAY_SYSTEM_PROMPT, FRIDAY_VOICE_HINT } from "./prompt";
import { FRIDAY_TOOLS, FRIDAY_TOOL_NAMES, createToolContext, runTool, toolLabel } from "./tools";
import { toolErrorCategory, type FridayTrace } from "@/features/admin/lib/officer-trace";
import { COMPETENCY_TOOLS } from "@/features/competency/friday-tools";
import {
  assembleToolCalls,
  explainUpstream,
  upstreamFailure,
  normalizeUsage,
  parseToolArguments,
  MAX_PROFILE_LINKS,
  openRouterProviderBody,
  type Usage,
} from "./protocol";

export const MAX_TOOL_ITERATIONS = 4;
// A complete academic/admission/contact profile needs room for every field.
// This is a ceiling; the prompt still keeps narrow answers concise.
const MAX_OUTPUT_TOKENS = 4096;

export type { Usage };

/** Stream protocol. The browser never receives reasoning or raw tool payloads. */
export type FridayEvent =
  | { type: "status"; state: FridayState }
  | { type: "text_delta"; text: string }
  | {
      type: "tool_status";
      label: string;
      state: "running" | "done" | "failed";
    }
  | { type: "usage"; usage: Usage }
  // A student profile resolved by a tool in this turn. The URL is built by
  // the server from a validated UUID, never from model text.
  | { type: "profile_link"; id: string; usn: string; name: string; url: string }
  | { type: "done"; text: string }
  | { type: "error"; message: string; recoverable: boolean };

export type FridayState =
  | "preparing"
  | "retrieving"
  | "responding"
  | "stopped";

export class FridayConfigError extends Error {}

/** The chat model, on OpenRouter with the approved providers only. */
function chatModel(maxTokens = MAX_OUTPUT_TOKENS, temperature = 0.3, providers: readonly string[] = FRIDAY_PROVIDERS): ChatOpenAI {
  const apiKey = openRouterKey();
  if (!apiKey)
    throw new FridayConfigError(
      "The assistant is not configured. Set OPENROUTER_API_KEY on the server to enable F.R.I.D.A.Y.",
    );
  return new ChatOpenAI({
    model: FRIDAY_MODEL,
    apiKey,
    configuration: { baseURL: openRouterBaseUrl() },
    temperature,
    maxTokens,
    streamUsage: true,
    // Failures surface immediately with an explanation rather than retrying.
    maxRetries: 0,
    // Every request, including follow-ups after tool rounds, carries the same
    // provider list with fallbacks to any other provider disabled.
    modelKwargs: { provider: openRouterProviderBody(providers) },
  });
}

/** OpenRouter answered that none of the requested providers serves the model. */
function noProviderServes(error: unknown) {
  return upstreamFailure(error)?.status === 404;
}

/** Text content of a streamed chunk; reasoning parts are never included. */
function textOf(chunk: AIMessageChunk): string {
  if (typeof chunk.content === "string") return chunk.content;
  return chunk.content
    .map((part) => (part.type === "text" && typeof part.text === "string" ? part.text : ""))
    .join("");
}

const abortError = () => Object.assign(new Error("Generation stopped."), { name: "AbortError" });

// Graph state: the conversation plus the number of model calls made so far.
// `invalid` holds ids of tool calls whose arguments were not valid JSON.
const FridayGraphState = Annotation.Root({
  ...MessagesAnnotation.spec,
  round: Annotation<number>({ reducer: (_previous, next) => next, default: () => 0 }),
  invalid: Annotation<string[]>({ reducer: (_previous, next) => next, default: () => [] }),
});
type GraphState = typeof FridayGraphState.State;

/**
 * Builds the officer agent as a LangGraph state graph:
 *
 *   START → agent ⇄ tools      (agent → tools when the model requests tools)
 *           agent → END        (the model answered)
 *           agent → round_limit (tools still requested after the round limit)
 *
 * Nodes stream FridayEvents through LangGraph's custom stream, so the browser
 * protocol is unchanged. Built per request: the tool context, profile links
 * and trace belong to one officer turn.
 */
function buildOfficerGraph(trace: FridayTrace | undefined) {
  const toolContext = createToolContext();
  let linked = 0;
  const tools = [...FRIDAY_TOOLS] as unknown as Parameters<ChatOpenAI["bindTools"]>[0];
  // Created on the first model call, so the graph can be built (and drawn
  // for the Admin portal) without credentials.
  let model: ChatOpenAI | null = null;
  let withTools: ReturnType<ChatOpenAI["bindTools"]> | null = null;
  let fellBack = false;

  async function agent(state: GraphState, config: LangGraphRunnableConfig) {
    const emit = (event: FridayEvent) => config.writer?.(event);
    const iteration = state.round;
    const round = iteration + 1;
    if (config.signal?.aborted) throw abortError();
    emit({ type: "status", state: iteration === 0 ? "preparing" : "responding" });

    const step = trace?.open("model.call", "model", `Model call ${round}`);
    let full: AIMessageChunk | undefined;
    let answer = "";
    if (!model) {
      model = chatModel();
      withTools = model.bindTools(tools, { tool_choice: "auto" });
    }
    const call = async () => {
      // On the final allowed round the model must answer: no tools are offered.
      const runnable = iteration < MAX_TOOL_ITERATIONS ? withTools! : model!;
      const stream = await runnable.stream(state.messages, { signal: config.signal });
      for await (const chunk of stream) {
        full = full ? full.concat(chunk) : chunk;
        const text = textOf(chunk);
        if (text) {
          if (!answer) emit({ type: "status", state: "responding" });
          answer += text;
          emit({ type: "text_delta", text });
        }
      }
    };
    try {
      try {
        await call();
      } catch (error) {
        // A misconfigured provider list serves nothing. Before anything has
        // streamed, switch once to the remaining approved providers.
        if (fellBack || full || !FALLBACK_PROVIDERS.length || !noProviderServes(error) || config.signal?.aborted) throw error;
        fellBack = true;
        model = chatModel(MAX_OUTPUT_TOKENS, 0.3, FALLBACK_PROVIDERS);
        withTools = model.bindTools(tools, { tool_choice: "auto" });
        await call();
      }
    } catch (error) {
      step?.end("failed", { iteration: round }, config.signal?.aborted ? "cancelled" : "model_provider");
      throw error;
    }

    const finish = (full?.response_metadata as { finish_reason?: string } | undefined)?.finish_reason ?? null;
    const usage = full?.usage_metadata
      ? normalizeUsage({
          promptTokens: full.usage_metadata.input_tokens,
          completionTokens: full.usage_metadata.output_tokens,
          totalTokens: full.usage_metadata.total_tokens,
        })
      : null;
    // Tool calls are rebuilt from the raw streamed fragments and parsed
    // strictly: LangChain's own parsing is lenient with partial JSON, and a
    // truncated argument must never run a tool. A call without an id or name
    // is dropped; one whose arguments are not a JSON object is kept so the
    // model is told why it was not run.
    const assembled = assembleToolCalls(
      (full?.tool_call_chunks ?? []).map((c, i) => ({
        index: typeof c.index === "number" ? c.index : i,
        id: c.id,
        function: { name: c.name, arguments: c.args },
      })),
    );
    const invalid: string[] = [];
    const calls = assembled.map((call) => {
      const parsed = parseToolArguments(call.args);
      if (!parsed.ok) invalid.push(call.id);
      return { id: call.id, name: call.name, args: parsed.ok ? parsed.args : {}, type: "tool_call" as const };
    });

    step?.end("completed", {
      iteration: round,
      toolCalls: calls.length,
      decision: calls.length ? "call_tools" : "answer",
      ...(finish ? { reason: finish } : {}),
      ...(typeof usage?.promptTokens === "number" ? { tokensIn: usage.promptTokens } : {}),
      ...(typeof usage?.completionTokens === "number" ? { tokensOut: usage.completionTokens } : {}),
    });

    if (!calls.length) {
      if (usage) emit({ type: "usage", usage });
      if (!answer.trim() && finish === "length")
        emit({ type: "error", message: "The reply was cut off before any text arrived. Try a narrower question.", recoverable: true });
      else emit({ type: "done", text: answer });
    }
    // Text produced before a tool call is scaffolding, not the final answer,
    // but the request itself is replayed so tool results can follow it.
    return {
      messages: [new AIMessage({ content: answer, tool_calls: calls })],
      round,
      invalid,
    };
  }

  async function toolRound(state: GraphState, config: LangGraphRunnableConfig) {
    const emit = (event: FridayEvent) => config.writer?.(event);
    const request = state.messages.at(-1) as AIMessage;
    const invalid = new Set(state.invalid);
    emit({ type: "status", state: "retrieving" });
    const roundStep = trace?.open("tools", "tool", `Tool round ${state.round}`);
    const results: ToolMessage[] = [];

    for (const call of request.tool_calls ?? []) {
      if (config.signal?.aborted) throw abortError();
      const label = toolLabel(call.name);
      emit({ type: "tool_status", label, state: "running" });
      const known = FRIDAY_TOOL_NAMES.includes(call.name) || call.name.startsWith("competency_");
      const toolStep = trace?.open(known ? `tool:${call.name}` : "tool:unknown", "tool", label, roundStep?.seq);

      const result = invalid.has(call.id ?? "")
        ? ({ ok: false, error: "The tool arguments were not valid JSON." } as const)
        : await runTool(call.name, call.args as Record<string, unknown>, toolContext);
      toolStep?.end(result.ok ? "completed" : "failed", { tool: known ? call.name.slice(0, 60) : "unknown", iteration: state.round },
        result.ok ? undefined : toolErrorCategory(result.error));

      while (linked < toolContext.profiles.length && linked < MAX_PROFILE_LINKS) {
        const p = toolContext.profiles[linked++];
        emit({ type: "profile_link", id: p.id, usn: p.usn, name: p.name, url: p.url });
      }
      emit({ type: "tool_status", label, state: result.ok ? "done" : "failed" });

      results.push(
        new ToolMessage({
          tool_call_id: call.id ?? "",
          content: JSON.stringify(result.ok ? result.data : { error: result.error }).slice(0, 24000),
        }),
      );
    }

    roundStep?.end("completed", { count: results.length, iteration: state.round });
    trace?.flush();
    return { messages: results };
  }

  async function limit(_state: GraphState, config: LangGraphRunnableConfig) {
    trace?.record("loop.limit", "guard", "Tool round limit reached", "failed", { count: MAX_TOOL_ITERATIONS }, "loop_limit");
    config.writer?.({
      type: "error",
      message: "The assistant needed more lookups than allowed for one question. Ask for a narrower result.",
      recoverable: true,
    } satisfies FridayEvent);
    return {};
  }

  // Path-map keys are the branch labels the Admin portal shows.
  const next = (state: GraphState) => {
    const last = state.messages.at(-1) as AIMessage | undefined;
    if (!last?.tool_calls?.length) return ANSWERED;
    return state.round > MAX_TOOL_ITERATIONS ? OUT_OF_ROUNDS : WANTS_TOOLS;
  };

  return new StateGraph(FridayGraphState)
    .addNode("agent", agent, { metadata: {
      kind: "model", label: "Agent", purpose: "LangChain ChatOpenAI streams a reply or requests read-only tools. Reasoning text is never streamed, stored or shown.",
      inputs: "system rules, history, tool results", outputs: "text or tool calls", functions: ["ChatOpenAI.stream", "bindTools"],
      steps: [{ id: "model.call", kind: "model", label: "Model call", purpose: "One streamed model round; repeats after each tool round.", functions: ["ChatOpenAI.stream"] }],
    } })
    .addNode("tools", toolRound, { metadata: {
      kind: "tool", label: "Tool round", purpose: "Runs every tool the model requested in this round, in order, then returns the results to the agent. Each tool re-checks the officer in the database.",
      inputs: "tool calls", outputs: "tool results", functions: ["runTool"],
      steps: [{ id: "tools", kind: "tool", label: "Tool round" }, ...TOOL_STEPS],
    } })
    .addNode("round_limit", limit, { metadata: {
      kind: "guard", label: "Round limit", purpose: `Stops after ${MAX_TOOL_ITERATIONS} tool rounds and asks for a narrower question.`,
      inputs: "round count", outputs: "error", functions: ["MAX_TOOL_ITERATIONS"],
      steps: [{ id: "loop.limit", kind: "guard", label: "Round limit reached" }],
    } })
    .addEdge(START, "agent")
    .addConditionalEdges("agent", next, { [WANTS_TOOLS]: "tools", [OUT_OF_ROUNDS]: "round_limit", [ANSWERED]: END })
    .addEdge("tools", "agent")
    .addEdge("round_limit", END)
    .compile();
}

const WANTS_TOOLS = "model requested tools";
const OUT_OF_ROUNDS = `${MAX_TOOL_ITERATIONS} tool rounds used`;
const ANSWERED = "model answered";

// Each tool runs inside the tools node and is recorded as its own step.
const TOOL_STEPS = [...FRIDAY_TOOLS, ...COMPETENCY_TOOLS].map((tool) => ({
  id: `tool:${tool.function.name}`,
  kind: "tool",
  label: tool.function.name,
  purpose: `${toolLabel(tool.function.name)}. ${tool.function.description}`.slice(0, 400),
  inputs: Object.keys((tool.function.parameters as { properties?: Record<string, unknown> }).properties || {}).join(", ") || "none",
  outputs: "bounded JSON result",
  functions: ["runTool", tool.function.name.startsWith("competency_") ? "runCompetencyTool" : "placementRead / backendApi"],
}));

/** The officer agent graph, built only to be described (nothing runs). */
export function officerGraph() {
  return buildOfficerGraph(undefined);
}

/**
 * Runs one assistant turn on the LangGraph officer agent: streams text,
 * executes any requested tools, feeds results back, and repeats up to
 * MAX_TOOL_ITERATIONS before answering.
 */
export async function* runFriday(opts: {
  history: Array<{ role: "user" | "assistant"; content: string }>;
  message: string;
  spoken: boolean;
  signal: AbortSignal;
  // Agent workflow trace (Admin portal). Records each model round and tool
  // call as it really runs; never prompts, arguments or results.
  trace?: FridayTrace;
}): AsyncGenerator<FridayEvent> {
  const graph = buildOfficerGraph(opts.trace);
  const messages: BaseMessage[] = [
    new SystemMessage(FRIDAY_SYSTEM_PROMPT),
    ...(opts.spoken ? [new SystemMessage(FRIDAY_VOICE_HINT)] : []),
    ...opts.history.map((m) => (m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content))),
    new HumanMessage(opts.message),
  ];

  try {
    const stream = await graph.stream(
      { messages },
      {
        streamMode: "custom",
        signal: opts.signal,
        // Each round is an agent step and a tools step; leave headroom for the
        // final answer and the limit node.
        recursionLimit: 2 * (MAX_TOOL_ITERATIONS + 1) + 4,
      },
    );
    for await (const event of stream) yield event as FridayEvent;
  } catch (error) {
    if (opts.signal.aborted) {
      yield { type: "status", state: "stopped" };
      return;
    }
    throw error;
  }
}

/**
 * Turn an upstream failure into something the officer can act on. The real
 * provider message is preserved, with anything resembling a credential
 * stripped so a misconfigured key can never be echoed back to the browser.
 */
export function describeError(error: unknown): string {
  if (error instanceof FridayConfigError) return error.message;
  if (error instanceof Error && error.name === "AbortError")
    return "Generation stopped.";
  const upstream = upstreamFailure(error);
  if (upstream)
    return explainUpstream(upstream.status, upstream.body, FRIDAY_PROVIDER);
  const raw =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : typeof error === "string"
        ? error
        : "Unknown upstream failure.";
  const scrubbed = raw
    .replace(/sk-or-v1-[A-Za-z0-9_-]+/g, "[redacted key]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .slice(0, 400);
  return `The model provider request failed. ${scrubbed}`;
}

/**
 * Minimal live call used by the configuration check. Deliberately tiny: no
 * tools, few tokens, same pinned model and provider as a real request, so a
 * failure here isolates credentials and routing from the rest of the feature.
 */
export async function probeModel(): Promise<
  | { ok: true; model: string; provider: string; reply: string }
  | { ok: false; model: string; provider: string; error: string }
> {
  try {
    const reply = await chatModel(16, 0.3).invoke(
      [new HumanMessage("Reply with the single word: ready")],
      { signal: AbortSignal.timeout(30000) },
    );
    const text = typeof reply.content === "string" ? reply.content : "";
    return {
      ok: true,
      model: FRIDAY_MODEL,
      provider: FRIDAY_PROVIDER,
      reply: text ? text.trim().slice(0, 120) : "(empty)",
    };
  } catch (error) {
    return {
      ok: false,
      model: FRIDAY_MODEL,
      provider: FRIDAY_PROVIDER,
      error: describeError(error),
    };
  }
}
