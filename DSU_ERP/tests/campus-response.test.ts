import { test } from "node:test";
import assert from "node:assert/strict";
import { CampusError, readCampusResponse } from "../src/shared/http/errors";

test("HTML hosting pages return a recoverable service error for both 200 and 503", async () => {
  for (const status of [200, 503]) {
    await assert.rejects(
      readCampusResponse(new Response("<!DOCTYPE html><h1>Service starting</h1>", {
        status, headers: { "content-type": "text/html" },
      })),
      (error: unknown) => error instanceof CampusError && error.status === 503 && !error.message.includes("DOCTYPE"),
    );
  }
});

test("malformed JSON and missing data become recoverable errors", async () => {
  for (const body of ["<html>", "null", "[]", "{}", '{"data":null}']) {
    await assert.rejects(
      readCampusResponse(new Response(body, { headers: { "content-type": "application/json" } })),
      CampusError,
    );
  }
});

test("valid API data is preserved", async () => {
  const payload = { data: { role: "admin", studentId: null } };
  assert.deepEqual(await readCampusResponse(Response.json(payload)), payload);
  assert.deepEqual(await readCampusResponse(Response.json({ data: [] })), { data: [] });
});

test("AI timeout and output-limit guidance reaches the interview draft", async () => {
  for (const [code, status, message] of [
    ["AI_TIMEOUT", 504, "The AI provider took too long to respond. Please retry; your draft is kept."],
    ["AI_OUTPUT_LIMIT", 502, "The AI response stopped before the plan was complete. Your draft is kept."],
  ] as const) {
    await assert.rejects(readCampusResponse(Response.json({ error: { code, message } }, { status })),
      (error: unknown) => error instanceof CampusError && error.code === code && error.status === status && error.message === message);
  }
});

test("authorization and rate-limit responses keep their status without leaking response details", async () => {
  for (const status of [403, 429, 500]) {
    await assert.rejects(
      readCampusResponse(Response.json({ error: { message: "private upstream detail" } }, { status })),
      (error: unknown) => error instanceof CampusError && error.status === status && !error.message.includes("private upstream"),
    );
  }
});

test("backend failures keep a machine-readable reason for diagnosis", async () => {
  const reason = async (response: Response) => {
    try { await readCampusResponse(response); } catch (error) { return error as CampusError; }
    throw new Error("expected a failure");
  };
  const pending = await reason(Response.json({ error: { code: "DATABASE_UPDATE_PENDING", message: "x" } }, { status: 503 }));
  assert.equal(pending.code, "DATABASE_UPDATE_PENDING");
  assert.equal(pending.status, 503);
  // Fastify's default "route not found" body means the backend build is older than the web.
  const outdated = await reason(Response.json({ message: "Route GET:/api/v1/session not found", error: "Not Found", statusCode: 404 }, { status: 404 }));
  assert.equal(outdated.code, "BACKEND_OUTDATED");
  const expired = await reason(Response.json({ error: { code: "UNAUTHENTICATED", message: "Please sign in again." } }, { status: 401 }));
  assert.equal(expired.status, 401);
  assert.equal(expired.code, "UNAUTHENTICATED");
});

test("deliberate 4xx messages reach users; framework internals do not", async () => {
  const failure = async (body: unknown, status: number) => {
    try { await readCampusResponse(Response.json(body, { status })); } catch (error) { return error as CampusError; }
    throw new Error("expected a failure");
  };
  assert.equal((await failure({ error: { code: "NO_TEXT", message: "Paste the text instead." } }, 400)).message, "Paste the text instead.");
  assert.equal((await failure({ error: { code: "PT413", message: "Narrow the report to at most 20,000 rows." } }, 413)).message, "Narrow the report to at most 20,000 rows.");
  assert.ok(!(await failure({ error: { code: "FST_ERR_CTP_INVALID_MEDIA_TYPE", message: "internal" } }, 400)).message.includes("internal"));
  assert.ok(!(await failure({ error: { code: "FORBIDDEN", message: "private" } }, 403)).message.includes("private"));
});
