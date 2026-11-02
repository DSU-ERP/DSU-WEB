// Company portal, officer review and the student apply step: real client
// components with clearly synthetic, local-only fixtures. A small fixture
// server answers the same-origin APIs; no database or backend is involved.
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const assert = require("node:assert/strict");
const { build } = require("esbuild");
const { chromium } = require("@playwright/test");
const root = process.cwd(), dir = path.join(root, ".qa/company-ui");
fs.mkdirSync(dir, { recursive: true });
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const request = {
  id: id(1), kind: "new", status: "submitted", revision: 3, drive_id: null, title: "Graduate Software Engineer",
  description: "Build and test services for a fixture payments product.", job_category: "Software", employment_type: "full-time", openings: 12,
  package_lpa: 12, ctc_fixed_lpa: 10, ctc_variable_lpa: 2, stipend_monthly: null, internship_months: null, bond_months: 12,
  bond_details: "One year service agreement", work_mode: "hybrid", joining_date: "2027-07-01", location: "Bengaluru", skills: "Java, SQL",
  required_documents: "Resume", rounds: ["Online test", "Technical interview", "HR interview"], drive_date: "2027-01-20",
  registration_deadline: "2027-01-10", criteria: { batches: ["2027"], branches: ["CSE"], min_cgpa: 7.5, notes: "Strong in DSA" },
  submitted_at: "2026-11-01T05:00:00Z", reviewed_at: null, review_comment: null, created_at: "2026-11-01T04:00:00Z", updated_at: "2026-11-01T05:00:00Z",
  jd_file: { id: id(9), filename: "fixture-jd.pdf", size: 2048 }, drive: null,
  company: { id: id(50), name: "Fixture Systems", industry: "Software", website: "https://fixture.invalid", about: "A synthetic company.", headquarters: "Bengaluru" },
  submittedBy: { email: "hr@fixture.invalid", name: "Fixture Recruiter" }, live: null,
  options: { batches: ["2028", "2027"], departments: ["CSE", "ECE", "ISE"] },
};
const people = [1, 2, 3].map((n) => ({
  id: id(100 + n), usn: `FIX00${n}`, name: `Fixture Student ${n}`, department: n === 3 ? "ECE" : "CSE", batch: "2027",
  cgpa: ["9.10", "8.40", "6.90"][n - 1], backlogs: 0, source: n === 3 ? "added" : "rules", dsa: [74.2, 41, null][n - 1], github: null, developer: n === 1 ? 82 : null,
}));
const applicants = {
  released: true, releasedAt: "2026-11-02T05:00:00Z", rounds: request.rounds,
  rows: people.slice(0, 2).map((p, i) => ({
    registrationId: id(200 + i), status: i ? "in-progress" : "registered", currentRound: i ? 2 : 1, appliedAt: "2026-11-01T06:00:00Z",
    usn: p.usn, name: p.name, branch: p.department, department: "Computer Science and Engineering", batch: p.batch, cgpa: p.cgpa, backlogs: 0,
    email: `fix00${i + 1}@student.invalid`, phone: "9000000000", resume: { id: id(300 + i), filename: "resume.pdf" },
    results: i ? [{ round: 1, name: "Online test", result: "pass", remarks: "" }] : [],
  })),
};
const notices = {
  audience: "company", unread: 2,
  rows: [
    { id: id(400), source: "personal", kind: "request.approved", title: "Drive approved: Graduate Software Engineer", body: "Shared with the students the placement office selected.", href: "/company/drives/x", created_at: new Date(Date.now() - 3600e3).toISOString() },
    { id: id(401), source: "personal", kind: "applicants.released", title: "Applicants released: Graduate Software Engineer", body: "2 consenting applicants are now visible.", href: null, created_at: new Date(Date.now() - 600e3).toISOString() },
  ],
};
const opportunity = {
  id: id(500), company: "Fixture Systems", title: "Graduate Software Engineer", description: "Build and test services.", status: "upcoming",
  package_lpa: "12", location: "Bengaluru", drive_date: "2027-01-20", registration_deadline: "2099-01-10", min_cgpa: "0", max_backlogs: 100,
  min_attendance: null, branches: ["CSE"], rounds: request.rounds, skills: "Java, SQL", required_documents: "Resume", original_pdf_url: null,
  origin: "company", audience_mode: true, employment_type: "full-time", job_category: "Software", openings: 12, ctc_fixed_lpa: "10",
  ctc_variable_lpa: "2", stipend_monthly: null, internship_months: null, bond_months: 12, bond_details: "One year service agreement",
  work_mode: "hybrid", joining_date: "2027-07-01", company_industry: "Software", company_website: "https://fixture.invalid",
  company_about: "A synthetic company used only in this harness.", company_headquarters: "Bengaluru", jd_file: { id: id(9), filename: "fixture-jd.pdf", size: 2048 },
  eligibility: { eligible: true, gaps: [], basis: "Fixture basis." }, application: null,
};

