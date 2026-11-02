// Renders real components with synthetic data and mocked server actions.
// Database authorization/transitions are tested separately by the API verifier.
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const { build } = require("esbuild"),
  { chromium } = require("@playwright/test");
const root = process.cwd(),
  dir = path.join(root, ".qa/placement-ui");
fs.mkdirSync(dir, { recursive: true });
const id = "11111111-1111-4111-8111-111111111111";
const options = {
  batches: ["2028"],
  departments: ["CSE"],
  quotas: ["DSAT"],
  industries: ["Technology"],
  policy: { label: "Valid CGPA 6.75 and above", minimumCgpa: "6.75" },
  categories: [],
};
const student = {
  id,
  student_id: id,
  name: "Example Student",
  usn: "QA001",
  department: "CSE",
  batch: "2028",
  cgpa: "8.499",
  sgpa: "9.1",
  eligible: true,
  gender: "Male",
  quota: "DSAT",
  college_rank: 1,
  department_rank: 1,
  backlogs: 0,
  attendance: 90,
};
const company = {
  id,
  name: "Example Company",
  revision: 1,
  active: true,
  industry: "Technology",
};
const drive = {
  id,
  company_id: id,
  title: "Graduate engineer",
  rounds: ["Assessment", "Interview"],
  batch: "2028",
  package_lpa: 8,
  min_cgpa: "6.75",
  max_backlogs: 0,
  status: "upcoming",
  revision: 1,
  academic_year: "2027-28",
};
const summary = {
  students: 1,
  valid: 1,
  unclassified: 0,
  eligible: 1,
  average: 8.499,
};
const departments = [
  {
    department: "CSE",
    total: 1,
    male: 1,
    female: 0,
    other_gender: 0,
    dsat: 1,
    cet: 0,
    comedk: 0,
    unigauge: 0,
    dcet: 0,
    management: 0,
    other_quota: 0,
    at_least_six: 1,
    below_six: 0,
    eligible: 1,
    not_eligible: 0,
    unclassified: 0,
    average: 8.499,
  },
];
const categories = [
  {
    id: "advanced",
    name: "Advanced",
    conditionLabel: "8.50 and above",
    count: 0,
    eligible: 0,
  },
  {
    id: "medium",
    name: "Medium",
    conditionLabel: "6.75 to below 8.50",
    count: 1,
    eligible: 1,
    percentage: 100,
    average: 8.499,
  },
  {
    id: "needs-improvement",
    name: "Needs Improvement",
    conditionLabel: "Below 6.75",
    count: 0,
    eligible: 0,
  },
];
const data = {
  rows: departments,
  summary,
  options,
  pagination: { total: 1, page: 1, limit: 25 },
  categories,
  distribution: [],
  companies: [company],
  departments,
  drive_statuses: [],
  scheduled: [],
  recent: [],
  languages: [],
  roles: [],
  readiness: [],
};

