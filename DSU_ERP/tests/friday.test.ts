import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assembleToolCalls,
  normalizeUsage,
  parseToolArguments,
  providerRouting,
  parseProviders,
  speakable,
  sentences,
  explainUpstream,
  openRouterProviderBody,
  upstreamFailure,
  parseProfileLink,
  profileLink,
  MAX_PROFILE_LINKS,
  type ToolCallFragment,
} from "../src/features/assistant/lib/protocol";
import { sameOrigin } from "../src/features/placement/lib/request";

const req = (headers: Record<string, string>) => ({
  headers: { get: (n: string) => headers[n.toLowerCase()] ?? null },
});

test("provider routing tries the listed providers in order and nothing else", () => {
  const routing = providerRouting(["baseten/fp8", "deepinfra/fp8"]);
  assert.deepEqual(routing.order, ["baseten/fp8", "deepinfra/fp8"]);
  // only restricts eligibility to the same list, so no other provider is used.
  assert.deepEqual(routing.only, ["baseten/fp8", "deepinfra/fp8"]);
  assert.equal(routing.allowFallbacks, false);
  // Rebuilt per call, so a later turn cannot inherit a mutated object.
  const second = providerRouting(["baseten/fp8"]);
  second.only.push("other/provider");
  assert.deepEqual(providerRouting(["baseten/fp8"]).only, ["baseten/fp8"]);
});

test("provider setting parses an ordered, de-duplicated list", () => {
  const fallback = ["baseten/fp8", "deepinfra/fp8"];
  assert.deepEqual(parseProviders(undefined, fallback), fallback);
  assert.deepEqual(parseProviders("  ", fallback), fallback);
  assert.deepEqual(parseProviders("baseten/fp8", fallback), ["baseten/fp8"]);
  assert.deepEqual(
    parseProviders(" deepinfra/fp8 , baseten/fp8,,deepinfra/fp8 ", fallback),
    ["deepinfra/fp8", "baseten/fp8"],
  );
  // The fallback array is never shared, so callers cannot mutate the default.
  const parsed = parseProviders(undefined, fallback);
  parsed.push("x");
  assert.deepEqual(fallback, ["baseten/fp8", "deepinfra/fp8"]);
});

test("fragmented tool-call arguments reassemble in arrival order", () => {
  // A realistic split: name arrives first, JSON arrives a few characters
  // at a time, and the id only appears on the opening fragment.
  const fragments: ToolCallFragment[] = [
    { index: 0, id: "call_1", function: { name: "rank_" } },
    { index: 0, function: { name: "students" } },
    { index: 0, function: { arguments: '{"bat' } },
    { index: 0, function: { arguments: 'ch":"20' } },
    { index: 0, function: { arguments: '28","limit":5}' } },
  ];
  const calls = assembleToolCalls(fragments);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].id, "call_1");
  assert.equal(calls[0].name, "rank_students");
  const parsed = parseToolArguments(calls[0].args);
  assert.ok(parsed.ok);
  assert.deepEqual(parsed.args, { batch: "2028", limit: 5 });
});

test("parallel tool calls stay separated by index", () => {
  const calls = assembleToolCalls([
    { index: 0, id: "a", function: { name: "batch_summary", arguments: "{}" } },
    { index: 1, id: "b", function: { name: "list_" } },
    { index: 0, function: { arguments: "" } },
    { index: 1, function: { name: "drives", arguments: '{"status":"upcoming"}' } },
  ]);
  assert.equal(calls.length, 2);
  assert.deepEqual(
    calls.map((c) => c.name).sort(),
    ["batch_summary", "list_drives"],
  );
});

test("tool calls missing an id or name are discarded", () => {
  const calls = assembleToolCalls([
    { index: 0, function: { name: "orphan", arguments: "{}" } },
    { index: 1, id: "has-id", function: { arguments: "{}" } },
    { index: 2, id: "ok", function: { name: "batch_summary", arguments: "{}" } },
  ]);
  assert.deepEqual(calls.map((c) => c.name), ["batch_summary"]);
});

