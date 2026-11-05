// Admin portal Agent Workflow page: real components (React Flow canvas,
// panels, replay, live polling) with clearly synthetic, local-only runs. The
// student and company graphs are the backend's real workflow definitions.
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { pathToFileURL } = require("node:url");
const assert = require("node:assert/strict");
const { build } = require("esbuild");
const { chromium } = require("@playwright/test");
const root = process.cwd(), dir = path.join(root, ".qa/agent-workflow-ui");
fs.mkdirSync(dir, { recursive: true });
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

let t = Date.parse("2026-11-02T06:00:00Z");
const s = (seq, node, kind, status, extra = {}) => {
  const start = (t += 37);
  const dur = extra.dur ?? (status === "skipped" ? 0 : 20 + (seq * 13) % 90);
  t += dur;
  return { seq, parentSeq: extra.parent ?? null, node, kind, label: extra.label ?? node, status, startedAt: new Date(start).toISOString(),
    endedAt: new Date(start + dur).toISOString(), durationMs: dur, attempt: 1, errorCategory: extra.error ?? null, meta: extra.meta ?? {} };
};
const run = (n, assistant, status, steps, extra = {}) => ({
  id: id(n), assistant, workflowVersion: `${assistant}-friday-v1`, role: extra.role ?? assistant, company: extra.company ?? null, status,
  startedAt: steps[0].startedAt, endedAt: status === "running" ? null : steps.at(-1).endedAt,
  durationMs: status === "running" ? null : Date.parse(steps.at(-1).endedAt) - Date.parse(steps[0].startedAt),
  errorCategory: extra.errorCategory ?? null, summary: {}, updatedAt: steps.at(-1).endedAt, tools: steps.filter((x) => x.kind === "tool" && x.node !== "tools").length,
  errors: steps.filter((x) => ["failed", "denied"].includes(x.status)).length, toolNames: [], steps,
});
const runs = [
  run(1, "student", "completed", [s(1, "input", "input", "completed", { meta: { chars: 42 } }), s(2, "identity", "auth", "completed"), s(3, "context", "context", "completed"),
    s(4, "context.placement", "retrieval", "completed", { parent: 3, meta: { detail: "full", drives: 2 } }), s(5, "route", "route", "completed", { meta: { decision: "chat_reply" } }),
    s(6, "research.web", "retrieval", "skipped", { meta: { reason: "not_requested" } }), s(7, "context.competency", "retrieval", "skipped"),
    s(8, "model.limit", "limit", "completed"), s(9, "model.call", "model", "completed", { dur: 2400, meta: { model: "deepseek/deepseek-v4.1-flash", tokensIn: 1830, tokensOut: 212 } }),
    s(10, "model.validate", "validate", "completed"), s(11, "persist", "persist", "completed"), s(12, "output", "output", "completed")]),
  run(2, "student", "denied", [s(1, "input", "input", "completed"), s(2, "identity", "auth", "denied", { error: "forbidden" })], { role: "none", errorCategory: "forbidden" }),
  run(3, "student", "failed", [s(1, "input", "input", "completed"), s(2, "identity", "auth", "completed"), s(3, "context", "context", "completed"),
    s(4, "route", "route", "completed"), s(5, "model.limit", "limit", "completed"), s(6, "model.call", "model", "failed", { error: "timeout" })], { errorCategory: "timeout" }),
  run(4, "officer", "completed", [s(1, "input", "input", "completed"), s(2, "identity", "auth", "completed"), s(3, "limit", "limit", "completed"), s(4, "context", "context", "completed"),
    s(5, "model.call", "model", "completed", { label: "Model call 1", meta: { iteration: 1, toolCalls: 2, decision: "call_tools" } }), s(6, "tools", "tool", "completed", { label: "Tool round 1" }),
    s(7, "tool:pending_reviews", "tool", "completed", { parent: 6, label: "Checking drive requests", meta: { tool: "pending_reviews" } }),
    s(8, "tool:list_drives", "tool", "failed", { parent: 6, label: "Retrieving recruitment drives", error: "timeout", meta: { tool: "list_drives" } }),
    s(9, "model.call", "model", "completed", { label: "Model call 2", meta: { iteration: 2, toolCalls: 0, decision: "answer" } }), s(10, "output", "output", "completed"), s(11, "persist", "persist", "completed")]),
];
// A run that progresses while the page is open (live updates).
const liveSteps = [s(1, "input", "input", "completed"), s(2, "identity", "auth", "completed"), s(3, "context", "context", "completed"), s(4, "route", "route", "completed"),
  s(5, "model.limit", "limit", "completed"), s(6, "model.call", "model", "completed"), s(7, "model.validate", "validate", "completed"), s(8, "persist", "persist", "completed"), s(9, "output", "output", "completed")];
