// Students Ranking: real components and navigation with clearly synthetic,
// local-only fixtures. The fixture backend below only filters and pages the
// rows; ranks and scores are fixed, as the real backend computes them.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const { chromium } = require('@playwright/test');
const root = process.cwd(), dir = path.join(root, '.qa/ranking-ui');
fs.mkdirSync(dir, { recursive: true });

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const synced = '2026-10-26T06:00:00Z';
const row = (n, o) => ({
  id: id(n), usn: `TEST${String(n).padStart(3, '0')}`, name: `Fixture Student ${n}`, department: o.department ?? 'CSE',
  departmentName: o.department === 'MECH' ? 'Mechanical Engineering' : 'Computer Science and Engineering with a deliberately long programme name',
  batch: o.batch ?? '2027', semester: '7', cgpa: o.cgpa ?? null, rank: null, value: null,
  scores: { academic: o.cgpa ? Number(o.cgpa) * 10 : null, dsa: o.dsa ?? null, github: o.github ?? null, developer: o.developer ?? null },
  statuses: { academic: o.cgpa ? 'scored' : 'missing', dsa: o.dsaStatus ?? (o.dsa != null ? 'scored' : 'not_linked'), github: o.githubStatus ?? (o.github != null ? 'scored' : 'not_linked'), developer: o.developer != null ? 'scored' : 'pending' },
  contestRating: o.contest ?? null, leetcodeNameMatch: o.nameMatch ?? null, topic: null, evidenceState: o.evidence ?? 'pending', coverage: null,
  calculatedAt: '2026-10-27T01:00:00Z', evidenceSyncedAt: o.dsa != null || o.github != null ? synced : null,
});
const students = [
  row(1, { cgpa: '9.10', dsa: 74.2, github: 81.5, developer: 82.0, evidence: 'complete', contest: '1745', nameMatch: 'verified' }),
  row(2, { cgpa: '8.52', dsa: 41.0, github: null, githubStatus: 'pending', evidence: 'partial' }),
  row(3, { cgpa: '8.52', dsa: null, dsaStatus: 'disputed', github: 55.0, evidence: 'partial' }),
  row(4, { cgpa: null }),
  row(5, { cgpa: '9.50', department: 'MECH', batch: '2028', dsa: 62.3, github: 48.0, developer: 76.1, evidence: 'complete', nameMatch: 'unverified' }),
  row(6, { cgpa: '7.00', dsa: 12.5, dsaStatus: 'stale', github: null, githubStatus: 'hidden', evidence: 'partial' }),
];
const overview = {
  counts: { students: 6, validCgpa: 5, githubLinked: 4, leetcodeLinked: 5, dsaScored: 4, githubScored: 3, developerEligible: 2, awaitingEvidence: 1, notCalculated: 0, lastCalculatedAt: '2026-10-27T01:00:00Z', oldestCalculatedAt: '2026-10-27T01:00:00Z' },
  options: { batches: ['2028', '2027'], departments: [{ code: 'CSE', name: 'Computer Science and Engineering' }, { code: 'MECH', name: 'Mechanical Engineering' }], semesters: ['7'] },
  topics: [
    { code: 'dsa.arrays', family: 'dsa', label: 'Arrays', source: 'leetcode', students: 2 },
    { code: 'project.web', family: 'software', label: 'Web development', source: 'github', students: 2 },
    { code: 'project.ml', family: 'specialization', label: 'Machine learning projects', source: 'github', students: 0 },
    { code: 'core.dbms', family: 'core-cs', label: 'Database management systems', source: null, students: 0 },
  ],
  model: { version: 'developer-competency-v1-experimental', status: 'experimental', label: 'Developer competency v1 (provisional)', weights: { academic: 0.5, dsa: 0.3, github: 0.2 }, freshnessDays: 30, activatedAt: '2026-10-27T00:00:00Z' },
};
const topicEvidence = { [id(1)]: { score: 95.0, evidence: { solved: 60, tags: [{ tag: 'array', solved: 60 }] } }, [id(5)]: { score: 77.7, evidence: { solved: 30, tags: [{ tag: 'array', solved: 30 }] } } };
const githubTop = [{ name: 'fixture/placement-api', url: 'https://github.com/fixture/placement-api', score: 91.25, weight: 0.5,
  parts: { implementation: { earned: 26.5, max: 30, observedMax: 30 }, organization: { earned: 20, max: 20, observedMax: 20 }, testing: { earned: 15, max: 15, observedMax: 15 }, documentation: { earned: 13, max: 15, observedMax: 15 }, attribution: { earned: 5, max: 15, observedMax: 5 }, maintenance: { earned: 3, max: 5, observedMax: 3 } },
  reasons: ['Has automated tests'], areas: ['project.web'] }, { name: 'dsu-club/fest-site', url: 'https://github.com/dsu-club/fest-site', score: 70, weight: 0.3, parts: {}, reasons: [], areas: [], organization: true }];