test("malformed tool arguments are rejected rather than guessed", () => {
  assert.equal(parseToolArguments('{"batch":').ok, false);
  assert.equal(parseToolArguments("[1,2,3]").ok, false);
  assert.equal(parseToolArguments('"a string"').ok, false);
  assert.equal(parseToolArguments("null").ok, false);
  // An empty fragment is a legitimate no-argument call.
  const empty = parseToolArguments("");
  assert.ok(empty.ok);
  assert.deepEqual(empty.args, {});
});

test("missing usage is reported as unavailable, never as zero", () => {
  assert.deepEqual(normalizeUsage({}), {
    promptTokens: null,
    completionTokens: null,
    totalTokens: null,
  });
  assert.deepEqual(
    normalizeUsage({ promptTokens: 10, completionTokens: null, totalTokens: NaN }),
    { promptTokens: 10, completionTokens: null, totalTokens: null },
  );
  // A real zero is preserved and distinguishable from absence.
  assert.equal(normalizeUsage({ promptTokens: 0 }).promptTokens, 0);
});

test("spoken text drops Markdown, code and raw URLs", () => {
  const source = [
    "## Batch 2028",
    "The cohort has **2,104** students.",
    "See [the report](https://example.edu/placement/batch) for detail.",
    "`SELECT 1`",
    "```\nraw block\n```",
    "| col | col |",
  ].join("\n");
  const out = speakable(source);
  assert.ok(!out.includes("#"), "heading marks removed");
  assert.ok(!out.includes("**"), "emphasis removed");
  assert.ok(!out.includes("https://"), "urls removed");
  assert.ok(!out.includes("raw block"), "code fence content removed");
  assert.ok(!out.includes("|"), "table pipes removed");
  assert.ok(out.includes("2,104"), "figures preserved");
  assert.ok(out.includes("the report"), "link text preserved");
});

test("speech is queued as whole sentences in order", () => {
  const parts = sentences(
    "The 2028 batch has 2,104 students. Of those, 1,520 are eligible! Shall I break it down by branch?",
  );
  assert.equal(parts.length, 3);
  assert.ok(parts[0].endsWith("."));
  assert.ok(parts[1].endsWith("!"));
  assert.ok(parts[2].endsWith("?"));
  assert.ok(parts[0].startsWith("The 2028 batch"));
});

test("speakable output is safe for an empty or symbol-only reply", () => {
  assert.equal(speakable(""), "");
  assert.equal(speakable("***"), "");
  assert.equal(speakable("https://example.edu"), "");
  assert.deepEqual(sentences(""), []);
});

test("the loopback host and localhost are treated as the same origin", () => {
  // The reported failure: the browser addressed 127.0.0.1:3108 while the
  // framework rebuilt the request URL as localhost, producing a false
  // "Invalid request origin" on a legitimate request.
  assert.equal(
    sameOrigin(
      req({ origin: "http://127.0.0.1:3108", host: "127.0.0.1:3108" }),
    ),
    true,
  );
  assert.equal(
    sameOrigin(req({ origin: "http://localhost:3002", host: "localhost:3002" })),
    true,
  );
  assert.equal(
    sameOrigin(
      req({ origin: "https://dsu-erp-web.onrender.com", host: "dsu-erp-web.onrender.com" }),
    ),
    true,
  );
});

test("a genuine cross-site or malformed origin is still rejected", () => {
  assert.equal(
    sameOrigin(req({ origin: "https://evil.example", host: "localhost:3000" })),
    false,
  );
  // Same host, different port is a different origin.
  assert.equal(
    sameOrigin(req({ origin: "http://localhost:3001", host: "localhost:3000" })),
    false,
  );
  assert.equal(sameOrigin(req({ host: "localhost:3000" })), false);
  assert.equal(sameOrigin(req({ origin: "http://localhost:3000" })), false);
  assert.equal(sameOrigin(req({ origin: "not a url", host: "localhost:3000" })), false);
});

