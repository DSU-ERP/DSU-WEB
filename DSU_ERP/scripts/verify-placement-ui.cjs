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
const entry = `import React from 'react';import {createRoot} from 'react-dom/client';
import {Workspace} from '@/components/placement/Workspace';import {ReportBody,ReportFilters} from '@/components/placement/Reports';import {DriveEditor} from '@/components/placement/DriveEditor';import {DriveCandidates} from '@/components/placement/DriveCandidates';import {AssistantChat} from '@/components/placement/AssistantChat';import {DeleteRecord} from '@/components/placement/Controls';import {SECTIONS} from '@/lib/placement/types';
const data=${JSON.stringify(data)},student=${JSON.stringify(student)},drive=${JSON.stringify(drive)},company=${JSON.stringify(company)};
const section=location.pathname.split('/')[2]||'batch',query=Object.fromEntries(new URLSearchParams(location.search));let content;
if(section==='drive-editor')content=<><h1>Create a placement drive.</h1><DriveEditor companies={[company]} options={data.options}/><DeleteRecord kind='company' record={company} back='/placement/companies'/></>;
else if(section==='drive-pool')content=<DriveCandidates drive={drive} rows={[{...student,registration_id:null,reason:null}]}/>;
else if(section==='assistants')content=<AssistantChat assistant='friday' initialHistory={[]} batches={['2028']} initialDiagnostics={{mode:'Fixture data'}}/>;
else {if(['students','ranking','points','github','domain','tests','talent'].includes(section))data.rows=[student];if(section==='companies')data.rows=[company];if(section==='drives')data.rows=[drive];if(['offers','multiple-offers'].includes(section))data.rows=[];content=<><h1>{SECTIONS[section]?.title||section}</h1><ReportFilters section={section} data={data} query={query}/><ReportBody section={section} data={data} query={query}/></>;}
createRoot(document.getElementById('root')).render(<Workspace>{content}</Workspace>);`;
const mock = {
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
  fs.readFileSync("src/app/portal/portal.css", "utf8") +
  fs.readFileSync("src/app/placement/placement.css", "utf8");
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
    await page.getByRole("button", { name: "Hide navigation" }).click();
    assert.equal(await page.locator("#placement-nav").isVisible(), false);
    await page.getByRole("button", { name: "Show navigation" }).click();
    await page.getByRole("button", { name: "Use dark theme" }).click();
    assert.ok(await page.locator(".po-dark").count());
    await page.getByRole("link", { name: "CSE ↗", exact: true }).click();
    assert.equal(new URL(page.url()).searchParams.get("batch"), "2028");
    assert.equal(new URL(page.url()).searchParams.get("department"), "CSE");
    await page.getByLabel("Sort", { exact: true }).selectOption("name");
    await page.getByRole("button", { name: "Apply filters" }).click();
    assert.equal(new URL(page.url()).searchParams.get("sort"), "name");
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
    for (const section of [
      "overview",
      "companies",
      "drives",
      "offers",
      "company-reports",
      "multiple-offers",
      "departments",
      "students",
      "categories",
      "ranking",
      "tests",
      "points",
      "github",
      "domain",
      "talent",
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
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        passed: true,
        checks: [
          "16 reports",
          "responsive overflow",
          "sidebar collapse",
          "theme",
          "cohort drilldown",
          "sorting",
          "ordered rounds",
          "drive form serialization",
          "mixed registration selection guard",
          "assistant request and email draft",
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
