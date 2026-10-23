const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildSync } = require('esbuild');
const { runInNewContext } = require('node:vm');
const path = require('node:path');

// Exercise the real tool dispatcher, replacing only its authenticated DB boundary.
// Fixtures are synthetic; these tests never access student records or the model.
const bundle = buildSync({
  absWorkingDir: path.resolve(__dirname, '..'),
  entryPoints: ['src/features/assistant/lib/tools.ts'],
  bundle: true, platform: 'node', format: 'cjs', write: false,
  external: ['server-only', '@/features/placement/lib/server', '@/shared/http/backend'],
}).outputFiles[0].text;
const id = '00000000-0000-4000-8000-000000000001';
function load(read, api) {
  const module = { exports: {} };
  runInNewContext(bundle, {
    module, exports: module.exports, setTimeout, clearTimeout, Error, URLSearchParams,
    require(name) {
      if (name === 'server-only') return {};
      if (name === '@/features/placement/lib/server') return { placementRead: read };
      if (name === '@/shared/http/backend') return {
        backendApi: api || (async () => { throw new Error('Unexpected backend call'); }),
      };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return module.exports;
}
function harness(read, api) {
  return load(read, api).runTool;
}

test('student search provides an ID for detail lookup, which returns the recorded mobile', async () => {
  const calls = [];
  const runTool = harness(async (resource, query) => {
    calls.push({ resource, query });
    if (resource === 'students') return {
      rows: [{ id, name: 'Test Student', usn: 'TEST001' }], pagination: { total: 1 },
    };
    assert.equal(resource, 'student');
    assert.equal(query.id, id);
    return { id, name: 'Test Student', contact: {
      phoneStudent1: '+91 00000 00000', fatherMobile: 'parent-only',
      motherMobile: 'other-parent', whatsappNo: 'whatsapp-only',
    }};
  });
  const search = await runTool('find_students', { search: 'TEST001' });
  assert.equal(search.ok, true);
  assert.equal(search.data.students[0].id, id);
  assert.equal(search.data.students[0].contact, undefined);
  const detail = await runTool('student_detail', { id: search.data.students[0].id });
  assert.equal(detail.ok, true);
  assert.equal(detail.data.contact.mobile, '+91 00000 00000');
  assert.equal(detail.data.contact.fatherMobile, 'parent-only');
  assert.equal(detail.data.contact.motherMobile, 'other-parent');
  assert.equal(detail.data.contact.whatsappNo, 'whatsapp-only');
  assert.equal(calls.length, 2);
});

test('mobile strings retain leading zeros and formatting', async () => {
  const runTool = harness(async () => ({ contact: { phoneStudent1: '00123-00456' } }));
  const result = await runTool('student_detail', { id });
  assert.equal(result.data.contact.mobile, '00123-00456');
});

test('full detail retains every academic, admission, contact and family field from the profile page', async () => {
  const profile = {
    status: 'Active', full_name: 'Synthetic Student',
    created_at: '2026-01-01T00:00:00+00:00', updated_at: '2026-01-02T00:00:00+00:00',
    display_no: 'TEST001', enrollment_no: 'TEST001',
    course_name: 'Bachelor of Technology', course_short_name: 'B.Tech',
    source_batch: '2026', current_batch: 'G2', exam_semester: '7',
    admission_type: 'Regular', admission_year: '2022', admission_quota: 'DSAT',
    department_name: 'Computer Science & Engineering', department_short_name: 'CSE',
    current_division: 'CSE-7-G', current_semester: '7', admission_academic_year: '2022-23',
  };
  const academic = {
    cgpa: '6.749', sgpa: '7.96', attendance: '73.12', percentage: null,
    student_id: id, achievements: 0, total_backlog: 0, current_backlog: 0,
  };
  const contact = {
    email: 'student@example.invalid', gender: 'M', region: 'Urban',
    fatherName: 'Test Father', motherName: 'Test Mother', whatsappNo: null,
    presentCity: 'Test City', fatherMobile: '00000-00001', motherMobile: '00000-00002',
    phoneStudent1: '00000-00003', presentStateName: 'Test State',
    presentCountryName: 'Test Country', presentDistrictName: 'Test District',
    motherTongueLanguageName: 'Kannada',
  };
  const runTool = harness(async () => ({ id, profile, academic, contact, eligible: false }));
  const result = await runTool('student_detail', { id });
  assert.equal(result.ok, true);
  // JSON conversion removes VM realm differences while checking every key/value,
  // including nulls, zeroes, exact CGPA precision and differently named phone fields.
  const data = JSON.parse(JSON.stringify(result.data));
  assert.deepEqual(data.profile, profile);
  assert.deepEqual(data.academic, academic);
  assert.deepEqual(data.contact, { ...contact, mobile: contact.phoneStudent1 });
  assert.equal(data.baseline_eligibility, 'Not Eligible');
});

test('missing sections remain explicit and eligibility uses the authorized result', async () => {
  for (const [eligible, label] of [[null, 'Unclassified'], [false, 'Not Eligible'], [true, 'Eligible']]) {
    const runTool = harness(async () => ({ eligible }));
    const result = await runTool('student_detail', { id });
    assert.equal(result.data.profile, null);
    assert.equal(result.data.academic, null);
    assert.equal(result.data.contact.mobile, null);
    assert.equal(result.data.baseline_eligibility, label);
  }
});

test('absent or malformed mobile stays missing without a family/WhatsApp fallback', async () => {
  for (const contact of [null, {}, [], 'bad', { phoneStudent1: null },
    { phoneStudent1: '  ' }, { phoneStudent1: 123 },
    { fatherMobile: 'parent-only', motherMobile: 'other-parent', whatsappNo: 'other' }]) {
    const runTool = harness(async () => ({ contact }));
    const result = await runTool('student_detail', { id });
    assert.equal(result.ok, true);
    assert.equal(result.data.contact.mobile, null);
  }
});

test('invalid student IDs never query the database; denied reads return no contact data', async () => {
  let reads = 0;
  const runTool = harness(async () => { reads++; throw new Error('Access denied'); });
  assert.equal((await runTool('student_detail', { id: 'not-a-uuid' })).ok, false);
  assert.equal(reads, 0);
  const denied = await runTool('student_detail', { id });
  assert.equal(reads, 1);
  assert.equal(denied.ok, false);
  assert.equal(denied.error, 'Access denied');
  assert.equal(denied.data, undefined);
});

// ---------- Student intelligence tools (synthetic fixtures, stubbed backend) ----------

const sid = '00000000-0000-4000-8000-0000000000a1';
const other = '00000000-0000-4000-8000-0000000000b2';
const plain = (v) => JSON.parse(JSON.stringify(v));
const aiProfile = (usn = 'T01', name = 'Synthetic Advanced') => ({
  core: {
    usn, name, department: 'CSE', departmentName: 'Computer Science', batch: '2027', semester: '7',
    cgpa: '8.52', category: 'advanced', categoryLabel: 'Advanced', eligible: true,
    provenance: 'institution_verified', skillStatus: 'complete',
    ranking: { batchRank: 3, categoryRank: 3, batchSize: 6, categorySize: 4, scope: 'batch' },
    placement: { placed: false },
  },
  ranking: { batchRank: 3, categoryRank: 3, batchSize: 6, categorySize: 4, scope: 'batch' },
  skills: {
    visibility: { platforms: true, projects: true, activity: true, summary: true },
    onboarding: { complete: true, missing: [] },
    accounts: [
      { platform: 'github', state: 'linked', handle: 'synthetic-dev', profileUrl: null, ownership: 'platform_verified',
        syncStatus: 'completed', submitted: {}, metrics: [{ metric: 'repos.public', label: 'Public repositories', value: '14', verification: 'platform_verified' }] },
      { platform: 'leetcode', state: 'linked', handle: 'syn_lc', ownership: 'student_submitted', submitted: { solved: 240 }, metrics: [] },
      { platform: 'kaggle', state: 'declared_none', metrics: [] },
    ],
    featured: [{ source: 'student_selected', repo: { name: 'bravo', description: 'Project bravo', primaryLanguage: 'Python', stars: 90 } }],
    repositories: [], activity: [],
  },
  summary: { id: 'x', provenance: 'ai_generated', reviewedAt: null,
    content: { summary: { text: 'Grounded summary.', evidence: ['e1'] }, skills: [{ name: 'Python', evidence: ['e2'] }] } },
  readiness: { status: 'descriptive', items: [{ key: 'academic_eligibility', label: 'Academic eligibility', state: 'met', detail: 'Meets the rule.', provenance: 'institution_verified' }] },
  provenance: { institution_verified: 'Institution record' },
  purpose: 'ai',
});

/** Backend stub keyed by path prefix; records every call. */
function backend(routes) {
  const calls = [];
  const api = async (p) => {
    calls.push(p);
    for (const [prefix, reply] of routes)
      if (p.startsWith(prefix)) return { data: reply };
    throw new Error('Unexpected path ' + p);
  };
  return { api, calls };
}
const noDb = async () => { throw new Error('no database read expected'); };

test('student_profile with a single match returns a compact grounded profile and a server-built link', async () => {
  const b = backend([
    ['/placement/students/lookup', { exact: true, matches: [{ id: sid, usn: 'T01', name: 'Synthetic Advanced', department: 'CSE', batch: '2027', exact: true }] }],
    ['/placement/students/' + sid + '/profile', aiProfile()],
  ]);
  const { runTool, createToolContext } = load(noDb, b.api);
  const ctx = createToolContext();
  const r = plain(await runTool('student_profile', { usn: 't01' }, ctx));
  assert.equal(r.ok, true);
  assert.deepEqual(b.calls, ['/placement/students/lookup?usn=t01', '/placement/students/' + sid + '/profile?purpose=ai']);
  assert.equal(r.data.status, 'found');
  assert.deepEqual(r.data.profile, { id: sid, usn: 'T01', name: 'Synthetic Advanced', url: '/placement/students/' + sid });
  assert.equal(r.data.core.cgpa, '8.52');
  assert.equal(r.data.core.provenance, 'institution_verified');
  assert.deepEqual([r.data.ranking.batch_rank, r.data.ranking.category_rank, r.data.ranking.rank_type], [3, 3, 'dense']);
  assert.match(r.data.ranking.scope, /batch/);
  assert.equal(r.data.skill_status, 'complete');
  assert.deepEqual(r.data.skills.accounts.map((a) => [a.platform, a.provenance]),
    [['github', 'platform_verified'], ['leetcode', 'student_submitted'], ['kaggle', 'unavailable']]);
  assert.equal(r.data.skills.accounts[0].metrics[0].provenance, 'platform_verified');
  assert.deepEqual(r.data.skills.accounts[1].student_submitted_figures, { solved: 240 });
  assert.equal(r.data.skills.featured_projects[0].name, 'bravo');
  assert.equal(r.data.summary.label, 'ai_generated');
  assert.equal(JSON.stringify(r.data.summary).includes('evidence'), false, 'evidence ids are stripped');
  assert.equal(r.data.readiness[0].provenance, 'institution_verified');
  for (const key of ['email', 'phone', 'father', 'mother', 'whatsapp', 'contact'])
    assert.equal(JSON.stringify(r.data).toLowerCase().includes(key), false, 'no ' + key);
  assert.deepEqual(plain(ctx.profiles), [r.data.profile]);
});

test('student_profile prefers the single exact match among partial matches', async () => {
  const b = backend([
    ['/placement/students/lookup', { exact: true, matches: [
      { id: sid, usn: 'T01', name: 'A', exact: true }, { id: other, usn: 'T011', name: 'B', exact: false }] }],
    ['/placement/students/' + sid + '/profile', aiProfile()],
  ]);
  const r = await load(noDb, b.api).runTool('student_profile', { usn: 'T01' });
  assert.equal(r.data.status, 'found');
  assert.equal(r.data.profile.id, sid);
});

test('student_profile reports not_found and ambiguous without fetching a profile', async () => {
  const none = backend([['/placement/students/lookup', { exact: false, matches: [] }]]);
  const nfTools = load(noDb, none.api);
  const nf = plain(await nfTools.runTool('student_profile', { usn: 'ZZ999' }, nfTools.createToolContext()));
  assert.deepEqual(nf, { ok: true, data: { status: 'not_found', message: 'No student with USN ZZ999 was found.' } });
  assert.equal(none.calls.length, 1);

  const many = backend([['/placement/students/lookup', { exact: false, matches: [
    { id: sid, usn: 'T011', name: 'One', department: 'CSE', batch: '2027', exact: false },
    { id: other, usn: 'T012', name: 'Two', department: 'ECE', batch: '2027', exact: false }] }]]);
  const amb = load(noDb, many.api);
  const ctx = amb.createToolContext();
  const r = plain(await amb.runTool('student_profile', { usn: 'T01' }, ctx));
  assert.equal(r.data.status, 'ambiguous');
  assert.deepEqual(r.data.candidates, [
    { usn: 'T011', name: 'One', department: 'CSE', batch: '2027' },
    { usn: 'T012', name: 'Two', department: 'ECE', batch: '2027' }]);
  assert.equal(JSON.stringify(r).includes(sid), false, 'candidates carry no ids');
  assert.equal(many.calls.length, 1, 'no profile fetched');
  assert.equal(ctx.profiles.length, 0);
  assert.equal(ctx.students.size, 0);
});

test('student_profile accepts a student_id only when a tool returned it in this request', async () => {
  const b = backend([['/placement/students/' + sid + '/profile', aiProfile()]]);
  const read = async (resource) => {
    assert.equal(resource, 'students');
    return { rows: [{ id: sid, usn: 'T01', name: 'Synthetic Advanced' }], pagination: { total: 1 } };
  };
  const { runTool, createToolContext } = load(read, b.api);
  const refused = 'Use a USN or a student returned by an earlier lookup.';
  // Unknown id, malformed id and no arguments are refused without a backend call.
  for (const args of [{ student_id: sid }, { student_id: 'not-a-uuid' }, {}]) {
    const r = await runTool('student_profile', args, createToolContext());
    assert.deepEqual(plain(r), { ok: false, error: refused });
  }
  // A context created without being passed (the default) knows no ids either.
  assert.equal((await runTool('student_profile', { student_id: sid })).ok, false);
  assert.equal(b.calls.length, 0);
  // An id returned in one request is not accepted in another.
  const first = createToolContext();
  await runTool('find_students', { search: 'T01' }, first);
  assert.equal((await runTool('student_profile', { student_id: sid }, createToolContext())).ok, false);
  // The same request: accepted (case-insensitively), and only that id.
  const r = plain(await runTool('student_profile', { student_id: sid.toUpperCase() }, first));
  assert.equal(r.ok, true);
  assert.equal(r.data.profile.url, '/placement/students/' + sid);
  assert.equal((await runTool('student_profile', { student_id: other }, first)).ok, false);
  assert.equal(b.calls.length, 1);
});

test('student_profile validates the USN before any lookup', async () => {
  const b = backend([]);
  const runTool = load(noDb, b.api).runTool;
  for (const usn of ['T 01', '../x', 'a', 'x'.repeat(41), 'T01?usn=1', 'T01&name=x'])
    assert.equal((await runTool('student_profile', { usn })).ok, false, usn);
  assert.equal(b.calls.length, 0);
});

test('a lookup result with a non-UUID id is never opened', async () => {
  const b = backend([['/placement/students/lookup', { matches: [{ id: '../../admin', usn: 'T01', name: 'X', exact: true }] }]]);
  const r = await load(noDb, b.api).runTool('student_profile', { usn: 'T01' });
  assert.equal(r.ok, false);
  assert.equal(b.calls.length, 1);
});

test('skill_profiles validates arguments, defaults to complete and caps the limit', async () => {
  const b = backend([['/placement/skills/students', { rows: [
    { id: sid, usn: 'T01', name: 'S', department: 'CSE', batch: '2027', cgpa: '8.52', category: 'advanced',
      skillStatus: 'complete', completedAt: '2026-10-01', linkedPlatforms: ['github', 'leetcode', 7] }],
    pagination: { total: 1 } }]]);
  const { runTool, createToolContext } = load(noDb, b.api);
  const ctx = createToolContext();
  const r = plain(await runTool('skill_profiles', { batch: 2027, limit: 500 }, ctx));
  assert.equal(r.ok, true);
  assert.equal(b.calls[0], '/placement/skills/students?status=complete&limit=25&batch=2027');
  assert.deepEqual(r.data.students[0].linked_platforms, ['github', 'leetcode']);
  assert.equal(r.data.total, 1);
  assert.ok(ctx.students.has(sid), 'returned ids are remembered for student_profile');
  assert.equal((await runTool('skill_profiles', { status: 'done' })).ok, false);
  assert.equal((await runTool('skill_profiles', { batch: '28' })).ok, false);
  assert.equal(b.calls.length, 1);
});

test('rank_students with a category uses the dense category directory', async () => {
  const b = backend([['/placement/categories/advanced/students', {
    rows: [{ id: sid, usn: 'T02', name: 'Top', department: 'CSE', batch: '2027', semester: '7', cgpa: '9.10',
      category: 'advanced', eligible: true, categoryRank: 1, batchRank: 1, skillStatus: 'complete', profileUrl: '/x' }],
    pagination: { total: 4 },
    scope: { batch: '2027', category: 'advanced', rule: 'Dense rank by official CGPA within the passing-out batch and category.' },
  }]]);
  const { runTool, createToolContext } = load(noDb, b.api);
  const ctx = createToolContext();
  const r = plain(await runTool('rank_students', { category: 'advanced', batch: '2027', department: 'CSE', limit: 5 }, ctx));
  assert.equal(r.ok, true);
  assert.equal(b.calls[0], '/placement/categories/advanced/students?limit=5&sort=rank&batch=2027&department=CSE');
  assert.equal(r.data.rank_type, 'dense');
  assert.match(r.data.scope.rule, /Dense rank/);
  assert.deepEqual([r.data.students[0].category_rank, r.data.students[0].batch_rank], [1, 1]);
  assert.ok(ctx.students.has(sid));
  for (const args of [{ category: 'top' }, { category: 'advanced', minimum: '8' },
    { category: 'medium', eligibility: 'unclassified' }, { category: 'medium', batch: '27' }])
    assert.equal((await runTool('rank_students', args)).ok, false, JSON.stringify(args));
  assert.equal(b.calls.length, 1);
});

test('rank_students without a category keeps the legacy ranking resource', async () => {
  const calls = [];
  const runTool = harness(async (resource, query) => {
    calls.push([resource, query]);
    return { rows: [{ id: sid, usn: 'T01', college_rank: 4 }], pagination: { total: 1 } };
  });
  const r = await runTool('rank_students', { batch: '2027', limit: 3 });
  assert.equal(r.ok, true);
  assert.deepEqual(plain(calls), [['ranking', { limit: '3', batch: '2027' }]]);
  assert.equal(r.data.students[0].college_rank, 4);
});

test('new tools are declared with strict schemas and readable labels', () => {
  const { FRIDAY_TOOLS, toolLabel } = load(noDb, null);
  const byName = Object.fromEntries(FRIDAY_TOOLS.map((t) => [t.function.name, t.function]));
  for (const name of ['student_profile', 'skill_profiles', 'rank_students', 'student_detail']) {
    assert.ok(byName[name], name);
    assert.equal(byName[name].parameters.additionalProperties, false);
    assert.notEqual(toolLabel(name), 'Retrieving campus information');
  }
  assert.deepEqual(plain(Object.keys(byName.student_profile.parameters.properties)), ['usn', 'student_id']);
  assert.deepEqual(plain(byName.rank_students.parameters.properties.category.enum), ['advanced', 'medium', 'needs-improvement']);
  assert.match(byName.student_detail.description, /prefer student_profile/);
  for (const t of FRIDAY_TOOLS) assert.equal(t.function.description.includes('—'), false, 'no em dash');
});

test('the system prompt requires provenance labels, scoped dense ranks and plain not-found answers', () => {
  const src = buildSync({
    absWorkingDir: path.resolve(__dirname, '..'),
    entryPoints: ['src/features/assistant/lib/prompt.ts'],
    bundle: true, platform: 'node', format: 'cjs', write: false, external: ['server-only'],
  }).outputFiles[0].text;
  const module = { exports: {} };
  runInNewContext(src, { module, exports: module.exports, require: () => ({}) });
  const prompt = module.exports.FRIDAY_SYSTEM_PROMPT;
  for (const label of ['(institution record)', '(verified on GitHub)', '(student submitted)', '(AI generated)', '(unavailable)'])
    assert.ok(prompt.includes(label), label);
  assert.match(prompt, /status "ambiguous"/);
  assert.match(prompt, /status "not_found"/);
  assert.match(prompt, /Never infer a skill/);
  assert.match(prompt, /dense ranks/);
  assert.match(prompt, /within the 2027 batch/);
  // Existing rules stay.
  assert.match(prompt, /Never use em dashes\. Do not use emoji\./);
  assert.match(prompt, /Never cite sources/);
  assert.equal(prompt.includes('—'), false, 'no em dash in the prompt');
});

test('the engine emits one profile_link per distinct resolved student, at most three, built from tool output', async () => {
  const src = buildSync({
    absWorkingDir: path.resolve(__dirname, '..'),
    entryPoints: ['src/features/assistant/lib/engine.ts'],
    bundle: true, platform: 'node', format: 'cjs', write: false,
    external: ['server-only', '@/features/placement/lib/server', '@/shared/http/backend', '@openrouter/sdk'],
  }).outputFiles[0].text;
  const ids = ['a1', 'b2', 'c3', 'd4'].map((x) => '00000000-0000-4000-8000-0000000000' + x);
  const usns = ['T01', 'T02', 'T03', 'T04'];
  const requests = [];
  // The model (stubbed) asks for five profiles: one duplicate, one unknown id.
  const turns = [
    [{ choices: [{ delta: { toolCalls: [
      ...usns.map((u, i) => ({ index: i, id: 'call_' + i, function: { name: 'student_profile', arguments: JSON.stringify({ usn: u }) } })),
      { index: 4, id: 'call_4', function: { name: 'student_profile', arguments: '{"usn":"T01"}' } },
      { index: 5, id: 'call_5', function: { name: 'student_profile', arguments: '{"student_id":"00000000-0000-4000-8000-0000000000ff"}' } },
    ] }, finishReason: 'tool_calls' }] }],
    [{ choices: [{ delta: { content: 'Profiles opened. See /placement/students/00000000-0000-4000-8000-0000000000ee' }, finishReason: 'stop' }] }],
  ];
  class OpenRouter {
    constructor() {
      this.chat = { send: async (req) => {
        requests.push(req.chatRequest);
        const chunks = turns.shift();
        return { async *[Symbol.asyncIterator]() { for (const c of chunks) yield c; } };
      } };
    }
  }
  const api = async (p) => {
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
  const module = { exports: {} };
  runInNewContext(src, {
    module, exports: module.exports, setTimeout, clearTimeout, Error, URLSearchParams, Symbol,
    process: { env: { OPENROUTER_API_KEY: 'test-key-not-real' } },
    require(name) {
      if (name === 'server-only') return {};
      if (name === '@openrouter/sdk') return { OpenRouter };
      if (name === '@/shared/http/backend') return { backendApi: api };
      if (name === '@/features/placement/lib/server') return { placementRead: async () => { throw new Error('no db'); } };
      throw new Error('Unexpected dependency: ' + name);
    },
  });
  const events = [];
  for await (const e of module.exports.runFriday({ history: [], message: 'profiles', spoken: false, signal: new AbortController().signal }))
    events.push(JSON.parse(JSON.stringify(e)));
  const links = events.filter((e) => e.type === 'profile_link');
  assert.deepEqual(links, ids.slice(0, 3).map((id, i) => ({
    type: 'profile_link', id, usn: usns[i], name: 'Student ' + i, url: '/placement/students/' + id,
  })));
  assert.equal(events.at(-1).type, 'done');
  // The unknown id was refused, and the model saw the refusal.
  const toolMessages = requests[1].messages.filter((m) => m.role === 'tool');
  assert.equal(toolMessages.length, 6);
  assert.match(toolMessages[5].content, /Use a USN or a student returned by an earlier lookup/);
  // The new tools are offered to the model.
  const offered = requests[0].tools.map((t) => t.function.name);
  for (const name of ['student_profile', 'skill_profiles', 'rank_students', 'student_detail']) assert.ok(offered.includes(name), name);
});

test('student_profile drops the contribution calendar, bounds every metric value and reports a withheld summary', async () => {
  const days = Array.from({ length: 366 }, (_, i) => ({ date: '2026-01-' + String(i % 28 + 1).padStart(2, '0'), count: i % 7 }));
  const profile = aiProfile();
  profile.skills.accounts[0].metrics.push(
    { metric: 'activity.calendar', label: 'Contribution calendar', value: { days }, verification: 'platform_verified' },
    { metric: 'languages.top', label: 'Most-used languages', value: Array.from({ length: 50 }, (_, i) => ({ language: 'L' + i, share: 2 })), verification: 'platform_verified' },
    { metric: 'models.top', label: 'Top models', value: [{ id: 'syn/model', downloads: 4 }], verification: 'platform_verified' },
  );
  profile.skills.activity = [
    { metric: 'activity.calendar', label: 'Contribution calendar', value: { days }, verification: 'platform_verified' },
    { metric: 'contributions.lines_added_52w', label: 'Lines added (last 52 weeks)', value: { value: 18240, counted: 8, eligible: 10, pending: 2 }, verification: 'platform_verified' },
    { metric: 'activity.current_streak', label: 'Current contribution streak (days)', value: 5, verification: 'platform_verified' },
    { metric: 'contributions.total_12m', label: 'x'.repeat(500), value: 'y'.repeat(5000), verification: 'platform_verified' },
  ];
  profile.summary = null;
  profile.summaryWithheld = true;
  const b = backend([
    ['/placement/students/lookup', { exact: true, matches: [{ id: sid, usn: 'T01', name: 'Synthetic Advanced', exact: true }] }],
    ['/placement/students/' + sid + '/profile', profile],
  ]);
  const r = plain(await load(noDb, b.api).runTool('student_profile', { usn: 'T01' }));
  assert.equal(r.ok, true);
  const text = JSON.stringify(r.data);
  assert.equal(text.includes('calendar'), false, 'no calendar label');
  assert.equal(text.includes('"days"'), false, 'no calendar series');
  assert.ok(text.length < 8000, 'profile stays compact: ' + text.length);
  const activity = r.data.skills.activity;
  assert.deepEqual(activity.map((m) => m.label.slice(0, 20)), ['Lines added (last 52', 'Current contribution', 'x'.repeat(20)]);
  assert.deepEqual(activity[0].value, { value: 18240, counted: 8, eligible: 10, pending: 2 });
  assert.ok(activity[2].label.length <= 100);
  assert.ok(JSON.stringify(activity[2].value ?? null).length <= 600, 'long values are bounded');
  for (const m of [...activity, ...r.data.skills.accounts.flatMap((a) => a.metrics)])
    assert.ok(JSON.stringify(m.value ?? null).length <= 600, m.label);
  const languages = r.data.skills.accounts[0].metrics.find((m) => m.label === 'Most-used languages');
  assert.equal(languages.value.length, 10, 'arrays are capped');
  assert.deepEqual(r.data.skills.accounts[0].metrics.find((m) => m.label === 'Top models').value, [{ id: 'syn/model', downloads: 4 }], 'metric fields are kept');
  assert.equal(r.data.summary, null);
  assert.equal(r.data.summary_withheld, true);
});
