import { NextRequest, NextResponse } from "next/server";
import {
  officerSession,
  placementRead,
  placementMutate,
  renameFridayConversation,
} from "@/features/placement/lib/server";
import {
  answer,
  diagnostics,
  proposeEmail,
  confirmEmail,
} from "@/features/placement/lib/assistant";
import {
  ASSISTANT_TOOLS,
  type AssistantTool,
} from "@/features/placement/lib/assistantRules";
import { CampusError } from "@/shared/http/errors";
import { sameOrigin } from "@/features/placement/lib/request";
import type { Row } from "@/features/placement/lib/types";
export const runtime = "nodejs";
const reply = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
const uuid = (value: unknown) =>
  typeof value === "string" &&
  /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value);
function failure(error: unknown) {
  if(error instanceof Error && error.message.includes("NEXT_REDIRECT"))return reply({error:"Sign in to continue."},401);
  return reply(
    {
      error:
        error instanceof CampusError
          ? error.message
          : error instanceof Error && !error.message.includes("NEXT_")
            ? error.message
            : "The request could not be completed.",
    },
    error instanceof CampusError ? error.status : 400,
  );
}
export async function GET(req: NextRequest) {
  try {
    await officerSession();
    const assistant =
      req.nextUrl.searchParams.get("assistant") === "friday"
        ? "friday"
        : "observation";
    const id = req.nextUrl.searchParams.get("id");
    if (id && !uuid(id)) return reply({ error: "Invalid conversation." }, 400);
    const data = id
      ? await placementRead("conversation", { id })
      : await placementRead("conversations", { assistant, limit: "100" });
    return reply({ data, diagnostics: diagnostics() });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: NextRequest) {
  if (!sameOrigin(req))
    return reply({ error: "Invalid request origin." }, 403);
  try {
    await officerSession();
    const reader = req.body?.getReader();
    if (!reader) return reply({ error: "Request is empty." }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 20000) {
        await reader.cancel();
        return reply({ error: "Request is too large." }, 413);
      }
      chunks.push(value);
    }
    const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!input || typeof input !== "object" || !uuid(input.requestId))
      return reply({ error: "Invalid request." }, 400);
    const id = input.id;
    if (id && !uuid(id)) return reply({ error: "Invalid record." }, 400);
    if (input.operation === "rename") {
      if (!uuid(id) || typeof input.title !== "string" || !input.title.trim() ||
          input.title.trim().length > 120 || /[\u0000-\u001f\u007f]/.test(input.title))
        return reply({ error: "Enter a conversation name of 1–120 characters on one line." }, 400);
      return reply({ data: await renameFridayConversation(id, input.title.trim()) });
    }
    // A fresh id per call: replaying a client id must not bypass the rate limit.
    await placementMutate("assistant.request", {}, crypto.randomUUID());
    if (input.operation === "delete")
      return reply(
        await placementMutate(
          "conversation.delete",
          { id },
          crypto.randomUUID(),
        ),
      );
    if (input.operation === "cancel")
      return reply(
        await placementMutate("proposal.cancel", { id }, crypto.randomUUID()),
      );
    if (input.operation === "confirm") return reply(await confirmEmail(id));
    if (input.operation === "draft")
      return reply({
        proposal: await proposeEmail(input.draft, crypto.randomUUID()),
      });
    if (
      input.operation !== "ask" ||
      typeof input.message !== "string" ||
      !input.message.trim() ||
      input.message.length > 1000
    )
      return reply(
        { error: "Enter a question of up to 1,000 characters." },
        400,
      );
    const tool: AssistantTool = ASSISTANT_TOOLS.includes(input.tool)
      ? input.tool
      : "auto";
    const assistant = input.assistant === "friday" ? "friday" : "observation";
    const batch =
      typeof input.batch === "string" && /^20\d{2}$/.test(input.batch)
        ? input.batch
        : undefined;
    if (id) {
      const conversation = await placementRead<Row>("conversation", { id });
      if (conversation.assistant !== assistant)
        return reply(
          { error: "Choose a conversation from this assistant." },
          400,
        );
    }
    const result = await answer(input.message.trim(), tool, batch);
    const conversationId =
      id ||
      (
        await placementMutate<Row>(
          "conversation.create",
          { assistant, title: input.message.trim().slice(0, 120) },
          crypto.randomUUID(),
        )
      ).id;
    await placementMutate(
      "conversation.append",
      {
        conversation_id: conversationId,
        user: input.message.trim(),
        assistant:
          result.text +
          (result.links?.length
            ? "\n\n" +
              result.links.map((l) => `${l.title}: ${l.url}`).join("\n")
            : ""),
      },
      crypto.randomUUID(),
    );
    return reply({ ...result, conversationId });
  } catch (e) {
    return failure(e);
  }
}