let liveCalls = 0;
const liveRun = () => {
  liveCalls++;
  const done = liveCalls > 3;
  const steps = done ? liveSteps : liveSteps.slice(0, 5).map((x, i) => (i === 4 ? { ...x, status: "running", endedAt: null, durationMs: null } : x));
  return { ...run(9, "student", done ? "completed" : "running", done ? liveSteps : liveSteps.slice(0, 5)), steps, startedAt: new Date(Date.now() - 1000).toISOString(), updatedAt: String(liveCalls) };
};
let liveVisible = false;
const summary = (r) => ({ ...r, steps: r.steps.length });

(async () => {
  const backend = await import(pathToFileURL(path.join(root, "..", "..", "DSU-Backend", "src", "modules", "ops", "workflows.js")).href);
  // The officer graph comes from the web app's compiled LangGraph (engine.ts).
  const officerOut = path.join(dir, "officer-workflow.cjs");
  await build({ absWorkingDir: root, entryPoints: ["src/features/admin/lib/officer-workflow.ts"], bundle: true, platform: "node", format: "cjs", outfile: officerOut,
    logLevel: "silent", packages: "external", plugins: [{ name: "boundaries", setup(b) {
      const stub = { "server-only": "module.exports={};", "@/shared/http/backend": "module.exports={backendApi:async()=>{throw new Error('unused')}};",
        "@/features/placement/lib/server": "module.exports={placementRead:async()=>{throw new Error('unused')}};" };
      b.onResolve({ filter: /.*/ }, (a) => (stub[a.path] ? { path: a.path, namespace: "stub" } : undefined));
      b.onLoad({ filter: /.*/, namespace: "stub" }, (a) => ({ contents: stub[a.path], loader: "js" }));
    } }] });
  const officer = require(officerOut).officerWorkflow();
  const workflows = { student: backend.WORKFLOWS.student, company: backend.WORKFLOWS.company, officer };
  const list = (assistant) => {
    const rows = [...(liveVisible && assistant === "student" ? [liveRun()] : []), ...runs.filter((r) => r.assistant === assistant)].map(summary);
    return { rows, counts: { total: rows.length, running: 0, completed: 0, failed: 0, denied: 0, byAssistant: { student: 0, officer: 0, company: 0 }, medianMs: null },
      tools: assistant === "officer" ? ["list_drives", "pending_reviews"] : [], serverTime: new Date().toISOString() };
  };
  const entry = `import React from 'react';import {createRoot} from 'react-dom/client';
import {AdminShell} from '@/features/admin/components/AdminShell';
import {AgentWorkflow} from '@/features/admin/components/AgentWorkflow';
const workflows=${JSON.stringify(workflows)};const initial=${JSON.stringify(list("student"))};
createRoot(document.getElementById('root')).render(<AdminShell member="admin@fixture.invalid"><AgentWorkflow workflows={workflows} initialRuns={initial} initialRun={null} initialAssistant="student"/></AdminShell>);`;
  const mocks = {
    ...require("./harness-server-mocks.cjs"),
    "next/link": `import React from 'react';export default function Link({children,prefetch,scroll,...props}){return <a {...props}>{children}</a>}`,
    "next/navigation": `const router={push:()=>{},replace:()=>{},refresh:()=>{}};export const useRouter=()=>router;export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);`,
    "@/app/login/actions": `export async function signOut(){}`,
  };
  const css = "*{box-sizing:border-box}body,h1,h2,h3,p,dl,dd{margin:0}a{color:inherit}button{cursor:pointer}" + [
    "src/app/globals.css", "src/app/workspace.css", "src/app/placement/placement.css", "src/app/placement/company-portal.css", "src/app/company/company.css", "src/app/admin/admin.css",
  ].map((p) => fs.readFileSync(p, "utf8").replace('@import "tailwindcss";', "")).join("\n");
  let browser, server;
  try {
    await build({ stdin: { contents: entry, resolveDir: root, loader: "tsx" }, bundle: true, outfile: path.join(dir, "bundle.js"), platform: "browser", jsx: "automatic",
      define: { "process.env.NODE_ENV": '"development"' }, loader: { ".css": "css" },
      plugins: [{ name: "boundaries", setup(b) { b.onResolve({ filter: /.*/ }, (a) => (mocks[a.path] ? { path: a.path, namespace: "mock" } : undefined)); b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({ contents: mocks[a.path], loader: "tsx", resolveDir: root })); } }] });
    server = http.createServer((req, res) => {
      const url = new URL(req.url, "http://x");
      const send = (data, status = 200) => { res.statusCode = status; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(status < 400 ? { data } : { error: data })); };
      if (url.pathname === "/admin/api/agent-runs") return send(list(url.searchParams.get("assistant") || "student"));
      const m = url.pathname.match(/^\/admin\/api\/agent-runs\/(.+)$/);
      if (m) return m[1] === id(9) ? send(liveRun()) : send(runs.find((r) => r.id === m[1]) || "Not found", runs.some((r) => r.id === m[1]) ? 200 : 404);
      if (url.pathname === "/bundle.js") { res.setHeader("Content-Type", "text/javascript"); return res.end(fs.readFileSync(path.join(dir, "bundle.js"))); }
      if (url.pathname === "/bundle.css") { res.setHeader("Content-Type", "text/css"); return res.end(fs.readFileSync(path.join(dir, "bundle.css"))); }
      if (/^\/fonts\/[a-z0-9.-]+\.woff2$/.test(url.pathname)) { res.setHeader("Content-Type", "font/woff2"); return res.end(fs.readFileSync(path.join(root, "public", url.pathname))); }
      res.setHeader("Content-Type", "text/html");
      res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/bundle.css"><style>${css}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`);
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ headless: true, ...(process.platform === "win32" ? { channel: "msedge" } : {}) });
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
    const open = async () => { await page.goto(origin + "/admin/agent-workflow"); await page.locator(".aw-node").first().waitFor(); await page.evaluate(() => document.fonts.ready); };
    const node = (nid) => page.locator(`.aw-node[data-node="${nid}"]`);
    const text = () => page.evaluate(() => document.body.innerText);
    const chooseRun = async (n) => { await page.getByLabel("Choose a recorded run").selectOption(id(n)); await page.locator(".aw-summary").waitFor(); };

    // Architecture: the student's compiled LangGraph, one box per graph node.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await open();
    const topLevel = workflows.student.nodes.filter((n) => !n.parent).map((n) => n.id).sort();
    assert.deepEqual(await page.locator(".aw-node").evaluateAll((els) => els.map((e) => e.dataset.node).sort()), topLevel, "exactly the graph's nodes");
    assert.ok(topLevel.includes("__start__") && topLevel.includes("reply") && topLevel.includes("__end__"));
    await node("prepare").click();
    const archPanel = await page.locator(".aw-panel").innerText();
    assert.ok(archPanel.includes("row-level security") && archPanel.includes("LangGraph node: prepare"), "panel shows the node's metadata");
    assert.ok(await page.getByRole("button", { name: /zoom in/i }).isVisible(), "zoom controls");
    await node("prepare").getByRole("button", { name: /3 steps/ }).click();
    await node("context.placement").waitFor();
    await node("prepare").getByRole("button", { name: "Collapse" }).click();
    assert.equal(await node("context.placement").count(), 0, "collapse hides nested steps");
    assert.ok(await page.locator(".react-flow__edge-text", { hasText: "greeting or no resume for a drive" }).count(), "branch label from the path map");

    // A completed run: executed path, skipped branches, timeline, tokens.
    await page.getByRole("tab", { name: "Execution" }).click();
    await chooseRun(1);
    assert.match(await node("model.call").getAttribute("class"), /aw-state-completed/);
    assert.match(await node("research").getAttribute("class"), /aw-state-skipped/);
    assert.match(await node("reply").getAttribute("class"), /aw-state-not_run/);
    assert.match(await node("__end__").getAttribute("class"), /aw-state-completed/);
    assert.equal(await page.locator(".aw-timeline li").count(), 12);
    assert.ok((await node("context.placement").count()) === 1, "a group with executed children opens automatically");
    assert.ok((await page.locator(".react-flow__edge.is-taken").count()) >= 8, "taken edges highlighted");
    assert.ok((await text()).includes("1830 in, 212 out"));
    await node("model.call").click();
    const panel = await page.locator(".aw-panel").innerText();
    assert.ok(/Duration\s+2\.40 s/.test(panel) && panel.includes("Next executed"), "real timing and the next executed step");

    // Denied and failed runs end where the real check refused or failed.
    await chooseRun(2);
    assert.match(await node("identity").getAttribute("class"), /aw-state-denied/);
    assert.match(await node("prepare").getAttribute("class"), /aw-state-denied/);
    assert.match(await node("route").getAttribute("class"), /aw-state-not_run/);
    assert.match(await node("__end__").getAttribute("class"), /aw-state-not_run/);
    assert.ok((await page.locator(".aw-side").innerText()).includes("Authorization denied"));
    await chooseRun(3);
    assert.match(await node("model.call").getAttribute("class"), /aw-state-failed/);
    assert.match(await node("model").getAttribute("class"), /aw-state-failed/);
    assert.ok((await page.locator(".aw-side").innerText()).includes("timeout"));

    // Replay steps through the recorded order.
    await chooseRun(1);
    await page.getByRole("button", { name: "Next step" }).isDisabled();
    await page.getByRole("button", { name: "Play replay" }).click();
    await page.getByText(/Step [3-9] of 12/).waitFor();
    await page.getByRole("button", { name: "Pause replay" }).click();
    assert.ok((await page.locator(".aw-node.aw-state-pending").count()) > 0, "steps after the cursor are pending");
    await page.getByRole("button", { name: "Reset to the full run" }).click();
    assert.ok(await page.getByText("Full run").isVisible());

    // Officer loop: the compiled agent ⇄ tools graph, two model rounds, a failed tool.
    await page.getByRole("tab", { name: "Placement Officer" }).click();
    await page.getByLabel("Choose a recorded run").selectOption(id(4));
    await node("tool:list_drives").waitFor();
    assert.ok(await node("round_limit").count(), "the graph's round limit node");
    assert.match(await node("agent").innerText(), /2 times/, "both model rounds recorded on the agent node");
    assert.equal(await node("tool:find_students").count(), 0, "tools that did not run are not shown in a run");
    assert.match(await node("tool:list_drives").getAttribute("class"), /aw-state-failed/);
    assert.ok(await page.locator(".react-flow__edge.is-taken.aw-edge-loop").count(), "loop edge taken");
    assert.deepEqual(await page.locator(".aw-side .aw-list code").allInnerTexts(), ["pending_reviews", "list_drives"]);

    // Live: a new run appears, is followed, and moves from running to completed.
    await page.getByRole("tab", { name: "Student" }).click();
    await page.getByLabel("Follow newest run").check();
    liveVisible = true;
    await page.locator('.aw-summary .aw-status-running').waitFor({ timeout: 10000 });
    assert.match(await node("model.limit").getAttribute("class"), /aw-state-running|aw-state-completed/);
    await page.locator('.aw-summary .aw-status-completed').waitFor({ timeout: 15000 });
    assert.match(await node("output").getAttribute("class"), /aw-state-completed/);
    await page.getByLabel("Follow newest run").uncheck();

    // Layout in both themes, desktop to phone.
    for (const theme of ["light", "dark"]) for (const width of [1440, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate((th) => localStorage.setItem("dsu-admin-theme", th), theme);
      await open();
      await page.locator(".po-" + theme).first().waitFor();
      await page.getByRole("tab", { name: "Execution" }).click();
      await chooseRun(1);
      await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow ${theme} ${width}`);
      assert.equal((await text()).includes("—"), false, "no em dash");
      await page.screenshot({ path: path.join(dir, `agent-workflow-${theme}-${width}.png`), fullPage: true });
    }
    assert.deepEqual(errors.filter((e) => !/favicon|Failed to load resource/.test(e)), []);
    console.log(JSON.stringify({
      passed: true, widths: [1440, 1024, 768, 390], themes: ["light", "dark"],
      checks: ["compiled LangGraph nodes rendered (student, officer)", "node panel shows graph metadata", "path-map branch labels", "zoom controls and expand/collapse",
        "executed, skipped and not-run states", "taken edges and loop edge", "End reached on completion", "timeline and token counts", "denied and failed nodes",
        "replay cursor and reset", "officer tools nested and failed tool shown",
        "live run followed from running to completed", "no overflow or em dashes", "no browser errors"],
      screenshots: dir, data: "synthetic local runs; no database access",
    }));
  } finally {
    await browser?.close();
    server?.close();
  }
})().catch((error) => { console.error(error); process.exit(1); });
