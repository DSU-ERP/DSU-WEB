import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGraph, executedPath, nodeStates, takenEdges, visibleSteps } from "../src/features/admin/lib/graph";
import type { RunDetail, RunStep, Workflow } from "../src/features/admin/lib/types";

const node = (id: string, kind: string, extra: Record<string, unknown> = {}) =>
  ({ id, kind, label: id, purpose: "", inputs: "", outputs: "", functions: [], ...extra }) as Workflow["nodes"][number];
const student: Workflow = {
  id: "student", title: "Student", version: "student-friday-v1", runtime: "", orchestration: "",
  nodes: [
    node("input", "input"), node("identity", "auth"), node("context", "context", { children: ["context.placement"] }),
    node("context.placement", "retrieval", { parent: "context" }), node("route", "route"), node("research.web", "retrieval"),
    node("context.competency", "retrieval"), node("model.limit", "limit"), node("model.call", "model"), node("model.validate", "validate"),
    node("persist", "persist"), node("output", "output"),
  ],
  edges: [
    { from: "input", to: "identity" }, { from: "identity", to: "context" }, { from: "identity", to: "denied", kind: "denied" },
    { from: "context", to: "route" }, { from: "route", to: "persist", kind: "branch" }, { from: "route", to: "research.web", kind: "branch" },
    { from: "research.web", to: "context.competency" }, { from: "context.competency", to: "model.limit" }, { from: "model.limit", to: "model.call" },
    { from: "model.call", to: "model.validate" }, { from: "model.call", to: "failed", kind: "error" }, { from: "model.validate", to: "persist" },
    { from: "persist", to: "output" },
  ],
};
const officer: Workflow = {
  id: "officer", title: "Officer", version: "officer-friday-v1", runtime: "", orchestration: "",
  nodes: [node("input", "input"), node("model.call", "model"), node("tools", "tool", { children: ["tool:find_students", "tool:list_drives"] }),
    node("tool:find_students", "tool", { parent: "tools" }), node("tool:list_drives", "tool", { parent: "tools" }), node("output", "output")],
  edges: [{ from: "input", to: "model.call" }, { from: "model.call", to: "tools", kind: "branch" }, { from: "tools", to: "model.call", kind: "loop" },
    { from: "model.call", to: "output", kind: "branch" }],
};
let clock = Date.parse("2026-11-02T05:00:00Z");
const step = (seq: number, nodeId: string, status: RunStep["status"], extra: Partial<RunStep> = {}): RunStep => {
  clock += 10;
  return { seq, parentSeq: null, node: nodeId, kind: "context", label: nodeId, status, startedAt: new Date(clock).toISOString(),
    endedAt: new Date(clock + 5).toISOString(), durationMs: 5, attempt: 1, errorCategory: null, meta: {}, ...extra };
};
const run = (status: RunDetail["status"], steps: RunStep[]): RunDetail => ({
  id: "r", assistant: "student", workflowVersion: "v1", role: "student", company: null, status, startedAt: steps[0]?.startedAt ?? "",
  endedAt: null, durationMs: 100, errorCategory: null, summary: {}, updatedAt: "", tools: 0, errors: 0, toolNames: [], steps,
});

test("a chat reply lights the real path; skipped steps keep the line but are not counted as executed", () => {
  const steps = [step(1, "input", "completed", { kind: "input" }), step(2, "identity", "completed"), step(3, "context", "completed"),
    step(4, "context.placement", "completed", { parentSeq: 3 }), step(5, "route", "completed"), step(6, "research.web", "skipped"),
    step(7, "context.competency", "skipped"), step(8, "model.limit", "completed"), step(9, "model.call", "completed"),
    step(10, "model.validate", "completed"), step(11, "persist", "completed"), step(12, "output", "completed")];
  const graph = buildGraph(student, { run: run("completed", steps) });
  assert.deepEqual(graph.path, ["input", "identity", "context", "route", "model.limit", "model.call", "model.validate", "persist", "output"]);
  const taken = graph.edges.filter((e) => e.taken && !e.child).map((e) => e.id);
  assert.ok(taken.includes("route->research.web") && taken.includes("context.competency->model.limit"), "through skipped steps");
  assert.ok(!taken.includes("route->persist"), "the greeting branch was not taken");
  const state = (id: string) => graph.nodes.find((n) => n.id === id)!.state;
  assert.deepEqual([state("research.web"), state("model.call"), state("context")], ["skipped", "completed", "completed"]);
  assert.equal(graph.nodes.find((n) => n.id === "failed")!.state, "not_run");
});

test("a greeting takes the short branch and never touches the model", () => {
  const steps = [step(1, "input", "completed", { kind: "input" }), step(2, "identity", "completed"), step(3, "context", "completed"),
    step(4, "route", "completed"), step(5, "research.web", "skipped"), step(6, "model.call", "skipped"), step(7, "persist", "completed"), step(8, "output", "completed")];
  const taken = [...takenEdges(student, executedPath(student, steps))];
  assert.ok(taken.includes("route->persist"));
  assert.ok(!taken.some((e) => e.startsWith("model.")), "no model edges");
});