test("conversation context is carried so replies are contextual", () => {
  // The turns the officer can see become the model's context. Only completed
  // turns with real content qualify; a streaming or interrupted turn must not
  // be presented as something the assistant actually said.
  type T = { role: "user" | "assistant"; content: string; state: string };
  const turns: T[] = [
    { role: "user", content: "Summarise the 2028 batch", state: "complete" },
    { role: "assistant", content: "2,104 students are recorded.", state: "complete" },
    { role: "user", content: "How many are eligible?", state: "complete" },
    { role: "assistant", content: "half-written", state: "interrupted" },
    { role: "assistant", content: "", state: "streaming" },
  ];
  const context = turns
    .filter((t) => t.state === "complete" && t.content.trim())
    .map((t) => ({ role: t.role, content: t.content }));
  assert.equal(context.length, 3);
  assert.deepEqual(context.map((c) => c.role), ["user", "assistant", "user"]);
  assert.ok(!context.some((c) => c.content === "half-written"));
});

test("an upstream failure is described rather than hidden, with keys scrubbed", () => {
  const scrub = (raw: string) =>
    raw
      .replace(/sk-or-v1-[A-Za-z0-9_-]+/g, "[redacted key]")
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
      .slice(0, 400);
  // A credential must never be echoed back to the browser.
  assert.equal(
    scrub("401 Unauthorized: key sk-or-v1-abc123DEF456 is invalid"),
    "401 Unauthorized: key [redacted key] is invalid",
  );
  // Whichever pattern matches first, no raw credential may survive.
  for (const raw of [
    "header Bearer sk-or-v1-zzz rejected",
    "Authorization: Bearer abc.def-123 was refused",
    "no credential here at all",
  ]) {
    const out = scrub(raw);
    assert.ok(!out.includes("sk-or-v1-zzz"), `key leaked from: ${raw}`);
    assert.ok(!/Bearer\s+[A-Za-z0-9._-]+/.test(out), `bearer leaked from: ${raw}`);
  }
  // The actionable part of the message survives.
  assert.ok(scrub("402 Insufficient credits").includes("Insufficient credits"));
});

test("upstream failures are explained in plain language, not SDK class names", () => {
  // The exact body Baseten returned on 2026-10-15 for the reported failure.
  const shared = JSON.stringify({
    error: {
      message: "Provider returned error",
      code: 429,
      metadata: {
        provider_name: "BaseTen",
        is_byok: false,
        limit_source: "upstream_provider_shared_pool",
      },
    },
  });
  const msg = explainUpstream(429, shared, "baseten/fp8");
  assert.match(msg, /baseten\/fp8/);
  assert.match(msg, /shared limit/);
  assert.match(msg, /not a problem with this account/);
  assert.ok(!msg.includes("TooManyRequests"));

  // A 429 without the shared-pool marker reads as ordinary rate limiting.
  assert.match(explainUpstream(429, "{}", "baseten/fp8"), /rate-limiting/);
  // An HTML error page never breaks the explanation.
  assert.match(explainUpstream(503, "<html>Bad gateway</html>", "x"), /did not respond/);
  assert.match(explainUpstream(402, "", "x"), /run out of credit/);
  assert.match(explainUpstream(401, "", "x"), /key was rejected/);
});

test("SDK errors are recognised even when the class was loaded twice", () => {
  // Simulates a bundler loading the SDK's error classes a second time: the
  // class is unrelated to the one imported elsewhere, so instanceof fails,
  // but the status and body are what the explanation needs.
  class UnauthorizedResponseError extends Error {
    statusCode = 401;
    body = '{"error":{"message":"User not found.","code":401}}';
  }
  const found = upstreamFailure(new UnauthorizedResponseError("User not found."));
  assert.deepEqual(found?.status, 401);
  assert.match(explainUpstream(found!.status, found!.body, "baseten/fp8"), /key was rejected/);

  // Ordinary failures are not mistaken for upstream HTTP errors.
  assert.equal(upstreamFailure(new Error("socket hang up")), null);
  assert.equal(upstreamFailure({ statusCode: 401, body: "" }), null);
  assert.equal(upstreamFailure("401"), null);
});

