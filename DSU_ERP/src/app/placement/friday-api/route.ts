import { NextRequest, NextResponse } from "next/server";
import {
  officerSession,
  placementRead,
  placementMutate,
} from "@/lib/placement/server";
import { runFriday, FridayConfigError, type FridayEvent } from "@/lib/friday/engine";
import { fridayCapabilities } from "@/lib/friday/config";
import { CampusError } from "@/lib/campus-response";
import type { Row } from "@/lib/placement/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
const MAX_BODY = 20000;
const MAX_MESSAGE = 1000;
const MAX_HISTORY_TURNS = 12;

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

export async function GET() {
  try {
    await officerSession();
    return json({ capabilities: fridayCapabilities() });
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT"))
      return json({ error: "Sign in to continue." }, 401);
    return json({ error: "The request could not be completed." }, 400);
  }
}

export async function POST(req: NextRequest) {
  // Same-origin only, matching the existing assistant endpoint.
  if (req.headers.get("origin") !== new URL(req.url).origin)
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
    await placementMutate("assistant.request", {}, requestId);

    // Ownership is enforced in the database; this also rejects another
    // assistant's conversation.
    let history: Array<{ role: "user" | "assistant"; content: string }> = [];
    if (existing) {
      const conversation = await placementRead<Row>("conversation", {
        id: existing,
      });
      if (conversation.assistant !== "friday")
        return json({ error: "Choose a F.R.I.D.A.Y. conversation." }, 400);
      const rows = Array.isArray(conversation.messages)
        ? (conversation.messages as Row[])
        : [];
      history = rows
        .slice(-MAX_HISTORY_TURNS * 2)
        .map((m) => ({
          role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: String(m.content ?? ""),
        }))
        .filter((m) => m.content);
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
          const message =
            error instanceof FridayConfigError
              ? error.message
              : error instanceof Error && error.name === "AbortError"
                ? "Generation stopped."
                : "The assistant connection was interrupted.";
          ctl.enqueue(
            send({ type: "error", message, recoverable: true }),
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