// ---- Student Skills Intelligence fixtures (shapes from the backend contract) ----
const categoriesData = {
  batch: "2027",
  batches: ["2028", "2027"],
  departments: ["CSE", "ECE", "__missing__"],
  total: 120,
  unclassified: 2,
  cards: [
    { id: "advanced", name: "Advanced", range: "8.50 and above", total: 30, cohortPercentage: 25, averageCgpa: "8.91", eligible: 30, eligibilityPercentage: 100 },
    { id: "medium", name: "Medium", range: "6.75 – 8.49", total: 70, cohortPercentage: 58.3, averageCgpa: "7.62", eligible: 70, eligibilityPercentage: 100 },
    { id: "needs-improvement", name: "Needs Improvement", range: "Below 6.75", total: 18, cohortPercentage: 15, averageCgpa: "6.12", eligible: 0, eligibilityPercentage: 0 },
  ],
};
const rankedRow = (n, rank, batchRank, extra = {}) => ({
  id: `00000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`,
  usn: `ENG23CS00${n}`,
  name: `Ranked Student ${n}`,
  department: n % 2 ? "CSE" : "ECE",
  batch: "2027",
  semester: "7",
  cgpa: (8.9 - n / 100).toFixed(2),
  category: "advanced",
  eligible: true,
  categoryRank: rank,
  batchRank,
  skillStatus: ["complete", "incomplete", "not_started"][n % 3],
  profileUrl: "/placement/students/x",
  ...extra,
});
const directoryPage2 = {
  rows: [rankedRow(26, 25, 27), rankedRow(27, 26, 28), rankedRow(28, 26, 28), rankedRow(29, 27, 29), rankedRow(30, 28, 31)],
  pagination: { total: 30, page: 2, limit: 25 },
  scope: { batch: "2027", category: "advanced", rule: "Dense rank by official CGPA within the passing-out batch and category. Filters do not change ranks." },
};
const months = ["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];
const definitions = {
  totalStudents: "Students in the selected cohort (passing-out batch and department filters).",
  eligible: "Students with a valid CGPA of 6.75 or above.",
  placed: "Distinct students in the cohort holding at least one active offer (offered or accepted). Declined and revoked offers do not count.",
  placementRate: "Students placed divided by total students, as a percentage with 2 decimals.",
  eligiblePlaced: "Placement eligible students who are placed.",
  eligiblePlacementRate: "Eligible students placed divided by eligible students, as a percentage with 2 decimals.",
  companies: "Companies with at least one drive for the selected batch. The department filter does not apply to drives or companies.",
  activeDrives: "Drives for the selected batch with status upcoming or ongoing. The department filter does not apply to drives.",
  acceptedOffers: "Offers to students in the cohort with status accepted.",
  activeOffers: "Offers to students in the cohort with status offered or accepted.",
  averageCgpa: "Mean of valid CGPAs in the cohort, rounded to 2 decimals.",
  progress: "Monthly line chart (Asia/Kolkata) from the first month with data to the current month, at most the latest 24 months. Students placed counts each student once, in the month their first active offer was recorded. Offers recorded counts offers of any status. Dates are the month an offer was recorded in the ERP, because no real offer date is stored. Drives completed counts completed drives by drive date.",
  status: "Donut chart: placed, eligible not placed, not eligible not placed, and CGPA unknown not placed. The four segments add up to total students.",
  departments: "Bar chart per department: total students, placement eligible students and students placed.",
};
const chartsData = {
  filters: { batch: "2027", department: null },
  kpis: { totalStudents: 120, eligible: 100, placed: 46, placementRate: 38.33, eligiblePlaced: 45, eligiblePlacementRate: 45, companies: 18, activeDrives: 3, acceptedOffers: 31, activeOffers: 52, averageCgpa: "7.84" },
  progress: months.map((month, i) => ({ month, studentsPlaced: [0, 1, 3, 2, 5, 4, 6, 3, 2, 8, 5, 4, 2, 1][i], offersRecorded: [1, 2, 4, 3, 6, 6, 7, 4, 3, 9, 6, 5, 3, 2][i], drivesCompleted: [1, 0, 2, 1, 1, 2, 3, 1, 0, 2, 1, 1, 1, 0][i] })),
  status: [
    { key: "placed", label: "Placed", count: 46 },
    { key: "eligible_not_placed", label: "Eligible, not placed", count: 55 },
    { key: "not_eligible_not_placed", label: "Not eligible, not placed", count: 17 },
    { key: "unknown_not_placed", label: "CGPA unknown, not placed", count: 2 },
  ],
  departments: [
    { department: "AI&ML", total: 18, eligible: 16, placed: 9 },
    { department: "CSE", total: 42, eligible: 38, placed: 20 },
    { department: "CSE (Cyber Security)", total: 15, eligible: 12, placed: 5 },
    { department: "ECE", total: 25, eligible: 19, placed: 8 },
    { department: "ME", total: 18, eligible: 15, placed: 4 },
    { department: null, total: 2, eligible: 0, placed: 0 },
  ],
  definitions,
};
const chartsEmpty = {
  filters: { batch: "2031", department: null },
  kpis: { totalStudents: 0, eligible: 0, placed: 0, placementRate: null, eligiblePlaced: 0, eligiblePlacementRate: null, companies: 0, activeDrives: 0, acceptedOffers: 0, activeOffers: 0, averageCgpa: null },
  progress: [],
  status: [
    { key: "placed", label: "Placed", count: 0 },
    { key: "eligible_not_placed", label: "Eligible, not placed", count: 0 },
    { key: "not_eligible_not_placed", label: "Not eligible, not placed", count: 0 },
    { key: "unknown_not_placed", label: "CGPA unknown, not placed", count: 0 },
  ],
  departments: [],
  definitions,
};
const ranking = { batchRank: 3, categoryRank: 3, batchSize: 118, categorySize: 30, scope: "batch" };
const intelligence = {
  core: { id, usn: "QA001", name: "Example Student", department: "CSE", departmentName: "Computer Science and Engineering", program: "B.Tech", batch: "2027", semester: "7", cgpa: "8.52", sgpa: "8.10", category: "advanced", categoryLabel: "Advanced", eligible: true, ranking, skillStatus: "complete", provenance: "institution_verified" },
  ranking,
  skills: {
    visibility: { platforms: true, projects: true, activity: true, summary: true },
    onboarding: { complete: true, completedAt: "2026-10-12T09:00:00Z", consented: true },
    accounts: [
      { platform: "github", state: "linked", handle: "example-dev", profileUrl: "https://github.com/example-dev", authMethod: "github_app", ownership: "platform_verified", visible: true, syncStatus: "completed", syncError: null, lastSyncedAt: "2026-10-21T10:00:00Z", submitted: {},
        metrics: [
          { metric: "repos.public", label: "Public repositories", value: "14", verification: "platform_verified", method: "github_api" },
          { metric: "followers", label: "Followers", value: 23, verification: "platform_verified", method: "github_api" },
          { metric: "stars.total", label: "Stars received", value: 41, verification: "platform_verified", method: "github_api" },
        ] },
      { platform: "leetcode", state: "linked", handle: "example_lc", profileUrl: "https://leetcode.com/u/example_lc/", authMethod: "link_only", ownership: "student_submitted", visible: true, syncStatus: null, syncError: null, lastSyncedAt: null, submitted: { solved: 240, easy: 120, medium: 100, hard: 20, contestRating: 1650 }, metrics: [] },
      { platform: "hackerrank", state: "declared_none", handle: null, profileUrl: null, ownership: null, submitted: {}, metrics: [] },
      { platform: "linkedin", state: "linked", handle: "example", profileUrl: "https://www.linkedin.com/in/example", authMethod: "link_only", ownership: "student_submitted", visible: true, submitted: {}, metrics: [] },
      { platform: "huggingface", state: "linked", handle: "example-hf", profileUrl: "https://huggingface.co/example-hf", authMethod: "link_only", ownership: "platform_verified", visible: true, syncStatus: "completed", lastSyncedAt: "2026-10-20T10:00:00Z", submitted: {},
        metrics: [
          { metric: "models.count", label: "Models", value: "2", verification: "platform_verified" },
          { metric: "spaces.count", label: "Spaces", value: "1", verification: "platform_verified" },
        ] },
    ],
    featured: [
      { position: 1, source: "github_pinned", repo: { name: "campus-navigator", fullName: "example-dev/campus-navigator", url: "https://github.com/example-dev/campus-navigator", description: "Indoor navigation for the university campus with offline maps.", primaryLanguage: "TypeScript", stars: 12, pushedAt: "2026-09-30T10:00:00Z", hasReadme: true } },
      { position: 2, source: "student_selected", repo: { name: "crop-yield-ml", fullName: "example-dev/crop-yield-ml", url: "https://github.com/example-dev/crop-yield-ml", description: "Crop yield prediction from public rainfall data.", primaryLanguage: "Python", stars: 7, pushedAt: "2026-08-14T10:00:00Z", hasReadme: true } },
    ],
    repositories: [
      { name: "crop-yield-ml", fullName: "example-dev/crop-yield-ml", url: "https://github.com/example-dev/crop-yield-ml", primaryLanguage: "Python", stars: 7 },
      { name: "dsa-practice", fullName: "example-dev/dsa-practice", url: "https://github.com/example-dev/dsa-practice", primaryLanguage: "C++", stars: 2 },
      { name: "campus-navigator", fullName: "example-dev/campus-navigator", url: "https://github.com/example-dev/campus-navigator", primaryLanguage: "TypeScript", stars: 12 },
      { name: "notes-api", fullName: "example-dev/notes-api", url: "javascript:alert(1)", primaryLanguage: "Python", stars: 0 },
    ],
    // Real backend keys (METRIC_LABELS). The calendar must never render as text.
    activity: [
      { metric: "activity.active_days", label: "Active days (last 12 months)", value: 143, verification: "platform_verified" },
      { metric: "activity.calendar", label: "Contribution calendar", value: { days: [{ date: "2026-10-20", count: 3 }, { date: "2026-10-21", count: 1 }] }, verification: "platform_verified" },
      { metric: "activity.current_streak", label: "Current contribution streak (days)", value: 5, verification: "platform_verified" },
      { metric: "activity.longest_streak", label: "Longest contribution streak (days)", value: 21, verification: "platform_verified" },
      { metric: "contributions.commits_12m", label: "Commits (last 12 months)", value: 318, verification: "platform_verified" },
      { metric: "contributions.lines_added_52w", label: "Lines added (last 52 weeks)", value: { value: 18240, counted: 8, eligible: 10, pending: 2 }, verification: "platform_verified" },
      { metric: "contributions.private_12m", label: "Private contributions (last 12 months)", value: 40, verification: "platform_verified" },
      { metric: "contributions.total_12m", label: "Contributions (last 12 months)", value: 412, verification: "platform_verified" },
    ],
  },
  summary: { id, createdAt: "2026-10-18T08:00:00Z", model: "test/model", content: { summary: { text: "Official CGPA in the Advanced category with two verified GitHub projects in TypeScript and Python.", evidence: ["e1"] } }, evidence: [], reviewedAt: null, provenance: "ai_generated" },
  readiness: { status: "descriptive", items: [
    { key: "academic_eligibility", label: "Academic eligibility", state: "met", detail: "The official CGPA meets the institution placement rule (6.75 or above). Eligibility is decided by official CGPA only.", provenance: "institution_verified" },
    { key: "profile_completeness", label: "Profile completeness", state: "met", detail: "Skills onboarding is complete.", provenance: "student_submitted" },
    { key: "verified_projects", label: "Verified technical projects", state: "met", detail: "3 public repositories are verified through GitHub, including campus-navigator and crop-yield-ml.", provenance: "platform_verified" },
    { key: "coding_platforms", label: "Coding platforms", state: "met", detail: "Provided: LeetCode (student submitted) and Hugging Face (platform verified). Not provided: HackerRank and Kaggle. Absence of a platform is not evidence of skill level.", provenance: "student_submitted" },
    { key: "missing_information", label: "Missing profile information", state: "missing", detail: "Not provided yet: Kaggle.", provenance: "unavailable" },
  ] },
  provenance: {
    institution_verified: "Official record held by the university (ERP).",
    platform_verified: "Read from the platform itself through a verified connection.",
    student_submitted: "Entered by the student and not verified by the platform.",
    ai_generated: "Written by AI from the evidence listed with it. Review before relying on it.",
    unavailable: "Not available or not shared.",
  },
  purpose: "officer",
};
const hiddenIntelligence = {
  ...intelligence,
  skills: {
    ...intelligence.skills,
    visibility: { platforms: false, projects: false, activity: false, summary: false },
    accounts: intelligence.skills.accounts.map((a) => ({ platform: a.platform, state: a.state, handle: null, profileUrl: null, ownership: null, submitted: {}, metrics: [] })),
    featured: [], repositories: [], activity: [],
  },
  summary: null,
};
// Before consent (onboarding not complete) the backend returns per-platform
// state only, with no handles, metrics, projects, activity or summary.
const pendingIntelligence = {
  ...intelligence,
  core: { ...intelligence.core, skillStatus: "incomplete" },
  skills: {
    ...intelligence.skills,
    onboarding: { complete: false, completedAt: null, consented: false },
    accounts: intelligence.skills.accounts.map((a) => ({ platform: a.platform, state: a.state, handle: null, profileUrl: null, ownership: null, submitted: {}, metrics: [] })),
    featured: [], repositories: [], activity: [],
  },
  summary: null,
  summaryWithheld: false,
};
// The latest summary used information the student has since hidden.
const withheldIntelligence = { ...intelligence, summary: null, summaryWithheld: true };
const legacyStudent = {
  ...student,
  profile: { gender: "Male", quota: "DSAT" },
  academic: { backlogs: 0, attendance: 90 },
  contact: { email: "qa001@example.edu" },
  offers: [{ id, student_id: id, usn: "QA001", name: "Example Student", department: "CSE", company: "Example Company", title: "Graduate engineer", package_lpa: 8, category: "regular", status: "accepted", active: true }],
  registrations: [{ id, drive_id: id, drive: "Graduate engineer", company: "Example Company", status: "selected", rounds: ["Assessment", "Interview"], results: [{ round_name: "Assessment", result: "pass" }], created_at: "2026-08-01" }],
  timeline: [],
};
const entry = `import React from 'react';import {createRoot} from 'react-dom/client';
import {Workspace} from '@/features/placement/components/Workspace';import {ReportBody,ReportFilters} from '@/features/placement/components/Reports';import {DriveEditor} from '@/features/placement/components/DriveEditor';import {DriveCandidates} from '@/features/placement/components/DriveCandidates';import {AssistantChat} from '@/features/assistant/components/AssistantChat';import {DeleteRecord} from '@/features/placement/components/Controls';import {SECTIONS} from '@/features/placement/lib/types';import {PlacementOverview} from '@/features/placement/components/Overview';import {CategoryCards,CategorySummary,CohortFilters,RankedDirectory} from '@/features/placement/components/CategoryDirectory';import {IntelligenceProfile} from '@/features/placement/components/UnifiedProfile';import {StudentProfile} from '@/features/placement/components/StudentProfile';
const categoriesData=${JSON.stringify(categoriesData)},directoryPage2=${JSON.stringify(directoryPage2)},chartsData=${JSON.stringify(chartsData)},chartsEmpty=${JSON.stringify(chartsEmpty)},intelligence=${JSON.stringify(intelligence)},hiddenIntelligence=${JSON.stringify(hiddenIntelligence)},pendingIntelligence=${JSON.stringify(pendingIntelligence)},withheldIntelligence=${JSON.stringify(withheldIntelligence)},legacyStudent=${JSON.stringify(legacyStudent)};
const data=${JSON.stringify(data)},student=${JSON.stringify(student)},drive=${JSON.stringify(drive)},company=${JSON.stringify(company)};
const overviewData={...data,options:{...data.options,batches:['2027']},summary:{students:120,placed:46,unplaced:74,placement_percentage:38.33,offers:52,accepted:31,average:10,highest:18,median:9,drives:5,companies:18},categories:['regular','dream','super-dream','mega'].map((category,i)=>({category,offers:[20,18,10,4][i]})),drive_statuses:[{status:'upcoming',count:3},{status:'completed',count:2}],departments:chartsData.departments.map(d=>({...d,placement_percentage:d.total?100*d.placed/d.total:0,average:null,highest:null})),scheduled:[],recent:[],companies:[]};
const section=location.pathname.split('/')[2]||'batch',query=Object.fromEntries(new URLSearchParams(location.search));let content;
const segment=location.pathname.split('/')[3];
if(section==='categories'&&!segment)content=<><h1>Student categories</h1><CohortFilters action='/placement/categories' batches={categoriesData.batches} departments={categoriesData.departments} query={{batch:'2027'}}/><CategorySummary data={categoriesData}/><CategoryCards cards={categoriesData.cards} cohort={{batch:'2027'}}/></>;
else if(section==='categories')content=<><h1>Advanced students</h1><a className='erp-secondary' download href='/placement/export/ranked?category=advanced&batch=2027'>Export CSV</a><CohortFilters action='/placement/categories/advanced' batches={categoriesData.batches} departments={categoriesData.departments} query={{...query,batch:'2027'}} extra/><RankedDirectory data={directoryPage2} query={{...query,batch:'2027'}} category='advanced'/></>;
else if(section==='overview-empty')content=<PlacementOverview data={{...overviewData,summary:{students:0,drives:0,unplaced:0},departments:[],categories:[],drive_statuses:[]}} charts={chartsEmpty} query={query} today='2026-10-26'/>;
else if(section==='overview-error')content=<PlacementOverview data={overviewData} charts={null} query={query} today='2026-10-26'/>;
else if(section==='overview')content=<PlacementOverview data={overviewData} charts={chartsData} query={query} today='2026-10-26'/>;
else if(section==='students')content=<StudentProfile student={legacyStudent} intelligence={<IntelligenceProfile profile={query.hidden?hiddenIntelligence:query.pending?pendingIntelligence:query.withheld?withheldIntelligence:intelligence}/>}/>;
else if(section==='drive-editor')content=<><h1>Create a placement drive.</h1><DriveEditor companies={[company]} options={data.options}/><DeleteRecord kind='company' record={company} back='/placement/companies'/></>;
else if(section==='drive-pool')content=<DriveCandidates drive={drive} rows={[{...student,registration_id:null,reason:null}]}/>;
else if(section==='assistants')content=<AssistantChat assistant='friday' initialHistory={[]} batches={['2028']} initialDiagnostics={{mode:'Fixture data'}}/>;
else {if(['students','ranking','points','github','domain','tests','talent'].includes(section))data.rows=[student];if(section==='companies')data.rows=[company];if(section==='drives')data.rows=[drive];if(['offers','multiple-offers'].includes(section))data.rows=[];content=<><h1>{SECTIONS[section]?.title||section}</h1><ReportFilters section={section} data={data} query={query}/><ReportBody section={section} data={data} query={query}/></>;}
createRoot(document.getElementById('root')).render(<Workspace>{content}</Workspace>);`;
const mock = {...require("./harness-server-mocks.cjs"),
  "next/link": `import React from 'react';export default function Link({children,prefetch,scroll,...props}){return <a {...props}>{children}</a>}`,
  "next/navigation": `const router={push:path=>location.assign(path),refresh:()=>{window.__refreshes=(window.__refreshes||0)+1}};export const useRouter=()=>router;export const usePathname=()=>location.pathname;`,
  "@/app/login/actions": `export async function signOut(){window.__signedOut=true}`,
  "@/app/placement/actions": `export async function changePlacement(previous,form){window.__lastMutation=Object.fromEntries(form);sessionStorage.setItem("lastMutation",JSON.stringify(window.__lastMutation));return {error:'',success:'Changes saved.'}}`,
};
const css =
  "*{box-sizing:border-box}body,h1,h2,h3,p,dl,dd{margin:0}a{color:inherit;text-decoration:none}button{cursor:pointer}" +
  fs
    .readFileSync("src/app/globals.css", "utf8")
    .replace('@import "tailwindcss";', "") +
  fs.readFileSync("src/app/workspace.css", "utf8") +
  fs.readFileSync("src/app/placement/placement.css", "utf8") + fs.readFileSync("src/app/placement/overview.css", "utf8");
(async () => {
  let browser, server;
  try {
    await build({
      stdin: { contents: entry, resolveDir: root, loader: "tsx" },
      bundle: true,
      write: true,
      outfile: path.join(dir, "bundle.js"),
      platform: "browser",
      jsx: "automatic",
      define: { "process.env.NODE_ENV": '"development"' },
      plugins: [
        {
          name: "component-boundaries",
          setup(b) {
            b.onResolve({ filter: /.*/ }, (args) => {
              if (mock[args.path])
                return { path: args.path, namespace: "mock" };
            });
            b.onLoad({ filter: /.*/, namespace: "mock" }, (args) => ({
              contents: mock[args.path],
              loader: "tsx",
              resolveDir: root,
            }));
          },
        },
      ],
    });
    server = http.createServer((req, res) => {
      if (req.url === "/bundle.js") {
        res.setHeader("Content-Type", "text/javascript");
        res.end(fs.readFileSync(path.join(dir, "bundle.js")));
        return;
      }
      if (req.url?.includes("assistant-api")) {
        res.setHeader("Content-Type", "application/json");
        if (req.method === "GET") {
          res.end(
            JSON.stringify({
              data: { rows: [] },
              diagnostics: { mode: "Fixture" },
            }),
          );
          return;
        }
        res.end(
          JSON.stringify({
            text: "1 matching student. CGPA 8.499.",
            conversationId: id,
            students: [student],
          }),
        );
        return;
      }
      res.setHeader("Content-Type", "text/html");
      res.end(
        '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' +
          css +
          '</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
      );
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const origin = "http://127.0.0.1:" + server.address().port;
    browser = await chromium.launch({
      headless: true,
      ...(process.platform === "win32" ? { channel: "msedge" } : {}),
    });
    const page = await browser.newPage({
        viewport: { width: 1600, height: 1000 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(origin + "/placement/batch?batch=2028");
    await page.getByRole("heading", { name: "Branch breakdown" }).waitFor();
    assert.equal(await page.locator(".po-card").count(), 3);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    const rect = await page.evaluate(() => ({
      aside: document.querySelector(".erp-sidebar").getBoundingClientRect()
        .right,
      main: document.querySelector(".erp-workspace").getBoundingClientRect()
        .left,
    }));
    assert.equal(rect.aside, rect.main);
    await page.screenshot({
      path: path.join(dir, "batch-desktop.png"),
      fullPage: true,
    });
    // Collapsing keeps the menu as an icon rail rather than emptying it, and
    // every link keeps its accessible name.
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    assert.equal(await page.locator("#placement-nav").isVisible(), true);
    assert.equal(await page.locator("#placement-nav a svg:visible").count(), await page.locator("#placement-nav a:visible").count());
    await page.getByRole("link", { name: "Student tools" }).waitFor();
    await page.getByRole("link", { name: "Data imports" }).waitFor();
    await page.getByRole("link", { name: "Batch analytics" }).waitFor();
    await page.getByRole("button", { name: "Expand sidebar" }).click();
    await page.getByRole("button", { name: "Use dark theme" }).click();
    assert.ok(await page.locator(".po-dark").count());
    // Branch links filter the retained batch view, without using retired routes.
    await page.getByRole("link", {name:"CSE ↗",exact:true}).click();
    assert.equal(new URL(page.url()).searchParams.get('batch'),'2028');
    assert.equal(new URL(page.url()).searchParams.get('department'),'CSE');
    await page.getByLabel('Search',{exact:true}).fill('Example');
    await page.getByRole('button',{name:'Apply filters'}).click();
    assert.equal(new URL(page.url()).searchParams.get('search'),'Example');
    await page.goto(origin + "/placement/drive-editor");
    await page.getByRole("button", { name: "Add round" }).click();
    await page
      .getByRole("textbox", { name: "Round 3 name" })
      .fill("HR interview");
    await page.getByRole("button", { name: "Move round 3 up" }).click();
    assert.equal(
      await page.getByRole("textbox", { name: "Round 2 name" }).inputValue(),
      "HR interview",
    );
    await page.getByLabel("Company", { exact: true }).selectOption(id);
    await page.getByLabel("Job role").fill("Graduate engineer");
    await page.getByLabel("Salary package (LPA)").fill("8.5");
    await page.getByLabel("Academic year").fill("2027-28");
    await page.getByLabel("Passing-out batch").selectOption("2028");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.waitForFunction(() => sessionStorage.getItem("lastMutation"));
    const submitted = await page.evaluate(() =>
      JSON.parse(JSON.parse(sessionStorage.getItem("lastMutation")).payload),
    );
    assert.deepEqual(submitted.rounds, [
      "Assessment",
      "HR interview",
      "Interview",
    ]);
    assert.equal(submitted.min_cgpa, "6.75");
    await page.goto(origin + "/placement/drive-pool");
    await page
      .getByRole("checkbox", { name: "Select Example Student" })
      .check();
    await page
      .getByLabel("Action", { exact: true })
      .selectOption("round.record");
    await page
      .getByText("Round, withdrawal and offer actions require", {
        exact: false,
      })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Apply result to selection" })
        .count(),
      0,
    );
    await page.goto(origin + "/placement/assistants/friday");
    await page
      .getByLabel("Message", { exact: true })
      .fill("Find student Example");
    await page.getByRole("button", { name: "Send request" }).click();
    await page
      .getByText("1 matching student. CGPA 8.499.", { exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Draft email to Example Student" })
      .click();
    await page
      .getByRole("heading", { name: "Email Example Student" })
      .waitFor();
    // A 27 inch 2560 x 1440 display scales the workspace up by 1.25.
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.goto(origin + "/placement/batch?batch=2028");
    await page.getByRole("heading", { name: "Branch breakdown" }).waitFor();
    assert.equal(
      await page.evaluate(() =>
        getComputedStyle(document.documentElement).fontSize,
      ),
      "20px",
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({ path: path.join(dir, "batch-2560.png") });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + "/placement/batch?batch=2028");
    await page.getByRole("heading", { name: "Branch breakdown" }).waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: path.join(dir, "batch-mobile.png"),
      fullPage: true,
    });
    // The sections that remain in SECTIONS after the removals in 6c13f25.
    for (const section of [
      "overview",
      "companies",
      "drives",
      "company-reports",
      "batch",
      "tests",
    ]) {
      await page.goto(origin + "/placement/" + section);
      await page.locator("h1").waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        "Overflow: " + section,
      );
    }

    // ---- Student Skills Intelligence pages: light and dark, 390 / 1440 / 2560.
    const intelPages = [
      { name: "categories", url: "/placement/categories?batch=2027", ready: "View ranked students" },
      { name: "directory", url: "/placement/categories/advanced?batch=2027&page=2", ready: "Ranked students" },
      { name: "overview-charts", url: "/placement/overview?batch=2027", ready: "Placement progress by month" },
      { name: "overview-empty", url: "/placement/overview-empty", ready: "Placement progress by month" },
      { name: "profile", url: `/placement/students/${id}`, ready: "Technical contributions" },
      { name: "profile-hidden", url: `/placement/students/${id}?hidden=1`, ready: "Technical contributions" },
      { name: "profile-pending", url: `/placement/students/${id}?pending=1`, ready: "Technical contributions" },
    ];
    const visibleText = (selector) =>
      page.evaluate((sel) => [...document.querySelectorAll(sel)].map((n) => n.innerText).join("\n"), selector);
    for (const theme of ["light", "dark"])
      for (const [width, height] of [[390, 844], [1440, 900], [2560, 1440]]) {
        await page.setViewportSize({ width, height });
        for (const p of intelPages) {
          await page.goto(origin + p.url);
          await page.evaluate((t) => localStorage.setItem("dsu-placement-theme", t), theme);
          await page.reload();
          await page.getByText(p.ready, { exact: false }).first().waitFor();
          if (theme === "dark") await page.locator(".po-dark").waitFor();
          const label = `${p.name} ${theme} ${width}`;
          assert.equal(
            await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
            false,
            "Overflow: " + label,
          );
          const scope = p.name.startsWith("overview") ? ".po-overview, .po-chart" : "#placement-content";
          assert.ok(!(await visibleText(scope)).includes("\u2014"), "Em dash: " + label);
          await page.screenshot({ path: path.join(dir, `intel-${p.name}-${theme}-${width}.png`), fullPage: true });
        }
      }
    // Categories: three cards, working links and real download links.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(origin + "/placement/categories?batch=2027");
    await page.getByText("View ranked students").first().waitFor();
    assert.equal(await page.locator(".po-category-card").count(), 3);
    const cardText = await page.locator(".po-category-card").first().innerText();
    for (const expected of ["25.0%", "8.91", "100.0%", "8.50 and above"]) assert.ok(cardText.includes(expected), expected);
    assert.equal(
      await page.locator(".po-category-card").first().getByRole("link", { name: "View ranked students" }).getAttribute("href"),
      "/placement/categories/advanced?batch=2027",
    );
    const exportLink = page.getByRole("link", { name: "Export Advanced ranked students as CSV" });
    assert.equal(await exportLink.getAttribute("download"), "");
    assert.equal(await exportLink.getAttribute("href"), "/placement/export/ranked?category=advanced&batch=2027");
    assert.ok(await page.getByRole("link", { name: "Student categories" }).getAttribute("aria-current"));
    // Ranked directory page 2: ranks continue from the backend, ties kept.
    await page.goto(origin + "/placement/categories/advanced?batch=2027&page=2&sort=rank");
    await page.getByRole("heading", { name: "Ranked students" }).waitFor();
    const ranks = await page.locator(".po-ranked-table tbody tr").evaluateAll((rows) => rows.map((r) => [r.cells[0].innerText, r.cells[1].innerText]));
    assert.deepEqual(ranks, [["25", "27"], ["26", "28"], ["26", "28"], ["27", "29"], ["28", "31"]]);
    const headers = await page.locator(".po-ranked-table thead th").allInnerTexts();
    assert.ok(/^Category rank/i.test(headers[0]) && /^Batch rank/i.test(headers[1]), String(headers));
    assert.ok(!headers.some((h) => /CGPA rank|Unranked/i.test(h)), "one rank wording: " + headers);
    assert.match(await page.locator(".po-ranked-table .po-status-complete").first().getAttribute("title"), /GitHub, LeetCode, and LinkedIn are linked/);
    assert.match(await page.locator(".po-ranked-table .po-status-not_started").first().getAttribute("title"), /not started/);
    assert.ok((await page.locator("#po-skill-rule").innerText()).includes("disconnected"));
    assert.ok((await page.locator(".po-ranked-table thead th").first().getAttribute("title")).includes("Filters do not change ranks"));
    assert.ok((await page.locator("#po-rank-rule").innerText()).includes("Filters do not change ranks"));
    assert.equal(await page.getByRole("link", { name: "View profile of Ranked Student 26" }).getAttribute("href"), "/placement/students/00000000-0000-4000-8000-000000000026");
    assert.equal(await page.getByRole("link", { name: "← Previous" }).getAttribute("href"), "/placement/categories/advanced?batch=2027&sort=rank");
    assert.equal(await page.locator("a[download]").first().getAttribute("download"), "");
    assert.ok((await page.locator(".erp-pagination").innerText()).includes("Showing 26 to 30 of 30 students"));
    await page.getByLabel("Placement eligibility").selectOption("eligible");
    await page.getByRole("button", { name: "Apply filters" }).click();
    assert.equal(new URL(page.url()).searchParams.get("eligibility"), "eligible");
    assert.equal(new URL(page.url()).searchParams.get("batch"), "2027");
    // Overview charts: three labelled charts with hidden tables; empty states are honest.
    await page.goto(origin + "/placement/overview?batch=2027");
    await page.getByRole("heading", { name: "Placement progress by month" }).waitFor();
    const charts = page.locator(".po-overview [role=img][aria-label], .po-overview .po-bars[role=group][aria-label]");
    assert.equal(await charts.count(), 3);
    for (const labelText of await charts.evaluateAll((n) => n.map((x) => x.getAttribute("aria-label"))))
      assert.ok(labelText.length > 20, labelText);
    assert.equal(await page.locator(".po-overview .po-chart-data table").count(), 3);
    assert.ok((await page.locator(".po-chart-line").innerText()).includes("when offers were recorded in the ERP"));
    const donutText = await page.locator(".po-chart-donut .po-legend").innerText();
    for (const expected of ["46", "38.3%", "55", "45.8%", "17", "14.2%", "2", "1.7%"]) assert.ok(donutText.includes(expected), expected);
    assert.equal(await page.locator(".po-overview-primary article").count(), 4);
    assert.ok((await page.locator(".po-overview-primary").innerText()).includes("38.33%"));
    await page.goto(origin + "/placement/overview-empty");
    await page.getByText("No placement events recorded yet", { exact: false }).waitFor();
    assert.equal(await page.locator(".po-chart-empty").count(), 1);
    assert.equal(await page.locator(".po-overview [role=img]").count(), 0);
    assert.equal(await page.locator(".po-overview-primary").count(), 0);
    await page.goto(origin + "/placement/overview-error");
    await page.getByText("Cohort analytics are unavailable.", { exact: false }).waitFor();
    // Unified profile: three regions, provenance, safe links, no score.
    await page.goto(origin + `/placement/students/${id}`);
    await page.getByRole("heading", { name: "Technical contributions" }).waitFor();
    assert.equal(await page.locator(".po-intel-grid > section").count(), 3);
    const profileText = await page.locator(".po-intel").innerText();
    for (const expected of ["Category rank", "Batch rank", "3 of 30", "3 of 118", "8.52", "Pinned on GitHub", "Selected by student", "Does not use this platform", "Not provided or not shared", "Student submitted", "AI generated", "Repository language share",
      "Contributions (last 12 months)\n412", "Commits (last 12 months)\n318", "Private contributions (last 12 months)\n40", "Current contribution streak (days)\n5", "Longest contribution streak (days)\n21", "Active days (last 12 months)\n143",
      "18,240 lines (8 of 10 repositories counted; partial, 2 pending)", "Met", "Missing"])
      assert.ok(profileText.includes(expected), expected);
    for (const absent of ["calendar", "days:", "2026-10-20", "[object Object]", "value:", "CGPA rank", "Unranked"])
      assert.ok(!profileText.includes(absent), "must not show " + absent);
    assert.ok(!/score/i.test(await page.locator(".po-readiness").innerText()));
    for (const link of await page.locator(".po-intel a[target=_blank]").evaluateAll((n) => n.map((a) => [a.getAttribute("href"), a.getAttribute("rel")])))
      assert.ok(link[0].startsWith("https://") && link[1] === "noopener noreferrer", String(link));
    assert.equal(await page.locator('.po-intel a[href^="javascript"]').count(), 0);
    assert.equal(await page.locator(".po-prov-legend > div").count(), 5);
    await page.getByRole("heading", { name: "Placement record" }).waitFor();
    await page.goto(origin + `/placement/students/${id}?hidden=1`);
    await page.getByRole("heading", { name: "Technical contributions" }).waitFor();
    assert.ok((await page.locator(".po-intel").innerText()).includes("Hidden by the student"));
    // Before consent: platform states only, said honestly, no handles or figures.
    await page.goto(origin + `/placement/students/${id}?pending=1`);
    await page.getByRole("heading", { name: "Technical contributions" }).waitFor();
    const pendingText = await page.locator(".po-intel").innerText();
    for (const expected of ["Shared after the student completes onboarding", "Linked. GitHub details are not available yet.", "Linked. LeetCode details are not available yet.", "Does not use this platform", "Not provided or not shared", "Incomplete"])
      assert.ok(pendingText.includes(expected), expected);
    for (const absent of ["Hidden by the student", "No AI summary has been generated yet", "No featured projects yet", "example-dev", "example_lc"])
      assert.ok(!pendingText.includes(absent), "pending must not say " + absent);
    assert.equal(await page.locator(".po-intel a[target=_blank]").count(), 0);
    // A summary built on information the student later hid is withheld, and said so.
    await page.goto(origin + `/placement/students/${id}?withheld=1`);
    await page.getByRole("heading", { name: "Technical contributions" }).waitFor();
    const withheldText = await page.locator(".po-summary").innerText();
    assert.ok(withheldText.includes("Summary withheld because it used information the student has since hidden."), withheldText);
    assert.ok(!withheldText.includes("No AI summary has been generated yet"));
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        passed: true,
        checks: [
          "6 reports",
          "responsive overflow",
          "sidebar collapses to icons",
          "theme",
          "branch drill-down preserves cohort filters",
          "ordered rounds",
          "drive form serialization",
          "mixed registration selection guard",
          "assistant request and email draft",
          "student categories, ranked directory page 2, overview charts (data, empty, error), unified profile (shared and hidden) in light and dark at 390, 1440 and 2560",
        ],
        data: "synthetic component fixtures; server mutations mocked",
      }),
    );
  } catch (e) {
    console.error(e.stack);
    const page = browser?.contexts()[0]?.pages()[0];
    if (page) {
      console.log(await page.locator("body").innerText());
      await page.screenshot({
        path: path.join(dir, "failure.png"),
        fullPage: true,
      });
    }
    process.exitCode = 1;
  } finally {
    await browser?.close();
    await new Promise((r) => (server ? server.close(r) : r()));
  }
})();