const PID = "00000000-0000-4000-8000-0000000000a1";
const okLink = {
  type: "profile_link",
  id: PID,
  usn: "1DS23CS001",
  name: "Synthetic Student",
  url: `/placement/students/${PID}`,
};

test("profile links are built by the server from a UUID, never from free text", () => {
  assert.deepEqual(profileLink({ id: PID.toUpperCase(), usn: " T01 ", name: "A  B" }), {
    id: PID,
    usn: "T01",
    name: "A B",
    url: `/placement/students/${PID}`,
  });
  for (const id of ["", "x", "../admin", `${PID}/edit`, 42, null])
    assert.equal(profileLink({ id, usn: "T01", name: "A" }), null, String(id));
  assert.equal(profileLink({ id: PID, usn: "", name: "A" }), null);
  assert.equal(profileLink({ id: PID, usn: "T01", name: 7 }), null);
  assert.equal(profileLink({ id: PID, usn: "T01", name: "x".repeat(201) }), null);
  assert.equal(MAX_PROFILE_LINKS, 3);
});

test("profile_link events are strictly validated", () => {
  assert.deepEqual(parseProfileLink(okLink), {
    id: PID,
    usn: "1DS23CS001",
    name: "Synthetic Student",
    url: `/placement/students/${PID}`,
  });
  const bad: unknown[] = [
    null,
    "profile_link",
    [okLink],
    { ...okLink, type: "text_delta" },
    { ...okLink, id: "not-a-uuid", url: "/placement/students/not-a-uuid" },
    { ...okLink, url: "https://evil.example/placement/students/" + PID },
    { ...okLink, url: "//evil.example/" + PID },
    { ...okLink, url: `/student/${PID}` },
    { ...okLink, url: `/placement/students/${PID}/edit` },
    { ...okLink, url: `/placement/students/${PID}?x=1` },
    { ...okLink, url: "javascript:alert(1)" },
    // The URL must match the id exactly.
    { ...okLink, url: "/placement/students/00000000-0000-4000-8000-0000000000b2" },
    // Upper-case ids are never emitted by the server.
    { ...okLink, id: PID.toUpperCase(), url: `/placement/students/${PID.toUpperCase()}` },
    { ...okLink, usn: "" },
    { ...okLink, name: { text: "x" } },
    { ...okLink, extra: "field" },
    { type: "profile_link", id: PID, usn: "T01", name: "A" },
  ];
  for (const event of bad) assert.equal(parseProfileLink(event), null, JSON.stringify(event));
});

test("raw OpenRouter routing uses snake_case and never allows fallbacks", () => {
  assert.deepEqual(openRouterProviderBody(["baseten/fp8", "deepinfra/fp8"]), {
    order: ["baseten/fp8", "deepinfra/fp8"],
    only: ["baseten/fp8", "deepinfra/fp8"],
    allow_fallbacks: false,
  });
});

test("OpenAI-compatible client errors are explained like SDK errors", () => {
  // LangChain's ChatOpenAI raises the OpenAI client's APIError shape.
  class APIError extends Error {
    status = 429;
    error = { message: "Rate limited", metadata: { limit_source: "upstream_provider_shared_pool" } };
    headers = {};
  }
  const found = upstreamFailure(new APIError("429 Rate limited"));
  assert.equal(found?.status, 429);
  assert.match(explainUpstream(found!.status, found!.body, "baseten/fp8"), /out of capacity/);
  // A plain object or an error without the client shape is not mistaken for one.
  assert.equal(upstreamFailure({ status: 429, error: {} }), null);
  assert.equal(upstreamFailure(Object.assign(new Error("x"), { status: 500 })), null);
});