const entry = `import React from 'react';import {createRoot} from 'react-dom/client';
import {CompanyShell} from '@/features/company/components/CompanyShell';
import {RequestForm} from '@/features/company/components/RequestForm';
import {ApplicantsPanel} from '@/features/company/components/Applicants';
import {CompanyFriday} from '@/features/company/components/CompanyFriday';
import {NotificationsPanel} from '@/shared/notifications/Notifications';
import {Workspace} from '@/features/placement/components/Workspace';
import {RequestReview,CompanyAccessPanel} from '@/features/placement/components/CompanyRequests';
import {PlacementBoard} from '@/features/student/components/Placement';
const request=${JSON.stringify(request)},applicants=${JSON.stringify(applicants)},people=${JSON.stringify(people)},notices=${JSON.stringify(notices)},opportunity=${JSON.stringify(opportunity)};
window.__notices=notices;
window.__preview=(spec)=>{const rows=people.filter(p=>spec.batches.includes(p.batch)&&(!spec.branches.length||spec.branches.includes(p.department))&&!spec.remove.includes(p.id)||spec.add.includes(p.id));return {total:rows.length,added:spec.add.length,removed:spec.remove.length,matching:rows.length,byDepartment:[...new Set(rows.map(r=>r.department))].map(d=>({department:d,students:rows.filter(r=>r.department===d).length})),byBatch:[],rows,page:1,limit:50}};
window.__search=(term)=>people.filter(p=>(p.name+p.usn).toLowerCase().includes(term.toLowerCase()));
function Page(){
  const p=location.pathname;
  if(p==='/company/requests/new')return <CompanyShell company="Fixture Systems" member="Fixture Recruiter"><h1>Submit a campus drive</h1><RequestForm request={null}/></CompanyShell>;
  if(p==='/company/drives/x')return <CompanyShell company="Fixture Systems" member="Fixture Recruiter"><h1>Graduate Software Engineer</h1><ApplicantsPanel driveId="${id(600)}" data={applicants} title="Graduate Software Engineer"/></CompanyShell>;
  if(p==='/company/friday')return <CompanyShell company="Fixture Systems" member="Fixture Recruiter"><CompanyFriday company="Fixture Systems"/></CompanyShell>;
  if(p==='/company')return <CompanyShell company="Fixture Systems with a deliberately long registered company name" member="Fixture Recruiter"><h1>Welcome, Fixture.</h1><NotificationsPanel initial={notices}/></CompanyShell>;
  if(p==='/placement/drive-requests/x')return <Workspace><h1>Graduate Software Engineer</h1><RequestReview request={request}/></Workspace>;
  if(p==='/placement/companies/x')return <Workspace><CompanyAccessPanel companyId="${id(50)}" companyName="Fixture Systems" access={{members:[{userId:'${id(700)}',email:'hr@fixture.invalid',name:'Fixture Recruiter',active:true,since:'2026-11-01T00:00:00Z',revokedAt:null}],invites:[{id:'${id(701)}',email:'new@fixture.invalid',name:null,createdAt:'2026-11-01T00:00:00Z',expiresAt:'2026-11-08T00:00:00Z',state:'pending'}]}}/></Workspace>;
  if(p==='/student/placement')return <div className="st-app st-light"><main className="st-content"><PlacementBoard initial={{rows:[opportunity],total:1,page:1,limit:24}}/></main></div>;
  return <p>Unknown fixture route</p>;
}
createRoot(document.getElementById('root')).render(<Page/>);`;
const mocks = {
  ...require("./harness-server-mocks.cjs"),
  "next/link": `import React from 'react';export default function Link({children,prefetch,scroll,...props}){return <a {...props}>{children}</a>}`,
  "next/navigation": `const router={push:p=>{window.__pushed=p},replace:p=>{window.__pushed=p},refresh:()=>{}};export const useRouter=()=>router;export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);`,
  "@/app/login/actions": `export async function signOut(){}`,
};
const css = "*{box-sizing:border-box}body,h1,h2,h3,p,dl,dd{margin:0}a{color:inherit}button{cursor:pointer}" + [
  "src/app/globals.css", "src/app/workspace.css", "src/app/placement/placement.css", "src/app/placement/company-portal.css", "src/app/company/company.css",
  "src/shared/notifications/notifications.css", "src/app/student/student.css", "src/app/student/company-drives.css",
].map((p) => fs.readFileSync(p, "utf8").replace('@import "tailwindcss";', "")).join("\n");

