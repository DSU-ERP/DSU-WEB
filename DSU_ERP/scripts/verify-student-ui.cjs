const fs = require("node:fs"), path = require("node:path"), http = require("node:http"), assert = require("node:assert/strict");
const { build } = require("esbuild"), { chromium } = require("@playwright/test");
const dir = path.resolve(".qa/student-ui"); fs.mkdirSync(dir, { recursive: true });
const official = { id: "11111111-1111-4111-8111-111111111111", enrollment_no: "QA001", full_name: "Example Student", department_name: "Computer Science", department_short_name: "CSE", course_name: "B.Tech", current_semester: "6", source_batch: "2028", cgpa: "0", attendance: "0", current_backlog: 0, sgpa: null };
const profile = { official, details: {}, onboarded: false, revision: 0 };
const dashboard = { official, profile: {}, onboarded: false, score: null, band: "Not measured", basis: "Average scores from completed interviews.", skills: { overall: null, communication: null, accuracy: null, confidence: null }, sessions: 0, plans: 0, assessments: 0, resume: null, latestSession: null, streak: { current: 0, best: 0 }, activityDates: [], schedule: [], deadlines: [], applications: [], notifications: [], next: { title: "Make your workspace yours", reason: "Set your goals.", href: "/student/onboarding", label: "Complete setup" }, academicEligibility: false };
const entry = `import React from 'react';import {createRoot} from 'react-dom/client';
import {StudentShell} from '@/features/student/components/StudentShell';import {ProfileForm} from '@/features/student/components/ProfileForm';import {Dashboard} from '@/features/student/components/Dashboard';import {Readiness} from '@/features/student/components/Readiness';import {CareerReport} from '@/features/student/components/Career';
const profile=${JSON.stringify(profile)},dashboard=${JSON.stringify(dashboard)};
const route=location.pathname;let page=route.endsWith('/onboarding')?<ProfileForm initial={profile} onboarding/>:route.endsWith('/settings')?<ProfileForm initial={profile}/>:route.includes('/resume')?<CareerReport data={{report:null,resume:null}}/>:route.endsWith('/readiness')?<Readiness data={dashboard}/>:<Dashboard data={dashboard}/>;
createRoot(document.getElementById('root')).render(<StudentShell name='Example Student' usn='QA001'>{page}</StudentShell>);`;
const mocks = { "next/link": "import React from 'react';export default function Link({children,...props}){return <a {...props}>{children}</a>}", "next/navigation": "export const usePathname=()=>location.pathname;const router={push:path=>location.assign(path),refresh:()=>{}};export const useRouter=()=>router;", "@/app/login/actions": "export async function signOut(){}" };
(async () => { let server, browser; let saved;
  try {
    await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, outfile: path.join(dir, "bundle.js"), jsx: "automatic", platform: "browser", define: { "process.env.NODE_ENV": '"development"' }, plugins: [{ name: "student-boundaries", setup(b) { b.onResolve({ filter: /.*/ }, args => mocks[args.path] ? { path: args.path, namespace: "mock" } : undefined); b.onLoad({ filter: /.*/, namespace: "mock" }, args => ({ contents: mocks[args.path], loader: "tsx", resolveDir: process.cwd() })); } }] });
    const css = "*{box-sizing:border-box}body,h1,h2,h3,p,dl,dd{margin:0}body{font-family:Arial}a{color:inherit;text-decoration:none}button,input,textarea,select{font:inherit}button{border:0;cursor:pointer}:root{--mono:monospace}" + fs.readFileSync("src/app/student/student.css", "utf8");
    server = http.createServer(async (req, res) => {
      if (req.url === "/bundle.js") { res.setHeader("Content-Type", "text/javascript"); res.end(fs.readFileSync(path.join(dir, "bundle.js"))); return; }
      if (req.url.startsWith("/student/api/")) { res.setHeader("Content-Type", "application/json"); if (req.method === "POST") { const chunks = []; for await (const chunk of req) chunks.push(chunk); saved = JSON.parse(Buffer.concat(chunks).toString()); res.end(JSON.stringify({ data: { revision: 1, onboarded: true } })); } else res.end(JSON.stringify({ data: [] })); return; }
      res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + css + '</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
    });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve)); const origin = "http://127.0.0.1:" + server.address().port;
    browser = await chromium.launch({ headless: true, ...(process.platform === "win32" ? { channel: "msedge" } : {}) });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }), errors = []; page.on("pageerror", error => errors.push(error.message));
    await page.goto(origin + "/student/dashboard"); await page.getByRole("heading", { name: /Good .*Example/ }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await page.getByText("Not measured", { exact: true }).count(), 1);
    await page.getByRole("button", { name: "Use dark theme" }).click(); assert.equal(await page.locator(".st-dark").count(), 1);
    await page.getByRole("button", { name: "Search modules" }).click(); await page.getByLabel("Find modules").fill("settings"); await page.getByRole("dialog").getByRole("link", { name: /Settings/ }).click();
    await page.getByRole("tab", { name: "Career links" }).click(); await page.getByLabel("LinkedIn URL").fill("https://example.org/profile");
    await page.goto(origin + "/student/onboarding"); await page.getByRole("button", { name: "Continue →" }).click(); await page.getByLabel("Display name").fill("Updated Student"); await page.getByLabel("City", { exact: true }).fill("Bengaluru");
    await page.getByRole("button", { name: "Continue →" }).click(); assert.equal(await page.getByLabel("Official CGPA").inputValue(), "0"); assert.equal(await page.getByLabel("Official USN").getAttribute("readonly"), "");
    await page.getByRole("button", { name: "Continue →" }).click(); await page.getByRole("button", { name: "Interview preparation", exact: true }).click(); await page.getByRole("button", { name: "Continue →" }).click(); await page.getByText("Updated Student", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Enter your workspace ↗" }).click(); await page.waitForURL("**/student/dashboard"); assert.equal(saved.details.fullName, "Updated Student"); assert.equal(saved.complete, true);
    await page.screenshot({ path: path.join(dir, "dashboard-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ["dashboard", "readiness", "settings", "resume/prediction"]) { await page.goto(origin + "/student/" + route); await page.locator("h1").waitFor(); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Overflow: " + route); }
    await page.getByRole("button", { name: "Open navigation" }).click(); await page.getByRole("navigation").getByRole("link", { name: "Dashboard", exact: true }).click(); await page.waitForURL("**/student/dashboard");
    await page.screenshot({ path: path.join(dir, "dashboard-mobile.png"), fullPage: true }); assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, checks: ["real shell", "theme", "command palette", "five-step onboarding", "profile serialization", "official record protection", "empty readiness", "desktop and mobile overflow", "mobile navigation"], data: "synthetic fixtures; no campus accounts or records touched" }));
  } catch (error) { console.error(error.stack); const page = browser?.contexts()[0]?.pages()[0]; if (page) await page.screenshot({ path: path.join(dir, "failure.png"), fullPage: true }); process.exitCode = 1; }
  finally { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); }
})();
