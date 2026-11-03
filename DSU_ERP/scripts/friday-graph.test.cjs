const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// Runs the real officer F.R.I.D.A.Y. LangGraph agent against a local mock of
// OpenRouter's OpenAI-compatible API. Only the authenticated database and
// backend boundaries are replaced; fixtures are synthetic and no model or
// student record is ever contacted.
const root = path.resolve(__dirname, '..');
const outfile = path.join(root, '.qa', 'friday-graph.bundle.cjs');
const MOCKED = new Set(['server-only', '@/features/placement/lib/server', '@/shared/http/backend']);
const bundled = build({
  absWorkingDir: root,
  entryPoints: ['src/features/assistant/lib/engine.ts'],
  bundle: true, platform: 'node', format: 'cjs', outfile, logLevel: 'silent',
  packages: 'external',
  plugins: [{
    name: 'mock-boundaries',
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => (MOCKED.has(args.path) ? { path: args.path, namespace: 'mock' } : undefined));
      build.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
        loader: 'js',
        contents: args.path === 'server-only' ? 'module.exports = {};'
          : args.path === '@/shared/http/backend' ? 'module.exports = { backendApi: (...a) => globalThis.__friday.backendApi(...a) };'
          : 'module.exports = { placementRead: (...a) => globalThis.__friday.placementRead(...a) };',
      }));
    },
  }],
});

// ---- Mock OpenRouter: each request gets the next scripted streamed reply ----
const requests = [];
let script = [];
const sse = (res, chunks, { delayMs = 0 } = {}) => {
  res.writeHead(200, { 'content-type': 'text/event-stream' });
  let i = 0;
  const send = () => {
    if (i < chunks.length) { res.write(`data: ${JSON.stringify(chunks[i++])}\n\n`); setTimeout(send, delayMs); }
    else { res.write('data: [DONE]\n\n'); res.end(); }
  };
  send();
};
const chunk = (delta, finish = null) => ({ id: 'c', object: 'chat.completion.chunk', created: 1, model: 'm', choices: [{ index: 0, delta, finish_reason: finish }] });
const usage = { id: 'c', object: 'chat.completion.chunk', created: 1, model: 'm', choices: [], usage: { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 } };
const toolCall = (id, name, args) => [
  chunk({ role: 'assistant', tool_calls: [{ index: 0, id, type: 'function', function: { name, arguments: '' } }] }),
  chunk({ tool_calls: [{ index: 0, function: { arguments: args } }] }, 'tool_calls'),
  usage,
];
const answer = (...parts) => [chunk({ role: 'assistant', content: '' }), ...parts.map((p) => chunk({ content: p })), chunk({}, 'stop'), usage];