test("denials and failures end at the terminal node where the check refused", () => {
  const denied = buildGraph(student, { run: run("denied", [step(1, "input", "completed", { kind: "input" }), step(2, "identity", "denied", { errorCategory: "forbidden" })]) });
  assert.equal(denied.nodes.find((n) => n.id === "identity")!.state, "denied");
  assert.ok(denied.edges.find((e) => e.id === "identity->denied")!.taken);
  assert.equal(denied.nodes.find((n) => n.id === "context")!.state, "not_run", "nothing ran after the denial");
  const failed = buildGraph(student, { run: run("failed", [step(1, "input", "completed", { kind: "input" }), step(2, "identity", "completed"),
    step(3, "context", "completed"), step(4, "route", "completed"), step(5, "model.limit", "completed"), step(6, "model.call", "failed", { errorCategory: "timeout" })]) });
  assert.ok(failed.edges.find((e) => e.id === "model.call->failed")!.taken);
  assert.equal(failed.nodes.find((n) => n.id === "failed")!.state, "failed");
});

test("the officer loop counts rounds and nests executed tools under the round", () => {
  const steps = [step(1, "input", "completed", { kind: "input" }), step(2, "model.call", "completed"), step(3, "tools", "completed"),
    step(4, "tool:find_students", "completed", { parentSeq: 3 }), step(5, "model.call", "completed"), step(6, "output", "completed")];
  const graph = buildGraph(officer, { run: { ...run("completed", steps), assistant: "officer" }, expanded: new Set(["tools"]) });
  assert.deepEqual(graph.path, ["input", "model.call", "tools", "model.call", "output"]);
  assert.ok(graph.edges.find((e) => e.id === "tools->model.call")!.taken, "loop edge");
  assert.equal(graph.nodes.find((n) => n.id === "model.call")!.count, 2);
  const children = graph.nodes.filter((n) => n.parent === "tools").map((n) => n.id);
  assert.deepEqual(children, ["tool:find_students"], "only executed tools are listed for a run");
  const architecture = buildGraph(officer, { expanded: new Set(["tools"]) });
  assert.equal(architecture.nodes.filter((n) => n.parent === "tools").length, 2, "every tool in architecture mode");
});

test("replay shows only the steps up to the cursor, the newest as running", () => {
  const steps = [step(1, "input", "completed", { kind: "input" }), step(2, "identity", "completed"), step(3, "context", "completed")];
  const visible = visibleSteps(run("completed", steps), 2);
  assert.deepEqual(visible.map((s) => [s.node, s.status]), [["input", "completed"], ["identity", "running"]]);
  const states = nodeStates(student, visible, false);
  assert.equal(states.get("context")!.state, "pending");
  assert.equal(states.get("identity")!.state, "running");
});

test("expanded tools get their own band and never cover neighbouring steps", () => {
  // Shaped like the officer graph: the round limit and the answer share the
  // tool round's row, and saving sits on the row below.
  const tools = Array.from({ length: 12 }, (_, i) => node(`tool:t${i}`, "tool", { parent: "tools" }));
  const wide: Workflow = {
    ...officer,
    nodes: [node("input", "input"), node("model.call", "model"), node("tools", "tool", { children: tools.map((t) => t.id) }), ...tools,
      node("loop.limit", "guard"), node("output", "output"), node("persist", "persist")],
    edges: [{ from: "input", to: "model.call" }, { from: "model.call", to: "tools", kind: "branch" }, { from: "tools", to: "model.call", kind: "loop" },
      { from: "model.call", to: "output", kind: "branch" }, { from: "model.call", to: "loop.limit", kind: "error" }, { from: "output", to: "persist" }],
  };
  const steps = [step(1, "input", "completed", { kind: "input" }), step(2, "model.call", "completed"), step(3, "tools", "completed"),
    step(4, "tool:t0", "completed", { parentSeq: 3 }), step(5, "tool:t1", "completed", { parentSeq: 3 }), step(6, "model.call", "completed"),
    step(7, "output", "completed"), step(8, "persist", "completed")];
  // Rendered nodes are 13.5rem wide (children 12.5rem); a parent with its toggle is the tallest.
  const box = (n: { x: number; y: number; childCount: number; parent?: string }) => ({ x: n.x, y: n.y, w: n.parent ? 200 : 216, h: n.childCount ? 118 : 84 });
  for (const graph of [buildGraph(wide, { expanded: new Set(["tools"]) }),
    buildGraph(wide, { run: { ...run("completed", steps), assistant: "officer" }, expanded: new Set(["tools"]) })]) {
    const boxes = graph.nodes.map((n) => ({ id: n.id, ...box(n) }));
    for (const [i, a] of boxes.entries())
      for (const b of boxes.slice(i + 1))
        assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, `${a.id} overlaps ${b.id}`);
    const round = graph.nodes.find((n) => n.id === "tools")!;
    assert.ok(graph.nodes.filter((n) => n.parent === "tools").every((n) => n.y > round.y), "tools are listed below their round");
  }
});
