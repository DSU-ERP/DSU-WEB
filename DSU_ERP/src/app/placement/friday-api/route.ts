import { NextRequest, NextResponse } from "next/server";
import {
  officerSession,
  placementRead,
  placementMutate,
} from "@/features/placement/lib/server";
import {
  runFriday,
  describeError,
  probeModel,
  FridayConfigError,
  type FridayEvent,
} from "@/features/assistant/lib/engine";
import { fridayCapabilities } from "@/features/assistant/lib/config";
import { CampusError } from "@/shared/http/errors";
import { sameOrigin } from "@/features/placement/lib/request";
import type { Row } from "@/features/placement/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
const MAX_BODY = 20000;
const MAX_MESSAGE = 1000;
const MAX_HISTORY_TURNS = 12;
const MAX_HISTORY_CHARS = 4000;

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

export async function GET(req: NextRequest) {
  try {
    await officerSession();
    if (req.nextUrl.searchParams.get("check") === "1")
      return json({
        capabilities: fridayCapabilities(),
        probe: await probeModel(),
      });
    return json({ capabilities: fridayCapabilities() });
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT"))
      return json({ error: "Sign in to continue." }, 401);
    return json({ error: "The request could not be completed." }, 400);
  }
}

export async function POST(req: NextRequest) {
  // Same-origin only, matching the existing assistant endpoint.
  if (!sameOrigin(req))
    return json({ error: "Invalid request origin." }, 403);

  let conversationId: string | undefined;
  let question = "";

  try {
    // Authorisation is checked here and again inside every Supabase call.
    await officerSession();

    const raw = await readBody(req);
    if (raw === null) return json({ error: "Request is too large." }, 413);

    let input: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        return json({ error: "Invalid request." }, 400);
      input = parsed as Record<string, unknown>;
    } catch {
      return json({ error: "Invalid request." }, 400);
    }

    const requestId = input.requestId;
    if (typeof requestId !== "string" || !UUID.test(requestId))
      return json({ error: "Invalid request." }, 400);

    const message = typeof input.message === "string" ? input.message.trim() : "";
    if (!message || message.length > MAX_MESSAGE)
      return json(
        { error: `Enter a question of up to ${MAX_MESSAGE} characters.` },
        400,
      );
    question = message;

    const spoken = input.spoken === true;
    const existing = typeof input.id === "string" ? input.id : undefined;
    if (existing && !UUID.test(existing))
      return json({ error: "Invalid conversation." }, 400);

    if (!fridayCapabilities().chat)
      return json(
        {
          error:
            "The assistant is not configured. Ask an administrator to set OPENROUTER_API_KEY.",
        },
        503,
      );

    // Per-user rate limit, reusing the existing assistant limiter.
    // A fresh id per call: replaying a client id must not bypass the rate limit.
    await placementMutate("assistant.request", {}, crypto.randomUUID());

    // Conversation context. The browser sends the turns currently on screen,
    // so a brand-new conversation is contextual from the second message
    // rather than only once it has been saved. It is the officer's own
    // conversation, but it is still shape-checked and bounded here, and the
    // system rules treat message content as data, never as instructions.
    const history = readHistory(input.history);

    if (existing) {
      // Ownership is enforced in the database; this also rejects another
      // assistant's conversation.
      const conversation = await placementRead<Row>("conversation", {
        id: existing,
      });
      if (conversation.assistant !== "friday")
        return json({ error: "Choose a F.R.I.D.A.Y. conversation." }, 400);
      conversationId = existing;
    }

    const controller = new AbortController();
    req.signal.addEventListener("abort", () => controller.abort(), {
      once: true,
    });

    const encoder = new TextEncoder();
    const send = (event: FridayEvent) =>
      encoder.encode(`data: ${JSON.stringify(event)}\n\n`);

    const stream = new ReadableStream<Uint8Array>({
      async start(ctl) {
        let answer = "";
        let completed = false;
        try {
          for await (const event of runFriday({
            history,
            message,
            spoken,
            signal: controller.signal,
          })) {
            if (event.type === "done") {
              answer = event.text;
              completed = true;
            }
            ctl.enqueue(send(event));
          }
        } catch (error) {
          ctl.enqueue(
            send({
              type: "error",
              message: describeError(error),
              recoverable: true,
            }),
          );
        }

        // Only a completed answer is persisted. An interrupted or failed
        // stream is never stored as a successful reply.
        if (completed && answer.trim()) {
          try {
            const id =
              conversationId ||
              (
                await placementMutate<Row>(
                  "conversation.create",
                  { assistant: "friday", title: question.slice(0, 120) },
                  crypto.randomUUID(),
                )
              ).id;
            await placementMutate(
              "conversation.append",
              {
                conversation_id: id,
                user: question,
                assistant: answer.slice(0, 30000),
              },
              crypto.randomUUID(),
            );
            ctl.enqueue(
              send({ type: "status", state: "responding" }),
            );
            ctl.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "saved", conversationId: id })}\n\n`,
              ),
            );
          } catch {
            ctl.enqueue(
              send({
                type: "error",
                message:
                  "The answer was produced but could not be saved to this conversation.",
                recoverable: true,
              }),
            );
          }
        }
        ctl.close();
      },
      cancel() {
        controller.abort();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "private, no-store, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT"))
      return json({ error: "Sign in to continue." }, 401);
    if (error instanceof FridayConfigError)
      return json({ error: error.message }, 503);
    if (error instanceof CampusError)
      return json({ error: error.message }, error.status);
    return json({ error: "The request could not be completed." }, 400);
  }
}

async function readBody(req: NextRequest): Promise<string | null> {
  const reader = req.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** Validate browser-supplied conversation turns: shape, roles, and size. */
function readHistory(
  value: unknown,
): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(value)) return [];
  const turns: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const item of value.slice(-MAX_HISTORY_TURNS * 2)) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as { role?: unknown; content?: unknown };
    if (typeof row.content !== "string") continue;
    const content = row.content.trim().slice(0, MAX_HISTORY_CHARS);
    if (!content) continue;
    turns.push({
      role: row.role === "assistant" ? "assistant" : "user",
      content,
    });
  }
  return turns;
}