const detail = (n) => {
  const s = students.find((x) => x.id === id(n));
  const comp = (status, score, reason, explanation = {}) => ({ status, score, reason, explanation });
  return {
    student: { id: s.id, usn: s.usn, name: s.name, department: s.department, departmentName: s.departmentName, batch: s.batch, semester: s.semester, cgpa: s.cgpa },
    modelVersion: overview.model.version,
    score: {
      academic: s.scores.academic, dsa: s.scores.dsa, github: s.scores.github, developer: s.scores.developer, statuses: s.statuses,
      coverage: s.scores.developer != null ? 1 : 0.5, evidenceState: s.evidenceState, evidenceSyncedAt: s.evidenceSyncedAt, calculatedAt: s.calculatedAt,
      explanation: {
        academic: comp(s.statuses.academic, s.scores.academic, s.cgpa ? null : 'No official CGPA is recorded.', { formula: 'CGPA / 10 x 100' }),
        dsa: comp(s.statuses.dsa, s.scores.dsa, s.statuses.dsa === 'disputed' ? 'This LeetCode username is also linked by another student. It is excluded until resolved.' : null,
          { easy: 80, medium: 120, hard: 25, volume: 81.2, advanced: 77.3, contestRating: s.contestRating ? 1745 : null, nameMatch: s.leetcodeNameMatch, nameMatchSource: s.leetcodeNameMatch === 'verified' ? 'username' : null, formula: '0.6 x volume + 0.4 x advanced', syncedAt: synced }),
        github: comp(s.statuses.github, s.scores.github, null, { repositoriesConsidered: 3, repositoriesScored: 3, breadth: { points: 0 }, top: githubTop, formula: '0.95 x weighted best three + breadth', note: 'Public, original repositories only.', syncedAt: synced }),
        developer: s.scores.developer != null
          ? comp('scored', s.scores.developer, null, { weights: overview.model.weights, contributions: { academic: 45.5, dsa: 22.26, github: 16.3 }, formula: '0.5 x Academic + 0.3 x DSA + 0.2 x GitHub', note: 'Provisional software-oriented score.' })
          : comp('pending', null, 'Pending score: every component needs current evidence.', { blockers: ['GitHub: GitHub data has not been collected yet.'] }),
      },
    },
    positions: { academic: { university: { rank: 2, of: 5 }, batch: { rank: 1, of: 4 }, department: { rank: 1, of: 3 } }, dsa: { university: { rank: 1, of: 4 }, batch: { rank: 1, of: 3 } }, github: { university: { rank: 1, of: 3 }, batch: { rank: 1, of: 2 } }, developer: { university: { rank: 1, of: 2 }, batch: { rank: 1, of: 1 } } },
    topics: overview.topics.map((t) => ({ ...t, score: t.code === 'dsa.arrays' ? topicEvidence[s.id]?.score ?? null : null, stale: false, evidence: t.code === 'dsa.arrays' ? topicEvidence[s.id]?.evidence ?? null : null })),
  };
};