const calls = [];
const respond = (res, data, status = 200) => { res.statusCode = status; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(status < 400 ? { data } : { error: data })); };
async function api(req, res) {
  let body = "";
  for await (const chunk of req) body += chunk;
  const parsed = body ? JSON.parse(body) : undefined;
  const url = new URL(req.url, "http://x");
  calls.push({ method: req.method, path: url.pathname, body: parsed });
  const p = url.pathname;
  if (p === "/company/api/files" && req.method === "POST")
    return respond(res, { file: { id: id(9), filename: parsed.filename }, warnings: ["Package was given as a range; the lower bound was used."],
      fields: { title: "Fixture Engineer", description: "Parsed description.", package_lpa: 9, rounds: ["Aptitude", "Interview"], employment_type: "full-time", openings: 4, criteria: { branches: ["CSE", "ISE"], min_cgpa: 7 } } });
  if (p === "/company/api/requests" && req.method === "POST") return respond(res, { ...request, id: id(2), status: "draft", revision: 1, ...parsed });
  if (/^\/company\/api\/requests\/.+\/submit$/.test(p)) return respond(res, { ...request, id: id(2), status: "submitted" });
  if (/^\/company\/api\/drives\/.+\/results$/.test(p)) return respond(res, { count: parsed.registration_ids.length });
  if (/^\/company\/api\/files\/.+\/link$/.test(p)) return respond(res, { url: "about:blank" });
  if (p === "/company/api/friday/conversations" && req.method === "GET") return respond(res, []);
  if (p === "/company/api/friday/conversations") return respond(res, { id: id(800), title: "New conversation" });
  if (/\/message$/.test(p)) return respond(res, { text: "Graduate Software Engineer is live; applications close on 10 January 2027." });
  if (p === `/student/api/opportunities/${id(500)}`) return respond(res, opportunity);
  if (p === "/student/api/resumes") return respond(res, { rows: [{ id: id(900), filename: "resume-2026.pdf", size: 5000, created_at: "2026-10-30T00:00:00Z" }], storage: true });
  if (p === `/student/api/opportunities/${id(500)}/apply`) return respond(res, { id: id(901), status: "registered" });
  if (p.startsWith("/student/api/opportunities")) return respond(res, { rows: [opportunity], total: 1, page: 1, limit: 24 });
  return respond(res, "Unknown fixture API", 404);
}