let server;
before(async () => {
  await bundled;
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (d) => (body += d));
    req.on('end', () => {
      const parsed = JSON.parse(body);
      requests.push(parsed);
      const next = script.shift();
      if (!next) { res.writeHead(500).end('{"error":{"message":"unscripted"}}'); return; }
      sse(res, next.chunks, next);
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  process.env.OPENROUTER_BASE_URL = `http://127.0.0.1:${server.address().port}/v1`;
  process.env.OPENROUTER_API_KEY = 'test-key';
  process.env.OPENROUTER_PROVIDER = 'baseten/fp8,deepinfra/fp8';
});
after(() => { server.close(); fs.rmSync(outfile, { force: true }); });

const reads = [];
globalThis.__friday = {
  placementRead: async (resource, query) => { reads.push({ resource, query }); return { kpis: { total: 120 }, options: {} }; },
  backendApi: async () => { throw new Error('Unexpected backend call'); },
};
const engine = () => require(outfile);
async function run(message, signal = new AbortController().signal) {
  const events = [];
  for await (const event of engine().runFriday({ history: [], message, spoken: false, signal })) events.push(event);
  return events;
}
const reset = (steps) => { requests.length = 0; reads.length = 0; script = steps; };

test('one tool round then an answer, streamed in the existing browser protocol', async () => {
  reset([{ chunks: toolCall('call_1', 'batch_summary', '{"batch":"2027"}') }, { chunks: answer('There are ', '120 students.') }]);
  const events = await run('How many students are in 2027?');

  assert.equal(requests.length, 2, 'agent → tools → agent');
  assert.deepEqual(reads, [{ resource: 'batch', query: { batch: '2027' } }], 'the real tool ran with the model arguments');
  // Approved providers only, with fallbacks disabled, on every request.
  for (const body of requests) assert.deepEqual(body.provider, { order: ['baseten/fp8', 'deepinfra/fp8'], only: ['baseten/fp8', 'deepinfra/fp8'], allow_fallbacks: false });
  assert.ok(requests[0].tools.length > 10 && requests[0].tool_choice === 'auto', 'tools offered');
  assert.equal(requests[0].stream, true);
  // The second request replays the tool request and its result.
  const replay = requests[1].messages;
  const assistant = replay.find((m) => m.role === 'assistant' && m.tool_calls);
  assert.equal(assistant.tool_calls[0].id, 'call_1');
  const tool = replay.find((m) => m.role === 'tool');
  assert.equal(tool.tool_call_id, 'call_1');
  assert.ok(JSON.parse(tool.content) && typeof JSON.parse(tool.content) === 'object', 'the tool result JSON is replayed');

  const types = events.map((e) => e.type === 'status' ? `status:${e.state}` : e.type === 'tool_status' ? `tool:${e.state}` : e.type);
  assert.deepEqual(types, ['status:preparing', 'status:retrieving', 'tool:running', 'tool:done', 'status:responding', 'status:responding', 'text_delta', 'text_delta', 'usage', 'done']);
  assert.equal(events.at(-1).text, 'There are 120 students.');
  assert.deepEqual(events.find((e) => e.type === 'usage').usage, { promptTokens: 11, completionTokens: 7, totalTokens: 18 });
});

test('the final round offers no tools, and tools requested anyway hit the round limit', async () => {
  const rounds = Array.from({ length: 5 }, (_, i) => ({ chunks: toolCall(`call_${i}`, 'batch_summary', '{}') }));
  reset(rounds);
  const events = await run('Keep looking things up');
  assert.equal(requests.length, 5, `${4} tool rounds plus the final answer attempt`);
  for (const body of requests.slice(0, 4)) assert.ok(body.tools?.length, 'tools offered before the limit');
  assert.equal(requests[4].tools, undefined, 'no tools on the final round');
  const last = events.at(-1);
  assert.equal(last.type, 'error');
  assert.match(last.message, /more lookups than allowed/);
  assert.equal(reads.length, 4, 'no tool runs after the limit');
});

test('tool arguments that are not valid JSON are reported to the model, not executed', async () => {
  reset([{ chunks: toolCall('call_x', 'batch_summary', '{"batch":') }, { chunks: answer('Sorry.') }]);
  const events = await run('Broken arguments');
  assert.equal(reads.length, 0);
  const tool = requests[1].messages.find((m) => m.role === 'tool');
  assert.equal(tool.tool_call_id, 'call_x');
  assert.match(tool.content, /not valid JSON/);
  assert.ok(events.some((e) => e.type === 'tool_status' && e.state === 'failed'));
  assert.equal(events.at(-1).type, 'done');
});

test('stopping mid-answer ends the turn with a stopped status', async () => {
  reset([{ chunks: answer(...Array.from({ length: 40 }, () => 'word ')), delayMs: 25 }]);
  const controller = new AbortController();
  const events = [];
  for await (const event of engine().runFriday({ history: [], message: 'Long answer', spoken: false, signal: controller.signal })) {
    events.push(event);
    if (event.type === 'text_delta' && events.filter((e) => e.type === 'text_delta').length === 3) controller.abort();
  }
  assert.deepEqual(events.at(-1), { type: 'status', state: 'stopped' });
  assert.ok(!events.some((e) => e.type === 'done'), 'no answer is reported as complete');
});

test('provider failures still read as plain explanations', async () => {
  reset([]);
  // The mock answers unscripted requests with HTTP 500.
  await assert.rejects(run('anything'), (error) => {
    assert.match(engine().describeError(error), /status 500|model provider/);
    return true;
  });
});

test('profile links: one per distinct resolved student, at most three, built from tool output', async () => {
  const ids = ['a1', 'b2', 'c3', 'd4'].map((x) => '00000000-0000-4000-8000-0000000000' + x);
  const usns = ['T01', 'T02', 'T03', 'T04'];
  // The model asks for six profiles in one round: four students, a duplicate
  // and an id no lookup has returned.
  const calls = [
    ...usns.map((u, i) => ({ id: 'call_' + i, args: JSON.stringify({ usn: u }) })),
    { id: 'call_4', args: '{"usn":"T01"}' },
    { id: 'call_5', args: '{"student_id":"00000000-0000-4000-8000-0000000000ff"}' },
  ];
  reset([
    { chunks: [chunk({ role: 'assistant', tool_calls: calls.map((c, index) => ({ index, id: c.id, type: 'function', function: { name: 'student_profile', arguments: c.args } })) }, 'tool_calls'), usage] },
    { chunks: answer('Profiles opened. See /placement/students/00000000-0000-4000-8000-0000000000ee') },
  ]);
  const previous = globalThis.__friday.backendApi;
  globalThis.__friday.backendApi = async (p) => {
    const lookup = /lookup\?usn=(T0\d)$/.exec(p);
    if (lookup) {
      const i = usns.indexOf(lookup[1]);
      return { data: { exact: true, matches: [{ id: ids[i], usn: usns[i], name: 'Student ' + i, exact: true }] } };
    }
    const prof = /students\/([\da-f-]+)\/profile\?purpose=ai$/.exec(p);
    const i = ids.indexOf(prof && prof[1]);
    assert.ok(i >= 0, 'unexpected ' + p);
    return { data: { core: { usn: usns[i], name: 'Student ' + i } } };
  };
  try {
    const events = await run('profiles');
    const links = events.filter((e) => e.type === 'profile_link');
    assert.deepEqual(links, ids.slice(0, 3).map((id, i) => ({
      type: 'profile_link', id, usn: usns[i], name: 'Student ' + i, url: '/placement/students/' + id,
    })));
    assert.equal(events.at(-1).type, 'done');
    // The unknown id was refused, and the model saw the refusal.
    const toolMessages = requests[1].messages.filter((m) => m.role === 'tool');
    assert.equal(toolMessages.length, 6);
    assert.match(toolMessages[5].content, /Use a USN or a student returned by an earlier lookup/);
    // The tools are offered to the model.
    const offered = requests[0].tools.map((t) => t.function.name);
    for (const name of ['student_profile', 'skill_profiles', 'rank_students', 'student_detail']) assert.ok(offered.includes(name), name);
  } finally {
    globalThis.__friday.backendApi = previous;
  }
});