const entry = `import React from 'react';import {createRoot} from 'react-dom/client';
import {Workspace} from '@/features/placement/components/Workspace';
import {RankingHeader,RankingSummary,RankingTabs,RankingFilters,RankingTable,RankingDetail,RankingComparison} from '@/features/placement/components/StudentsRanking';
import {rankingQuery} from '@/features/placement/lib/ranking';
const students=${JSON.stringify(students)},overview=${JSON.stringify(overview)},topicEvidence=${JSON.stringify(topicEvidence)};
const details=${JSON.stringify(Object.fromEntries(students.map((s, i) => [s.id, detail(i + 1)])))};
// Fixture backend: filters and pages; ranks fixed per view (dense, ties by USN).
function list(q){
  const kind=q.kind||'academic';
  const value=r=>kind==='academic'?(r.cgpa==null?null:Number(r.cgpa)):kind==='topic'?(topicEvidence[r.id]&&q.topic==='dsa.arrays'?topicEvidence[r.id].score:null):r.scores[kind];
  let cohort=students.filter(r=>(!q.batch||r.batch===q.batch)&&(!q.department||r.department===q.department)&&(!q.semester||r.semester===q.semester));
  const vals=[...new Set(cohort.map(value).filter(v=>v!=null))].sort((a,b)=>b-a);
  let rows=cohort.map(r=>({...r,rank:value(r)==null?null:vals.indexOf(value(r))+1,topic:kind==='topic'?{code:q.topic,score:value(r),stale:false,evidence:topicEvidence[r.id]?.evidence??null}:null}))
    .sort((a,b)=>(a.rank??1e9)-(b.rank??1e9)||a.usn.localeCompare(b.usn));
  const ranked=rows.filter(r=>r.rank!=null).length;
  rows=rows.filter(r=>(q.show==='all'||r.rank!=null)&&(!q.search||r.name.toLowerCase().includes(q.search.toLowerCase())||r.usn.toLowerCase().includes(q.search.toLowerCase()))&&(!q.evidence||r.evidenceState===q.evidence));
  const page=Number(q.page||1),limit=q.limit?Number(q.limit):3;
  return {rows:rows.slice((page-1)*limit,page*limit),pagination:{total:rows.length,page,limit},scope:{kind,topic:q.topic??null,modelVersion:overview.model.version,ranked,batch:q.batch??null,department:q.department??null,semester:q.semester??null}};
}
function Page(){
  const parts=location.pathname.split('/').filter(Boolean);
  const params=Object.fromEntries(new URLSearchParams(location.search));
  if(parts[2]==='compare'){const ids=new URLSearchParams(location.search).getAll('ids');return <RankingComparison students={ids.map(i=>details[i])}/>;}
  if(parts[2])return <RankingDetail data={details[parts[2]]}/>;
  const q=rankingQuery(params);if(q.kind==='topic'&&!q.topic)q.topic='dsa.arrays';
  if(params.limit)q.limit=params.limit;
  const data=list(q);
  return <><RankingHeader overview={overview}/><RankingSummary overview={overview}/><RankingTabs query={q}/><RankingFilters overview={overview} query={q}/><RankingTable data={data} query={q} topicLabel={overview.topics.find(t=>t.code===q.topic)?.label}/></>;
}
createRoot(document.getElementById('root')).render(<Workspace><Page/></Workspace>);`;
const mocks = {...require("./harness-server-mocks.cjs"),
  'next/link': `import React from 'react';export default function Link({children,prefetch,scroll,...props}){return <a {...props}>{children}</a>}`,
  'next/navigation': `const router={push:path=>location.assign(path),refresh:()=>{}};export const useRouter=()=>router;export const usePathname=()=>location.pathname;`,
  '@/app/login/actions': `export async function signOut(){}`,
};
const css = '*{box-sizing:border-box}body,h1,h2,h3,p,dl,dd{margin:0}a{color:inherit;text-decoration:none}button{cursor:pointer}' + [
  'src/app/globals.css', 'src/app/workspace.css', 'src/app/placement/placement.css', 'src/app/placement/overview.css', 'src/app/placement/ranking.css',
].map((p) => fs.readFileSync(p, 'utf8').replace('@import "tailwindcss";', '')).join('\n');