(async () => {
  let browser, server;
  try {
    await build({ stdin: { contents: entry, resolveDir: root, loader: "tsx" }, bundle: true, outfile: path.join(dir, "bundle.js"), platform: "browser", jsx: "automatic", define: { "process.env.NODE_ENV": '"development"' },
      plugins: [{ name: "boundaries", setup(b) { b.onResolve({ filter: /.*/ }, (a) => (mocks[a.path] ? { path: a.path, namespace: "mock" } : undefined)); b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({ contents: mocks[a.path], loader: "tsx", resolveDir: root })); } }] });
    server = http.createServer((req, res) => {
      if (req.url.startsWith("/company/api/") || req.url.startsWith("/student/api/")) return void api(req, res);
      if (req.url === "/bundle.js") { res.setHeader("Content-Type", "text/javascript"); res.end(fs.readFileSync(path.join(dir, "bundle.js"))); return; }
      if (/^\/fonts\/[a-z0-9.-]+\.woff2$/.test(req.url)) { res.setHeader("Content-Type", "font/woff2"); res.end(fs.readFileSync(path.join(root, "public", req.url))); return; }
      res.setHeader("Content-Type", "text/html");
      res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`);
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ headless: true, ...(process.platform === "win32" ? { channel: "msedge" } : {}) });
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("dialog", (d) => d.accept());
    const open = async (route) => { await page.goto(origin + route); await page.locator("#root > *").first().waitFor(); await page.evaluate(() => document.fonts.ready); };
    const text = () => page.evaluate(() => document.body.innerText);

    // Layout: every surface, both themes, desktop to phone.
    for (const route of ["/company", "/company/requests/new", "/company/drives/x", "/company/friday", "/placement/drive-requests/x", "/placement/companies/x"])
      for (const theme of ["light", "dark"]) for (const width of [1440, 1024, 768, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await open(route);
        await page.evaluate((t) => { localStorage.setItem("dsu-company-theme", t); localStorage.setItem("dsu-placement-theme", t); }, theme);
        await page.reload();
        await page.locator(".po-" + theme).first().waitFor();
        await page.waitForTimeout(450);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow ${route} ${theme} ${width}`);
        assert.equal((await text()).includes("—"), false, `no em dash on ${route}`);
        if (width === 1440 || width === 390) await page.screenshot({ path: path.join(dir, `${route.replace(/\W+/g, "-").replace(/^-|-$/g, "")}-${theme}-${width}.png`), fullPage: true });
      }
    await page.setViewportSize({ width: 1440, height: 900 });

    // Dashboard notifications: mark as read removes the item; the bell shows the count.
    await open("/company");
    assert.equal(await page.locator(".dsu-bell-count").innerText(), "2");
    const panel = page.locator(".dsu-notices");
    await panel.getByRole("button", { name: /Mark "Drive approved/ }).click();
    await page.waitForFunction(() => document.querySelectorAll(".dsu-notices .dsu-notices-list li").length === 1);
    assert.deepEqual(await page.evaluate(() => window.__noticeReads), [notices.rows[0].id]);

    // Request form: the PDF fills empty fields only and warnings show; submit saves then submits.
    await open("/company/requests/new");
    await page.getByLabel("Role title *").fill("Typed Title");
    await page.locator('input[type=file]').setInputFiles({ name: "jd.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 fixture") });
    await page.getByText("Attached: jd.pdf").waitFor();
    assert.equal(await page.getByLabel("Role title *").inputValue(), "Typed Title", "typed values are kept");
    assert.equal(await page.getByLabel("Total CTC (LPA) *").inputValue(), "9");
    assert.equal(await page.getByRole("textbox", { name: "Round 2" }).inputValue(), "Interview");
    assert.ok((await text()).includes("Package was given as a range"));
    await page.getByLabel("Work mode *").selectOption("hybrid");
    await page.getByText("Class of", { exact: false }).first().click();
    await page.getByRole("button", { name: "Submit to the placement office" }).click();
    await page.waitForFunction(() => window.__pushed);
    const saved = calls.find((c) => c.path === "/company/api/requests" && c.method === "POST").body;
    assert.deepEqual([saved.title, saved.package_lpa, saved.work_mode, saved.criteria.branches, saved.jd_file_id], ["Typed Title", 9, "hybrid", ["CSE", "ISE"], id(9)]);
    assert.equal(saved.criteria.batches.length, 1);
    assert.ok(calls.some((c) => /\/requests\/.+\/submit$/.test(c.path)));

    // Applicants: only those waiting for the chosen round can be selected; results are posted.
    await open("/company/drives/x");
    await page.locator(".cp-results select").first().selectOption("1");
    assert.equal(await page.getByLabel("Select Fixture Student 2").isDisabled(), true, "not waiting for round 1");
    await page.getByLabel("Select Fixture Student 1").check();
    await page.getByRole("button", { name: "Record for 1 selected" }).click();
    await page.getByText("Saved results for 1 applicant").waitFor();
    const result = calls.find((c) => c.path.endsWith("/results")).body;
    assert.deepEqual(result, { registration_ids: [id(200)], round: 1, result: "pass" });
    assert.ok((await text()).includes("fix001@student.invalid"));

    // Company FRIDAY answers in the thread.
    await open("/company/friday");
    await page.getByRole("button", { name: /Which of my drives are live/ }).click();
    await page.getByText("applications close on 10 January 2027").waitFor();

    // Officer review: the audience preview follows the rules and hand-picked changes; return needs a comment.
    await open("/placement/drive-requests/x");
    await page.getByText("2 students").waitFor();
    await page.getByRole("button", { name: "Return for changes" }).click();
    assert.ok((await text()).includes("Write a comment so the company knows what to change."));
    await page.getByLabel("Search students").fill("student 3");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.locator(".cp-found").getByRole("button", { name: "Add" }).click();
    await page.getByText("3 students").waitFor();
    await page.getByRole("button", { name: /Approve and publish to 3/ }).click();
    await page.waitForFunction(() => window.__reviews && window.__reviews.length);
    const review = await page.evaluate(() => window.__reviews[0]);
    assert.equal(review.decision, "approve");
    assert.deepEqual([review.details.audience.batches, review.details.audience.branches, review.details.audience.add], [["2027"], ["CSE"], [people[2].id]]);
    assert.equal(review.details.revision, 3);

    // Company access: an invitation shows a one-time link.
    await open("/placement/companies/x");
    await page.getByLabel("Contact email").fill("new@fixture.invalid");
    await page.getByRole("button", { name: "Create invitation" }).click();
    await page.getByText("This is the only time the link is shown.").waitFor();

    // Student apply: company details and offer are shown; consent and a resume are required.
    await page.setViewportSize({ width: 1280, height: 900 });
    await open("/student/placement");
    await page.getByRole("button", { name: /View opportunity/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByText("About Fixture Systems").waitFor();
    for (const fact of ["Fixed pay", "10 LPA", "Hybrid", "12 months. One year service agreement", "Students the placement office selected for this drive"])
      assert.ok((await dialog.innerText()).includes(fact), fact);
    await dialog.getByText("I have reviewed the role").click();
    const register = dialog.getByRole("button", { name: /Register for this drive/ });
    assert.equal(await register.isDisabled(), true, "consent required");
    assert.equal(await dialog.getByLabel("Resume to share").inputValue(), id(900), "latest resume preselected");
    await dialog.getByText(/I agree to share your name, USN/).click();
    await register.click();
    await page.waitForFunction(() => true);
    await page.waitForTimeout(300);
    const apply = calls.find((c) => c.path.endsWith("/apply")).body;
    assert.deepEqual(apply, { confirmed: true, consent: true, resumeFileId: id(900) });

    assert.deepEqual(errors.filter((e) => !/favicon|Failed to load resource/.test(e)), []);
    console.log(JSON.stringify({
      passed: true, widths: [1440, 1024, 768, 390], themes: ["light", "dark"],
      checks: ["no overflow or em dashes on six surfaces", "notifications count and mark as read", "JD upload fills only empty fields", "save then submit",
        "round results only for waiting applicants", "company FRIDAY thread", "audience preview with hand-picked student and approval payload",
        "return needs a comment", "one-time invitation link", "student offer details, consent and resume", "no browser errors"],
      screenshots: dir, data: "synthetic local component fixtures; no database access",
    }));
  } finally {
    await browser?.close();
    server?.close();
  }
})().catch((error) => { console.error(error); process.exit(1); });
