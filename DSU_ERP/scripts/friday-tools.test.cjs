const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildSync } = require('esbuild');
const { runInNewContext } = require('node:vm');
const path = require('node:path');

// Exercise the real tool dispatcher, replacing only its authenticated DB boundary.
// Fixtures are synthetic; these tests never access student records or the model.
const bundle = buildSync({
  absWorkingDir: path.resolve(__dirname, '..'),
  entryPoints: ['src/lib/friday/tools.ts'],
  bundle: true, platform: 'node', format: 'cjs', write: false,
  external: ['server-only', '@/lib/placement/server'],
}).outputFiles[0].text;
const id = '00000000-0000-4000-8000-000000000001';
function harness(read) {
  const module = { exports: {} };
  runInNewContext(bundle, {
    module, exports: module.exports, setTimeout, clearTimeout, Error,
    require(name) {
      if (name === 'server-only') return {};
      if (name === '@/lib/placement/server') return { placementRead: read };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return module.exports.runTool;
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
