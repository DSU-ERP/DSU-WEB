import "server-only";
import { OpenRouter } from "@openrouter/sdk";
import type { ChatMessages, ChatToolCall } from "@openrouter/sdk/models";
import { FRIDAY_MODEL, FRIDAY_PROVIDER, openRouterKey } from "./config";
import { FRIDAY_SYSTEM_PROMPT, FRIDAY_VOICE_HINT } from "./prompt";
import { FRIDAY_TOOLS, runTool, toolLabel } from "./tools";
import {
  assembleToolCalls,
  normalizeUsage,
  parseToolArguments,
  providerRouting,
  type ToolCallFragment,
  type Usage,
} from "./protocol";

export const MAX_TOOL_ITERATIONS = 4;
const MAX_OUTPUT_TOKENS = 1200;

export type { Usage };

/** Stream protocol. The browser never receives reasoning or raw tool payloads. */
export type FridayEvent =
  | { type: "status"; state: FridayState }
  | { type: "text_delta"; text: string }
  | { type: "tool_status"; label: string; state: "running" | "done" | "failed" }
  | { type: "usage"; usage: Usage }
  | { type: "done"; text: string }
  | { type: "error"; message: string; recoverable: boolean };

export type FridayState =
  | "preparing"
  | "retrieving"
  | "responding"
  | "stopped";

export class FridayConfigError extends Error {}

function client(): OpenRouter {
  const apiKey = openRouterKey();
  if (!apiKey)
    throw new FridayConfigError(
      "The assistant is not configured. Set OPENROUTER_API_KEY on the server to enable F.R.I.D.A.Y.",
    );
  return new OpenRouter({ apiKey });
}



/**
 * Runs one assistant turn: streams text, executes any requested tools, feeds
 * results back, and repeats up to MAX_TOOL_ITERATIONS before answering.
 */
export async function* runFriday(opts: {
  history: Array<{ role: "user" | "assistant"; content: string }>;
  message: string;
  spoken: boolean;
  signal: AbortSignal;
}): AsyncGenerator<FridayEvent> {
  const or = client();

  const messages: ChatMessages[] = [
    { role: "system", content: FRIDAY_SYSTEM_PROMPT },
    ...(opts.spoken
      ? [{ role: "system" as const, content: FRIDAY_VOICE_HINT }]
      : []),
    ...opts.history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: opts.message },
  ];

  let answer = "";
  let usage: Usage | null = null;

  for (let iteration = 0; iteration <= MAX_TOOL_ITERATIONS; iteration++) {
    if (opts.signal.aborted) {
      yield { type: "status", state: "stopped" };
      return;
    }

    yield {
      type: "status",
      state: iteration === 0 ? "preparing" : "responding",
    };

    const response = await or.chat.send(
      {
        chatRequest: {
          model: FRIDAY_MODEL,
          messages,
          stream: true,
          provider: providerRouting(FRIDAY_PROVIDER),
          tools: iteration < MAX_TOOL_ITERATIONS ? [...FRIDAY_TOOLS] : undefined,
          toolChoice: iteration < MAX_TOOL_ITERATIONS ? "auto" : "none",
          maxTokens: MAX_OUTPUT_TOKENS,
          temperature: 0.3,
        },
      },
      { signal: opts.signal },
    );

    if (!(Symbol.asyncIterator in response)) {
      yield {
        type: "error",
        message: "The model provider returned a non-streaming response.",
        recoverable: true,
      };
      return;
    }
    const stream = response;

    const fragments: ToolCallFragment[] = [];
    let finish: string | null = null;
    let produced = false;

    for await (const chunk of stream) {
      if (opts.signal.aborted) break;

      if (chunk.error) {
        yield {
          type: "error",
          message: chunk.error.message || "The model provider returned an error.",
          recoverable: true,
        };
        return;
      }

      const choice = chunk.choices?.[0];
      if (choice?.finishReason) finish = choice.finishReason;

      const delta = choice?.delta;
      if (delta?.content) {
        if (!produced) {
          produced = true;
          yield { type: "status", state: "responding" };
        }
        answer += delta.content;
        yield { type: "text_delta", text: delta.content };
      }
      // delta.reasoning is deliberately ignored: internal reasoning is never
      // streamed, spoken or stored.

      // Arguments arrive fragmented across chunks, keyed by index.
      for (const call of delta?.toolCalls ?? []) fragments.push(call);

      if (chunk.usage) usage = normalizeUsage(chunk.usage);
    }

    if (opts.signal.aborted) {
      yield { type: "status", state: "stopped" };
      return;
    }

    const assembled = assembleToolCalls(fragments);
    if (!assembled.length) {
      if (usage) yield { type: "usage", usage };
      if (!answer.trim() && finish === "length") {
        yield {
          type: "error",
          message: "The reply was cut off before any text arrived. Try a narrower question.",
          recoverable: true,
        };
        return;
      }
      yield { type: "done", text: answer };
      return;
    }

    // Replay the assistant's tool request, then append each result.
    const calls: ChatToolCall[] = assembled.map((slot) => ({
      id: slot.id,
      type: "function" as const,
      function: { name: slot.name, arguments: slot.args || "{}" },
    }));

    messages.push({
      role: "assistant",
      content: answer || null,
      toolCalls: calls,
    });

    yield { type: "status", state: "retrieving" };

    for (const call of calls) {
      if (opts.signal.aborted) {
        yield { type: "status", state: "stopped" };
        return;
      }
      const label = toolLabel(call.function.name);
      yield { type: "tool_status", label, state: "running" };

      const parsed = parseToolArguments(call.function.arguments);
      const result = parsed.ok
        ? await runTool(call.function.name, parsed.args)
        : ({ ok: false, error: "The tool arguments were not valid JSON." } as const);

      yield {
        type: "tool_status",
        label,
        state: result.ok ? "done" : "failed",
      };

      messages.push({
        role: "tool",
        toolCallId: call.id,
        content: JSON.stringify(
          result.ok ? result.data : { error: result.error },
        ).slice(0, 24000),
      });
    }

    // Text produced before a tool call is scaffolding, not the final answer.
    answer = "";
  }

  yield {
    type: "error",
    message:
      "The assistant needed more lookups than allowed for one question. Ask for a narrower result.",
    recoverable: true,
  };
}
