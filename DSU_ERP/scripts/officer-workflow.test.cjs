const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');

// The officer diagram on the Agent Workflow page is drawn from the compiled
// LangGraph in engine.ts. Only the database and backend boundaries are mocked;
// no model is contacted and no API key is set.
const root = path.resolve(__dirname, '..');
const outfile = path.join(root, '.qa', 'officer-workflow.bundle.cjs');
const MOCKED = new Set(['server-only', '@/features/placement/lib/server', '@/shared/http/backend']);
const bundled = build({
  absWorkingDir: root, entryPoints: ['src/features/admin/lib/officer-workflow.ts'], bundle: true, platform: 'node', format: 'cjs',
  outfile, logLevel: 'silent', packages: 'external',
  plugins: [{
    name: 'mock-boundaries',
    setup(b) {
      b.onResolve({ filter: /.*/ }, (a) => (MOCKED.has(a.path) ? { path: a.path, namespace: 'mock' } : undefined));
      b.onLoad({ filter: /.*/, namespace: 'mock' }, (a) => ({
        loader: 'js',
        contents: a.path === 'server-only' ? 'module.exports = {};'
          : a.path === '@/shared/http/backend' ? 'module.exports = { backendApi: async () => { throw new Error("not used"); } };'
          : 'module.exports = { placementRead: async () => { throw new Error("not used"); } };',
      }));
    },
  }],
});

let mod;
before(async () => {
  await bundled;
  delete process.env.OPENROUTER_API_KEY;
  mod = require(outfile);
});
after(() => fs.rmSync(outfile, { force: true }));

const sortedEdges = (edges) => edges.map((e) => `${e.from}->${e.to}`).sort();

test('the officer diagram is the compiled LangGraph and builds without credentials', () => {
  const workflow = mod.officerWorkflow();
  const top = workflow.nodes.filter((n) => !n.parent).map((n) => n.id).sort();
  assert.deepEqual(top, ['__end__', '__start__', 'agent', 'round_limit', 'tools']);
  assert.deepEqual(sortedEdges(workflow.edges), ['__start__->agent', 'agent->__end__', 'agent->round_limit', 'agent->tools', 'round_limit->__end__', 'tools->agent']);
  const kinds = Object.fromEntries(workflow.edges.map((e) => [`${e.from}->${e.to}`, [e.kind ?? 'flow', e.condition ?? '']]));
  assert.deepEqual(kinds['tools->agent'], ['loop', '']);
  assert.deepEqual(kinds['agent->tools'], ['branch', 'model requested tools']);
  assert.deepEqual(kinds['agent->__end__'], ['branch', 'model answered']);
  assert.match(kinds['agent->round_limit'][1], /^\d+ tool rounds used$/);
  assert.equal(workflow.version, 'officer-friday-v3');
  assert.match(workflow.orchestration, /^LangGraph state graph with LangChain ChatOpenAI/);
});

test('recorded officer steps are nested under the graph node, Start or End where they run', () => {
  const workflow = mod.officerWorkflow();
  const parent = Object.fromEntries(workflow.nodes.filter((n) => n.parent).map((n) => [n.id, n.parent]));
  for (const id of ['input', 'identity', 'limit', 'context']) assert.equal(parent[id], '__start__', id);
  for (const id of ['output', 'persist']) assert.equal(parent[id], '__end__', id);
  // A node that records one step under another name owns it, with no nested box.
  const records = Object.fromEntries(workflow.nodes.filter((n) => n.records).map((n) => [n.id, n.records]));
  assert.deepEqual(records, { agent: ['model.call'], round_limit: ['loop.limit'] });
  assert.equal(parent['model.call'], undefined);
  const tools = workflow.nodes.filter((n) => n.parent === 'tools');
  assert.ok(tools.length > 0 && tools.every((n) => n.id.startsWith('tool:')), 'each tool is a step of the tools node');
  assert.equal(new Set(workflow.nodes.map((n) => n.id)).size, workflow.nodes.length, 'the request limit step does not collide with the round limit node');
  const agent = workflow.nodes.find((n) => n.id === 'agent');
  assert.equal(agent.functions[0], 'LangGraph node: agent');
  assert.ok(agent.purpose.includes('ChatOpenAI'));
});