(async () => {
  let browser, server, page;
  try {
    await build({ stdin: { contents: entry, resolveDir: root, loader: 'tsx' }, bundle: true, outfile: path.join(dir, 'bundle.js'), platform: 'browser', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' },
      plugins: [{ name: 'boundaries', setup(b) { b.onResolve({ filter: /.*/ }, (a) => (mocks[a.path] ? { path: a.path, namespace: 'mock' } : undefined)); b.onLoad({ filter: /.*/, namespace: 'mock' }, (a) => ({ contents: mocks[a.path], loader: 'tsx', resolveDir: root })); } }] });
    server = http.createServer((req, res) => {
      if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(fs.readFileSync(path.join(dir, 'bundle.js'))); return; }
      if (req.url.startsWith('/fonts/') && /^\/fonts\/[a-z0-9.-]+\.woff2$/.test(req.url)) { res.setHeader('Content-Type', 'font/woff2'); res.end(fs.readFileSync(path.join(root, 'public', req.url))); return; }
      res.setHeader('Content-Type', 'text/html');
      res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`);
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
    page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    const open = async (q = '', route = '/placement/students-ranking') => {
      await page.goto(origin + route + q);
      await page.locator('#placement-content, .erp-workspace').first().waitFor();
      await page.evaluate(() => document.fonts.ready);
    };
    const rows = () => page.locator('.po-rank-table tbody tr');
    const visibleText = () => page.evaluate(() => document.body.innerText);

    // Layout: every width and theme, no horizontal page overflow, no em dashes.
    for (const theme of ['light', 'dark']) for (const width of [1600, 1440, 1280, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await open('?kind=developer&show=all&limit=10');
      await page.evaluate((t) => localStorage.setItem('dsu-placement-theme', t), theme);
      await page.reload(); await page.locator('.po-' + theme).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow ${theme} ${width}`);
      assert.equal((await visibleText()).includes('—'), false, 'no em dash in visible text');
      await page.screenshot({ path: path.join(dir, `ranking-${theme}-${width}.png`), fullPage: true });
    }
    await page.setViewportSize({ width: 1440, height: 900 });

    // Header, provisional notice and real counts.
    await open();
    assert.ok(await page.getByRole('heading', { name: 'Students Ranking', level: 1 }).isVisible());
    assert.ok(await page.getByText('Academic performance, coding evidence, and project engineering insights across DSU students.').isVisible());
    assert.match(await page.getByRole('note').innerText(), /Developer scores are provisional.*50% \/ 30% \/ 20%/s);
    assert.deepEqual(await page.locator('.po-rank-metrics strong').allInnerTexts(), ['6', '5', '4', '5', '2', '1']);

    // Sidebar: item present after Department Intelligence, active on the module and its sub-pages.
    const nav = page.locator('#placement-nav');
    const hrefs = await nav.locator('a').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    assert.equal(hrefs[hrefs.indexOf('/placement/students-ranking') - 1], '/placement/student-analytics', 'Students Ranking follows the Department Intelligence group');
    assert.equal(await nav.locator('a[aria-current=page]').getAttribute('href'), '/placement/students-ranking');
    await open('', `/placement/students-ranking/${id(1)}`);
    assert.equal(await nav.locator('a[aria-current=page]').getAttribute('href'), '/placement/students-ranking', 'active on the detail page');
    await open();
    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    const link = nav.getByRole('link', { name: 'Students Ranking', exact: true });
    assert.ok(await link.isVisible());
    assert.equal(await link.getAttribute('title'), 'Students Ranking', 'tooltip names the collapsed icon');
    assert.ok(await link.locator('svg').isVisible());
    await page.getByRole('button', { name: 'Expand sidebar' }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await page.getByRole('dialog').getByRole('link', { name: 'Students Ranking', exact: true }).click();
    await page.waitForURL(origin + '/placement/students-ranking');
    await page.setViewportSize({ width: 1440, height: 900 });

    // CGPA view: dense ranks with ties, pagination, unranked students on request.
    await open();
    assert.deepEqual(await rows().locator('td.po-rank').allInnerTexts(), ['1', '2', '3']);
    assert.match(await rows().nth(2).innerText(), /8\.52/);
    await page.getByRole('link', { name: 'Next', exact: true }).click(); await page.waitForURL('**page=2**');
    assert.deepEqual(await rows().locator('td.po-rank').allInnerTexts(), ['3', '4']);
    assert.ok(await page.getByText('Showing 4 to 5 of 5 students').isVisible());
    await open('?show=all&limit=10');
    assert.match(await rows().last().innerText(), /No CGPA/);

    // Tabs: each view leads with its own measure and explains unranked students.
    await page.getByRole('link', { name: 'DSA / LeetCode', exact: true }).click(); await page.waitForURL('**kind=dsa**');
    assert.equal(await page.getByRole('link', { name: 'DSA / LeetCode', exact: true }).getAttribute('aria-current'), 'page');
    assert.ok(await page.getByRole('columnheader', { name: 'DSA score' }).isVisible());
    assert.ok(await page.getByRole('columnheader', { name: 'Contest rating' }).isVisible());
    assert.equal(await rows().filter({ hasText: 'TEST001' }).locator('.po-rank-namematch-verified').innerText(), 'Verified');
    assert.equal(await rows().filter({ hasText: 'TEST005' }).locator('.po-rank-namematch-unverified').innerText(), 'Unverified');
    assert.match(await rows().filter({ hasText: 'TEST005' }).locator('.po-rank-namematch').getAttribute('title'), /do not match/);
    await open('?kind=dsa&show=all&limit=10');
    assert.ok(await rows().filter({ hasText: 'Disputed username' }).count());
    assert.ok(await rows().filter({ hasText: 'Stale' }).count(), 'stale evidence is labelled');
    await open('?kind=developer&show=all&limit=10');
    assert.ok(await page.getByText('Pending score').first().isVisible());
    assert.ok(await page.getByRole('columnheader', { name: 'GitHub', exact: true }).isVisible());
    assert.equal(await rows().filter({ hasText: 'Awaiting sync' }).locator('td.po-rank-primary').filter({ hasText: 'Awaiting sync' }).count(), 0, 'a pending composite is not a sync state');
    await open('?kind=developer');
    assert.equal(await rows().count(), 2, 'only complete evidence is ranked');

    // Topic view: only assessable topics are offered.
    await open('?kind=topic');
    const topic = page.getByLabel('Topic');
    const offered = await topic.locator('option').allInnerTexts();
    assert.ok(offered.some((o) => o.startsWith('Arrays')) && !offered.some((o) => o.startsWith('Database')), 'unassessed subjects are not rankable');
    assert.ok(await page.getByRole('cell', { name: '60 problems solved' }).isVisible());

    // Filters update the URL and results; reset clears them.
    await open();
    await page.getByLabel('Department').selectOption('MECH');
    await page.getByRole('button', { name: 'Apply filters' }).click(); await page.waitForURL('**department=MECH**');
    assert.equal(await rows().count(), 1);
    assert.match(await page.locator('#po-ranking-rule').innerText(), /MECH/);
    await page.getByRole('link', { name: 'Reset filters' }).click(); await page.waitForURL(origin + '/placement/students-ranking');
    await page.getByLabel('Search').fill('TEST003');
    await page.getByRole('button', { name: 'Apply filters' }).click(); await page.waitForURL('**search=TEST003**');
    assert.deepEqual(await rows().locator('td.po-rank').allInnerTexts(), ['3'], 'search keeps the rank');
    await open('?search=nobody');
    assert.ok(await page.getByText('No student has enough verified evidence').isVisible() || await page.getByText('No students match these filters.').isVisible());

    // Drill-down: explanation, positions, rubric and topic honesty.
    await open();
    await page.getByRole('link', { name: 'View ranking details for Fixture Student 5' }).click();
    await page.waitForURL(`**/placement/students-ranking/${id(5)}`);
    assert.ok(await page.getByRole('heading', { name: 'Fixture Student 5' }).isVisible());
    assert.ok(await page.getByRole('link', { name: 'Full student profile' }).getAttribute('href').then((h) => h === `/placement/students/${id(5)}`));
    assert.ok(await page.getByRole('cell', { name: '2 of 5' }).first().isVisible());
    assert.ok(await page.getByRole('columnheader', { name: 'Testing and reliability' }).isVisible());
    assert.ok(await page.getByText('10 not observable').isVisible(), 'unobserved rubric points are shown, not zeroed');
    assert.ok(await page.getByText('Organisation repository, credited by commit share', { exact: false }).isVisible());
    assert.ok(await page.getByText('Not yet assessed').isVisible());
    assert.ok(await page.getByText('Neither the username nor the LeetCode profile name resembles the official name.', { exact: false }).isVisible());
    assert.ok(await page.getByText('Insufficient verified evidence').first().isVisible());
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'detail contained on mobile');
    await page.screenshot({ path: path.join(dir, 'detail-390.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(dir, 'detail-1440.png'), fullPage: true });
    await open('', `/placement/students-ranking/${id(2)}`);
    assert.ok(await page.getByText('GitHub: GitHub data has not been collected yet.').isVisible(), 'pending blockers are explained');

    // Comparison from the table.
    await open('?limit=10');
    await page.getByLabel('Select Fixture Student 1 to compare').check();
    await page.getByLabel('Select Fixture Student 5 to compare').check();
    await page.getByRole('button', { name: 'Compare selected' }).click();
    await page.waitForURL('**/students-ranking/compare?ids=**');
    assert.equal(await page.locator('.po-rank-compare thead th').count(), 3);
    assert.ok(await page.getByRole('rowheader', { name: 'Arrays' }).isVisible());
    await page.screenshot({ path: path.join(dir, 'compare-1440.png'), fullPage: true });

    // Keyboard: tabs and table region are reachable.
    await open();
    await page.getByRole('link', { name: 'GitHub projects', exact: true }).focus();
    await page.keyboard.press('Enter'); await page.waitForURL('**kind=github**');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, widths: [1600, 1440, 1280, 1024, 768, 390], themes: ['light', 'dark'],
      checks: ['header and provisional notice', 'real counts', 'sidebar order, active state, collapsed tooltip and mobile menu', 'dense ranks, ties and pagination', 'per-view columns and unranked reasons', 'topic honesty', 'filters, search and reset', 'drill-down explanation and rubric', 'comparison', 'no overflow or em dashes', 'no browser errors'],
      screenshots: dir, data: 'synthetic local component fixtures; no database access' }));
  } catch (e) {
    console.error(e.stack);
    if (page) await page.screenshot({ path: path.join(dir, 'failure.png'), fullPage: true });
    process.exitCode = 1;
  } finally {
    await browser?.close();
    await new Promise((r) => (server ? server.close(r) : r()));
  }
})();
