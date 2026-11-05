const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// The backend client against a local mock host that first answers like a
// waking hosting proxy (HTML 503). Only the session and config are mocked.
const root = path.resolve(__dirname, '..');
const outfile = path.join(root, '.qa', 'backend-retry.bundle.cjs');
const MOCKED = new Set(['server-only', '@/shared/auth/session', '@/shared/config/env']);
const bundled = build({
  absWorkingDir: root, entryPoints: ['src/shared/http/backend.ts'], bundle: true, platform: 'node', format: 'cjs',
  outfile, logLevel: 'silent', packages: 'external',
  plugins: [{
    name: 'mock-boundaries',
    setup(b) {
      b.onResolve({ filter: /.*/ }, (a) => (MOCKED.has(a.path) ? { path: a.path, namespace: 'mock' } : undefined));
      b.onLoad({ filter: /.*/, namespace: 'mock' }, (a) => ({
        loader: 'js',
        contents: a.path === 'server-only' ? 'module.exports = {};'
          : a.path === '@/shared/auth/session' ? 'module.exports = { userSession: async () => ({ token: "t" }) };'
          : 'module.exports = { backendOrigin: () => new URL(globalThis.__origin) };',
      }));
    },
  }],
});

// A short wake window keeps the tests fast; production waits up to 60s.
process.env.DSU_BACKEND_WAKE_MS = '4000';
let replies = [];
const hits = [];
let server;
before(async () => {
  await bundled;
  server = http.createServer((req, res) => {
    hits.push(`${req.method} ${req.url}`);
    const next = replies.shift() || 'html';
    if (next === 'html') res.writeHead(503, { 'content-type': 'text/html; charset=utf-8' }).end('<!DOCTYPE html><title>Waking up</title>');
    else res.writeHead(200, { 'content-type': 'application/json' }).end('{"data":{"admin":true}}');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  globalThis.__origin = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); fs.rmSync(outfile, { force: true }); });
const client = () => require(outfile);
const quiet = async (fn) => { const warn = console.warn; const lines = []; console.warn = (...a) => lines.push(a); try { return [await fn(), lines]; } finally { console.warn = warn; } };

test('a read that first gets a hosting holding page is retried and succeeds', async () => {
  replies = ['html', 'json']; hits.length = 0;
  const [result, logs] = await quiet(() => client().backendApi('/admin/session'));
  assert.deepEqual(result, { data: { admin: true } });
  assert.deepEqual(hits, ['GET /api/v1/admin/session', 'GET /api/v1/admin/session']);
  assert.equal(logs.length, 1);
  assert.deepEqual(logs[0][1], { route: '/admin/session', status: 503, contentType: 'text/html; charset=utf-8', retried: false });
});

test('a read keeps retrying while the backend wakes up', async () => {
  replies = ['html', 'html', 'json']; hits.length = 0;
  process.env.DSU_BACKEND_WAKE_MS = '10000';
  try {
    const [result] = await quiet(() => client().backendApi('/session'));
    assert.deepEqual(result, { data: { admin: true } });
    assert.equal(hits.length, 3);
  } finally { process.env.DSU_BACKEND_WAKE_MS = '4000'; }
});

test('a read that keeps getting HTML fails as an invalid response, logging no ids', async () => {
  replies = ['html', 'html']; hits.length = 0;
  const [error, logs] = await quiet(() => client().backendApi('/admin/agent-runs/00000000-0000-4000-8000-000000000001?x=1').catch((e) => e));
  assert.equal(error.code, 'BACKEND_INVALID_RESPONSE');
  assert.equal(hits.length, 2);
  assert.equal(logs.at(-1)[1].route, '/admin/agent-runs/:id');
  assert.equal(logs.at(-1)[1].retried, true);
});

test('writes are never repeated', async () => {
  replies = ['html', 'json']; hits.length = 0;
  const [error] = await quiet(() => client().backendApi('/admin/x', { method: 'POST', body: '{}' }).catch((e) => e));
  assert.equal(error.code, 'BACKEND_INVALID_RESPONSE');
  assert.deepEqual(hits, ['POST /api/v1/admin/x']);
});
