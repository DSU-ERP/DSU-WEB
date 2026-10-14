import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assembleToolCalls,
  normalizeUsage,
  parseToolArguments,
  providerRouting,
  speakable,
  sentences,
  type ToolCallFragment,
} from "../src/lib/friday/protocol";
import { sameOrigin } from "../src/lib/placement/request";

const req = (headers: Record<string, string>) => ({
  headers: { get: (n: string) => headers[n.toLowerCase()] ?? null },
});

test("provider routing pins the provider and disables fallbacks", () => {
  const routing = providerRouting("baseten/fp8");
  assert.deepEqual(routing.only, ["baseten/fp8"]);
  assert.equal(routing.allowFallbacks, false);
  // Rebuilt per call, so a later turn cannot inherit a mutated object.
  const second = providerRouting("baseten/fp8");
  assert.notEqual(routing, second);
  second.only.push("other/provider");
  assert.deepEqual(providerRouting("baseten/fp8").only, ["baseten/fp8"]);
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
