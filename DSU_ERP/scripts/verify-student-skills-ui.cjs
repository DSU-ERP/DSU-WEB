// Browser check for Student Skills Intelligence: the 4-step onboarding, the
// Skills profile (connections) page and the new dashboard sections. Renders the
// real components with a stateful mock of the /student/api proxy that follows
// the backend contract (payload and error shapes from the backend integration
// tests). Synthetic data only; no campus accounts are touched.
const fs = require("node:fs"), path = require("node:path"), http = require("node:http"), assert = require("node:assert/strict");
const { build } = require("esbuild"), { chromium } = require("@playwright/test");
const dir = path.resolve(".qa/student-ui/skills"); fs.mkdirSync(dir, { recursive: true });
const now = new Date().toISOString();
const PLATFORMS = ["github", "leetcode", "hackerrank", "linkedin", "huggingface", "kaggle"], REQUIRED = ["github", "leetcode", "hackerrank", "linkedin"];
const academic = { id: "s", name: "Asha Target", usn: "1DS23CS001", department: "CSE", departmentName: "Computer Science and Engineering", program: "B.Tech", batch: "2027", semester: "7", cgpa: "8.52", sgpa: null, attendance: null, backlogs: 0, category: "advanced", categoryLabel: "Advanced", eligible: true, provenance: "institution_verified" };
const official = { id: "s", enrollment_no: "1DS23CS001", full_name: "Asha Target", course_name: "B.Tech", department_name: "Computer Science and Engineering", department_short_name: "CSE", current_semester: "7", source_batch: "2027", cgpa: "8.52", attendance: "91.5", current_backlog: 0, sgpa: null };
const dashboard = { official, profile: {}, onboarded: true, score: null, band: "Not measured", basis: "Average AI rubric scores from completed interviews. This is preparation guidance, not an official placement decision.", skills: { overall: null, communication: null, accuracy: null, confidence: null }, sessions: 0, plans: 0, assessments: 0, resume: null, latestSession: null, streak: { current: 0, best: 0 }, activityDates: [], activity: [], schedule: [], deadlines: [], applications: [], notifications: [], next: { title: "Give your experience a voice", reason: "A resume report helps identify evidence and practical gaps.", href: "/student/resume/intake", label: "Add your resume" }, academicEligibility: true };
const acct = (platform, over = {}) => ({ platform, state: "linked", handle: null, profileUrl: null, authMethod: "link_only", ownership: "student_submitted", visible: true, syncStatus: "not_applicable", syncError: null, lastSyncedAt: null, submitted: {}, metrics: [], ...over });
const repo = (id, name, extra = {}) => ({ repoId: String(id), name, fullName: "asha-dev/" + name, url: "https://github.com/asha-dev/" + name, description: "Project " + name + " for campus placement analytics", primaryLanguage: "Python", stars: 3, pushedAt: now, hasReadme: true, pinned: false, pinOrder: null, topics: ["ml"], recommendationReasons: ["Has a README"], ...extra });
function fresh() {
  return { academic, ranking: { batchRank: 3, categoryRank: 3, batchSize: 6, categorySize: 4, scope: "batch" }, onboarding: status({ identity: false, visibilitySaved: false, accounts: [] }), visibility: { platforms: true, projects: true, activity: true, summary: true }, accounts: [], github: { repositories: [], featured: [], pinned: [], activity: [] }, summary: null, readiness: { status: "descriptive", items: [] }, revision: 0, _identity: false, _visibility: false, _complete: false };
}
function full() {
  const p = fresh();
  p._identity = p._visibility = p._complete = true; p.revision = 9;
  p.accounts = [
    acct("github", { handle: "asha-dev", profileUrl: "https://github.com/asha-dev", authMethod: "github_app", ownership: "platform_verified", syncStatus: "completed", lastSyncedAt: now, metrics: [{ metric: "repos.public", label: "Public repositories", value: 14, verification: "platform_verified", method: "github_graphql", collectedAt: now, note: null }, { metric: "languages.top", label: "Most-used languages", value: [{ language: "Python", share: 70 }, { language: "TypeScript", share: 30 }], verification: "platform_verified" }] }),
    acct("leetcode", { handle: "asha_lc", profileUrl: "https://leetcode.com/u/asha_lc/", submitted: { solved: 240, easy: 120, medium: 100, hard: 20, contestRating: 1650 } }),
    acct("hackerrank", { state: "declared_none", authMethod: "none", ownership: "unavailable" }),
    acct("linkedin", { handle: "asha", profileUrl: "https://www.linkedin.com/in/asha" }),
    acct("huggingface", { handle: "asha-hf", profileUrl: "https://huggingface.co/asha-hf", authMethod: "public_api", syncStatus: "failed", syncError: "PROVIDER_UNAVAILABLE", lastSyncedAt: now, metrics: [{ metric: "models.count", label: "Models", value: 2, verification: "platform_verified" }] }),
    acct("kaggle", { handle: "ashak", profileUrl: "https://www.kaggle.com/ashak", submitted: { achievements: [{ title: "Notebooks Expert" }] } }),
  ];
  const repos = [repo(1, "alpha", { pinned: true, pinOrder: 1 }), repo(2, "bravo"), repo(3, "charlie"), repo(4, "delta"), repo(5, "echo-service-with-a-long-repository-name")];
  p.github = { repositories: repos, pinned: [repos[0]], featured: [{ position: 1, source: "github_pinned", repo: repos[0] }, { position: 2, source: "student_selected", repo: repos[1] }],
    activity: [{ metric: "contributions.total_12m", label: "Contributions (last 12 months)", value: 412, verification: "platform_verified" }, { metric: "activity.current_streak", label: "Current", value: 5, verification: "platform_verified", note: "Counted in UTC from GitHub's contribution calendar (last 12 months)." }, { metric: "activity.longest_streak", label: "Longest", value: 21, verification: "platform_verified" }, { metric: "contributions.lines_added_52w", label: "Lines", value: { value: 18240, counted: 8, eligible: 10, pending: 0 }, verification: "platform_verified" }] };
  p.readiness = { status: "descriptive", items: [
    { key: "academic_eligibility", label: "Academic eligibility", state: "met", detail: "The official CGPA meets the institution placement rule (6.75 or above). Eligibility is decided by official CGPA only.", provenance: "institution_verified" },
    { key: "profile_completeness", label: "Profile completeness", state: "met", detail: "Skills onboarding is complete.", provenance: "student_submitted" },
    { key: "verified_projects", label: "Verified technical projects", state: "met", detail: "5 public repositories are verified through GitHub, including alpha and bravo.", provenance: "platform_verified" },
    { key: "coding_platforms", label: "Coding platforms", state: "met", detail: "Provided: LeetCode (student submitted), Hugging Face (student submitted) and Kaggle (student submitted). Not provided: HackerRank. Absence of a platform is not evidence of skill level.", provenance: "student_submitted" },
    { key: "missing_information", label: "Missing profile information", state: "met", detail: "No required profile information is missing.", provenance: "student_submitted" },
  ] };
  p.summary = summary();
  return finalize(p);
}
function empty() {
  const p = fresh(); p._identity = p._visibility = p._complete = true;
  p.academic = { ...academic, cgpa: null, category: null, categoryLabel: null, eligible: null };
  p.ranking = { batchRank: null, categoryRank: null, batchSize: null, categorySize: null, scope: "batch" };
  p.accounts = PLATFORMS.slice(0, 4).map((x) => acct(x, { state: "declared_none", authMethod: "none", ownership: "unavailable" }));
  p.readiness = { status: "descriptive", items: [{ key: "academic_eligibility", label: "Academic eligibility", state: "unavailable", detail: "No official CGPA is on record, so placement eligibility cannot be confirmed yet. Eligibility is decided by official CGPA only.", provenance: "unavailable" }] };
  return finalize(p);
}
function summary() {
  return { id: "11111111-1111-4111-8111-111111111111", createdAt: now, model: "test/model", cached: false, hidden: false, reviewedAt: null, provenance: "ai_generated",
    content: { summary: { text: "Official CGPA in the Advanced category, with verified public Python projects on GitHub.", evidence: ["e2", "e7"] }, skills: [{ name: "Python", evidence: ["e7"] }, { name: "SQL", evidence: ["e9"] }], projects: [{ name: "bravo", evidence: ["e7"] }], academicStrengths: [{ text: "Batch rank 3 of 6 by official CGPA.", evidence: ["e4"] }], achievements: [], developmentAreas: [{ text: "Add a README to older repositories so reviewers can understand them.", evidence: ["e8"] }], potentialRoles: [{ role: "Backend developer", rationale: "Python services in public repositories.", evidence: ["e7"] }], rolesNote: "Potential roles are suggestions to explore, not placement decisions." },
    evidence: [{ id: "e2", kind: "academic", label: "Official CGPA", value: "8.52 (category: Advanced)", provenance: "institution_verified" }, { id: "e4", kind: "ranking", label: "Batch rank by official CGPA (dense rank)", value: "3 of 6", provenance: "institution_verified" }, { id: "e7", kind: "project", label: "Featured project bravo (selected by the student)", value: "Project bravo; language Python; 3 stars", provenance: "platform_verified" }, { id: "e8", kind: "project", label: "Repository charlie", value: "No description", provenance: "platform_verified" }, { id: "e9", kind: "self", label: "Skills listed by the student", value: "Python, SQL", provenance: "student_submitted" }] };
}
function status({ identity, visibilitySaved, accounts, complete }) {
  const state = Object.fromEntries(accounts.map((a) => [a.platform, a.state]));
  const sections = { identity, visibility: visibilitySaved };
  for (const p of PLATFORMS) sections[p] = state[p] === "linked" || state[p] === "declared_none";
  const missing = ["identity", ...REQUIRED, "visibility"].filter((k) => !sections[k]);
  return { version: complete ? 1 : 0, currentVersion: 1, complete: !!complete, completedAt: complete ? now : null, identityConfirmedAt: identity ? now : null, consentedAt: complete ? now : null, sections, missing };
}
const finalize = (p) => { p.onboarding = status({ identity: p._identity, visibilitySaved: p._visibility, accounts: p.accounts, complete: p._complete }); return p; };
const publicView = (p) => { const { _identity, _visibility, _complete, ...rest } = finalize(p); return rest; };

const entry = `import React from 'react';import {createRoot} from 'react-dom/client';
import {StudentShell} from '@/features/student/components/StudentShell';import {SkillsOnboarding} from '@/features/student/components/SkillsOnboarding';import {Connections} from '@/features/student/components/Connections';import {Dashboard} from '@/features/student/components/Dashboard';
const q=new URLSearchParams(location.search);const route=location.pathname;
(async()=>{const profile=await (await fetch('/qa/profile')).json();const data=${JSON.stringify(dashboard)};
let page,mode='full';
if(route.endsWith('/onboarding')){mode='onboarding';page=<SkillsOnboarding initial={profile} github={q.get('github')||undefined} githubCode={q.get('code')||undefined}/>;}
else if(route.endsWith('/connections'))page=<Connections initial={profile} github={q.get('github')||undefined} githubCode={q.get('code')||undefined} preview={q.get('preview')==='1'}/>;
else page=<Dashboard data={data} skills={q.get('skills')==='error'?null:profile} skillsError={q.get('skills')==='error'?'Campus services are temporarily unavailable. Please wait a moment and try again.':undefined}/>;
createRoot(document.getElementById('root')).render(<StudentShell name='Asha Target' usn='1DS23CS001' mode={mode}>{page}</StudentShell>);})();`;
const mocks = { "next/link": "import React from 'react';export default function Link({children,...props}){return <a {...props}>{children}</a>}", "next/navigation": "export const useSearchParams=()=>new URLSearchParams(location.search);export const usePathname=()=>location.pathname;const router={push:p=>location.assign(p),replace:p=>location.assign(p),refresh:()=>{}};export const useRouter=()=>router;", "@/app/login/actions": "export async function signOut(){}" };

(async () => {
  let server, browser;
  let profile = fresh(), githubMode = "app-missing", bumpBeforeVisibility = false;
  const calls = [];
  const fail = (res, status, code, error, details) => { res.statusCode = status; res.end(JSON.stringify({ code, error, details })); };
  try {
    await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, outfile: path.join(dir, "bundle.js"), jsx: "automatic", platform: "browser", define: { "process.env.NODE_ENV": '"development"' }, plugins: [{ name: "student-boundaries", setup(b) { b.onResolve({ filter: /.*/ }, (a) => (mocks[a.path] ? { path: a.path, namespace: "mock" } : a.path === "server-only" ? { path: a.path, namespace: "mock" } : undefined)); b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({ contents: mocks[a.path] ?? "", loader: "tsx", resolveDir: process.cwd() })); } }] });
    const css = "*{box-sizing:border-box}body,h1,h2,h3,h4,p,dl,dd{margin:0}body{font-family:Arial}a{color:inherit;text-decoration:none}button,input,textarea,select{font:inherit}button{cursor:pointer}:root{--mono:monospace}.st-visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}" + ["src/app/student/student.css", "src/app/student/workspace-polish.css", "src/app/student/skills.css"].map((f) => fs.readFileSync(f, "utf8")).join("\n");
    server = http.createServer(async (req, res) => {
      if (req.url === "/bundle.js") { res.setHeader("Content-Type", "text/javascript"); return res.end(fs.readFileSync(path.join(dir, "bundle.js"))); }
      if (req.url === "/qa/profile") { res.setHeader("Content-Type", "application/json"); return res.end(JSON.stringify(publicView(profile))); }
      if (req.url.startsWith("/student/api/")) {
        res.setHeader("Content-Type", "application/json");
        const chunks = []; for await (const c of req) chunks.push(c);
        const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : undefined;
        const resource = req.url.slice("/student/api/".length);
        calls.push({ method: req.method, resource, body });
        const ok = (data) => res.end(JSON.stringify({ data }));
        if (resource === "skills/profile") return ok(publicView(profile));
        if (resource === "skills/onboarding") {
          if (body.action === "confirm_identity") { profile._identity = true; profile.revision++; return ok(publicView(profile).onboarding); }
          if (bumpBeforeVisibility) { bumpBeforeVisibility = false; profile.revision++; }
          if (body.revision !== profile.revision) return fail(res, 409, "PROFILE_CHANGED", "Your skills profile changed in another tab. Review it and try again.", { revision: profile.revision });
          if (body.action === "visibility") { profile.visibility = body.visibility; profile._visibility = true; profile.revision++; return ok(publicView(profile).onboarding); }
          const missing = finalize(profile).onboarding.missing;
          if (missing.length) return fail(res, 409, "ONBOARDING_INCOMPLETE", "Complete every required section before finishing.", { missing });
          profile._complete = true; profile.revision++; return ok(publicView(profile).onboarding);
        }
        const platform = resource.split("/")[2];
        if (resource === "skills/platforms/github/authorize") return githubMode === "ok" ? ok({ url: "https://github.com/login/oauth/authorize?state=x" }) : fail(res, 503, githubMode === "none" ? "INTEGRATIONS_NOT_CONFIGURED" : "GITHUB_APP_NOT_CONFIGURED", githubMode === "none" ? "Platform connections are not configured on this server yet." : "GitHub connection is not configured on this server yet.");
        const upsert = (fields) => { profile.accounts = [...profile.accounts.filter((a) => a.platform !== platform), acct(platform, fields)]; profile.accounts.sort((a, b) => PLATFORMS.indexOf(a.platform) - PLATFORMS.indexOf(b.platform)); profile.revision++; return profile.accounts.find((a) => a.platform === platform); };
        if (resource === "skills/platforms/github/token") {
          if (githubMode === "none") return fail(res, 503, "INTEGRATIONS_NOT_CONFIGURED", "Platform connections are not configured on this server yet.");
          return ok(upsert({ handle: "asha-dev", profileUrl: "https://github.com/asha-dev", authMethod: "github_pat", ownership: "platform_verified", syncStatus: "pending" }));
        }
        if (/\/refresh$/.test(resource)) return fail(res, 429, "REFRESH_LIMIT", "You can refresh this account once every 10 minutes.", { retryAfterSeconds: 540 });
        if (resource === "skills/featured") { const repos = profile.github.repositories.filter((r) => body.repoIds.includes(r.repoId)); profile.github.featured = [...profile.github.featured.filter((f) => f.source === "github_pinned"), ...repos.filter((r) => !r.pinned).map((r, i) => ({ position: i + 2, source: "student_selected", repo: r }))].slice(0, 3); return ok({ featured: [] }); }
        if (resource === "skills/summary") { if (body.action === "generate") { profile.summary = summary(); return ok(profile.summary); } if (body.action === "review") { profile.summary = { ...profile.summary, reviewedAt: now }; return ok(profile.summary); } profile.summary = { ...profile.summary, hidden: body.hidden }; return ok(profile.summary); }
        if (resource.startsWith("skills/platforms/")) {
          if (body.action === "declare_none" || body.action === "disconnect") return ok(upsert({ state: body.action === "declare_none" ? "declared_none" : "disconnected", authMethod: "none", ownership: "unavailable" }));
          if (body.action === "visibility") { const a = profile.accounts.find((x) => x.platform === platform); a.visible = body.visible; profile.revision++; return ok(a); }
          if (body.action === "link") {
            if (body.submitted?.contestRating > 4000) return fail(res, 400, "INVALID_SUBMITTED_FIELDS", "Check the figures you entered.", { fields: ["contestRating"] });
            const handle = body.value.replace(/\/$/, "").split("/").pop();
            return ok(upsert({ handle, profileUrl: body.value.startsWith("https://") ? body.value : "https://example.invalid/" + handle, submitted: body.submitted || {}, authMethod: platform === "huggingface" ? "public_api" : "link_only", syncStatus: platform === "huggingface" ? "pending" : "not_applicable" }));
          }
        }
        return fail(res, 404, undefined, "Unknown resource.");
      }
      res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + css + '</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r)); const origin = "http://127.0.0.1:" + server.address().port;
    browser = await chromium.launch({ headless: true, ...(process.platform === "win32" ? { channel: "msedge" } : {}) });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage(), errors = []; page.on("pageerror", (e) => errors.push(e.message));
    const shot = (name) => page.screenshot({ path: path.join(dir, name + ".png"), fullPage: true });
    const visibleText = () => page.evaluate(() => document.body.innerText);
    const noOverflow = async (label) => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Horizontal overflow: " + label);
    const noEmDash = async (label) => assert.ok(!(await visibleText()).includes("—"), "Em dash in visible text: " + label);

    // ---- Step 1: institution record, read only --------------------------------
    await page.goto(origin + "/student/onboarding"); await page.getByRole("heading", { name: "Your official academic record" }).waitFor();
    assert.equal(await page.getByRole("navigation", { name: "Student modules" }).count(), 0, "no workspace navigation during onboarding");
    assert.equal(await page.locator("main input").count(), 0, "official fields are not editable");
    await page.locator("main").getByText("1DS23CS001", { exact: true }).waitFor(); await page.locator("main").getByText("8.52", { exact: true }).waitFor();
    await page.getByText(/contact the Training and Placement Cell/).waitFor();
    await noEmDash("step 1"); await shot("onboarding-1-identity-1440-light");
    await page.getByRole("button", { name: "These details are correct" }).click();

    // ---- Step 2: platforms -----------------------------------------------------
    await page.getByRole("heading", { name: "Developer platforms" }).waitFor();
    assert.equal(await page.locator(".st-si-card").count(), 6);
    assert.equal(await page.locator(".st-si-card-head p").getByText("Optional", { exact: true }).count(), 2);
    assert.equal(await page.getByRole("button", { name: "Continue" }).isDisabled(), true);
    const gh = page.locator('.st-si-card[data-platform="github"]');
    await gh.getByRole("button", { name: "Connect with GitHub" }).click();
    await gh.getByText(/not set up on this server yet/).waitFor();
    const tokenInput = gh.getByLabel("Fine-grained token");
    assert.equal(await tokenInput.getAttribute("type"), "password");
    await gh.getByText("Repository access: Public repositories (read-only).").waitFor();
    await tokenInput.fill("ghp_" + "a".repeat(36)); await gh.getByRole("button", { name: "Connect with token" }).click();
    await gh.getByText("Use a fine-grained token. It starts with github_pat_.").waitFor();
    assert.equal(calls.filter((c) => c.resource.endsWith("github/token")).length, 0, "client rejects classic tokens");
    githubMode = "none";
    const secret = "github_pat_" + "S".repeat(60);
    await tokenInput.fill(secret); await gh.getByRole("button", { name: "Connect with token" }).click();
    await gh.getByText(/GitHub connection is not available on this server yet/).waitFor();
    assert.equal(await gh.getByLabel("Fine-grained token").count(), 0, "token form closes when integrations are not configured");
    assert.ok(!(await page.content()).includes(secret), "token is never re-displayed");
    await shot("onboarding-2-github-unavailable-1440-light");
    await gh.getByRole("button", { name: "I don’t use GitHub" }).click(); await gh.getByText("Does not use", { exact: true }).waitFor();

    const lc = page.locator('.st-si-card[data-platform="leetcode"]');
    await lc.getByLabel("LeetCode profile link or username").fill("https://leetcode.com.evil.com/u/x"); await lc.getByRole("button", { name: "Save LeetCode" }).click();
    await lc.getByText(/Enter a valid LeetCode username or profile link/).waitFor();
    await lc.getByLabel("LeetCode profile link or username").fill("https://leetcode.com/u/asha_lc/");
    await lc.getByText("Add figures from your profile (optional)").click();
    for (const [label, value] of [["Problems solved", "5"], ["Easy", "5"], ["Medium", "5"], ["Hard", "5"]]) await lc.getByLabel(label, { exact: true }).fill(value);
    await lc.getByRole("button", { name: "Save LeetCode" }).click(); await lc.getByText("Easy, medium and hard cannot add up to more than solved.").waitFor();
    await lc.getByLabel("Problems solved", { exact: true }).fill("240"); await lc.getByLabel("Contest rating").fill("4999");
    await lc.getByRole("button", { name: "Save LeetCode" }).click(); await lc.getByText("Check the figures you entered. Fields: Contest rating.").waitFor();
    await shot("onboarding-2-validation-1440-light");
    await lc.getByLabel("Contest rating").fill("1650"); await lc.getByRole("button", { name: "Save LeetCode" }).click();
    await lc.getByText("Linked", { exact: true }).waitFor(); await lc.getByText("Student submitted, not verified by DSU").first().waitFor();
    assert.deepEqual(calls.findLast((c) => c.resource === "skills/platforms/leetcode").body.submitted, { solved: 240, easy: 5, medium: 5, hard: 5, contestRating: 1650 });
    await page.locator('.st-si-card[data-platform="hackerrank"]').getByRole("button", { name: "I don’t use HackerRank" }).click();
    const li = page.locator('.st-si-card[data-platform="linkedin"]');
    await li.getByLabel("LinkedIn profile link").fill("https://www.linkedin.com/in/asha"); await li.getByRole("button", { name: "Save LinkedIn" }).click(); await li.getByText("Linked", { exact: true }).waitFor();
    await page.getByText("Syncing continues in the background and does not affect finishing setup.", { exact: false }).waitFor();
    await noEmDash("step 2"); await noOverflow("step 2 1440"); await shot("onboarding-2-platforms-1440-light");
    await page.getByRole("button", { name: "Continue" }).click();

    // ---- Step 3: visibility (with a revision conflict) --------------------------
    await page.getByRole("heading", { name: "Profile visibility" }).waitFor();
    await page.getByText(/Private GitHub repositories are never accessed/).waitFor();
    await page.getByRole("switch", { name: /Coding activity/ }).uncheck();
    bumpBeforeVisibility = true;
    await page.getByRole("button", { name: "Save and continue" }).click(); await page.getByText(/changed in another tab or by a sync/).waitFor();
    assert.equal(await page.getByRole("switch", { name: /Coding activity/ }).isChecked(), false, "choices kept after a conflict");
    await shot("onboarding-3-visibility-1440-light");
    await page.getByRole("button", { name: "Save and continue" }).click();

    // ---- Step 4: review, server-reported missing sections, finish ---------------
    await page.getByRole("heading", { name: "Review and finish" }).waitFor();
    await page.getByText("Coding activity:", { exact: false }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Finish setup" }).isDisabled(), true, "consent is required");
    await page.getByRole("checkbox").check();
    profile.accounts = profile.accounts.filter((a) => a.platform !== "linkedin"); // another tab removed LinkedIn
    await page.getByRole("button", { name: "Finish setup" }).click(); await page.getByRole("alert").filter({ hasText: "Finish these before completing setup" }).getByRole("button", { name: "LinkedIn" }).waitFor();
    await noEmDash("step 4"); await shot("onboarding-4-missing-1440-light");
    await page.getByRole("alert").getByRole("button", { name: "LinkedIn" }).click();
    await li.getByLabel("LinkedIn profile link").fill("https://www.linkedin.com/in/asha"); await li.getByRole("button", { name: "Save LinkedIn" }).click(); await li.getByText("Linked", { exact: true }).waitFor();
    await page.getByRole("button", { name: /Review and finish/ }).click(); await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Finish setup" }).click(); await page.waitForURL("**/student/dashboard");
    assert.equal(calls.findLast((c) => c.resource === "skills/onboarding").body.consent, true);

    // Reload resumes from server state: a half-done profile lands on step 2.
    profile = fresh(); profile._identity = true; profile.accounts = [acct("github", { state: "declared_none", authMethod: "none", ownership: "unavailable" })];
    await page.goto(origin + "/student/onboarding"); await page.getByRole("heading", { name: "Developer platforms" }).waitFor();
    await page.goto(origin + "/student/onboarding?github=error&code=GITHUB_ACCOUNT_IN_USE"); await page.getByText("This GitHub account is already linked to another student.").waitFor();

    // ---- Connections -----------------------------------------------------------
    profile = full(); githubMode = "ok";
    await page.goto(origin + "/student/connections"); await page.getByRole("heading", { name: "Skills profile", exact: true }).waitFor();
    assert.ok(await page.getByRole("navigation", { name: "Student modules" }).getByRole("link", { name: "Skills profile" }).count());
    const ghm = page.locator('.st-si-card[data-platform="github"]');
    await ghm.getByRole("button", { name: "Refresh data" }).click(); await ghm.getByText(/once every 10 minutes\. Try again in about 9 minutes/).waitFor();
    await page.locator('.st-si-card[data-platform="huggingface"]').getByText("Sync failed", { exact: true }).waitFor();
    await page.getByText("The platform was unavailable. The next sync will retry automatically.").waitFor();
    const lim = page.locator('.st-si-card[data-platform="linkedin"]');
    await lim.getByRole("button", { name: "Disconnect" }).click(); await lim.getByRole("button", { name: "Keep it" }).click();
    await lim.getByRole("button", { name: "Disconnect" }).click(); await lim.getByRole("button", { name: "Disconnect LinkedIn" }).click(); await lim.getByText("Not provided", { exact: true }).waitFor();
    const picker = page.locator("#featured");
    await picker.getByText("Pinned on GitHub").first().waitFor(); await picker.getByText("1 of 3 selected").waitFor();
    for (const name of ["charlie", "delta", "echo-service-with-a-long-repository-name"]) await picker.getByRole("checkbox", { name: new RegExp(name) }).click();
    await picker.getByText(/You can choose up to 3 projects/).waitFor(); await picker.getByText("3 of 3 selected").waitFor();
    await picker.getByRole("button", { name: "Save featured projects" }).click(); await picker.getByText("Featured projects saved.").waitFor();
    assert.deepEqual(calls.findLast((c) => c.resource === "skills/featured").body.repoIds, ["2", "3", "4"]);
    await page.getByRole("button", { name: "Preview placement profile" }).click();
    const preview = page.getByRole("region", { name: "Placement profile preview" });
    await preview.getByText("Preview", { exact: true }).waitFor(); await preview.getByText("Official CGPA", { exact: true }).waitFor();
    await noEmDash("connections"); await noOverflow("connections 1440"); await shot("connections-1440-light");
    // The preview mirrors placement.skill_profile: projects and activity follow
    // their own switches with GitHub shared, not the platforms switch, and a
    // summary citing hidden evidence is withheld.
    const previewText = () => page.locator(".st-si-preview").innerText();
    const savedVisibility = profile.visibility;
    profile.visibility = { platforms: false, projects: true, activity: true, summary: true };
    await page.goto(origin + "/student/connections?preview=1"); await page.locator(".st-si-preview").waitFor();
    let text = await previewText();
    for (const expected of ["Category rank", "Batch rank", "Links and figures are hidden", "alpha", "Contributions in the last 12 months", "Official CGPA in the Advanced category"])
      assert.ok(text.includes(expected), "platforms off keeps " + expected);
    assert.ok(!text.includes("asha_lc"), "handles follow the platforms switch");
    assert.ok(!/calendar/i.test(text));
    profile.visibility = { platforms: true, projects: false, activity: true, summary: true };
    await page.goto(origin + "/student/connections?preview=1"); await page.locator(".st-si-preview").waitFor();
    text = await previewText();
    assert.ok(text.includes("Withheld from officers because it used information you have since hidden."), "summary citing projects is withheld");
    assert.ok(!text.includes("Official CGPA in the Advanced category"));
    profile.visibility = savedVisibility;
    profile._complete = false;
    await page.goto(origin + "/student/connections?preview=1"); await page.locator(".st-si-preview").waitFor();
    text = await previewText();
    assert.ok(text.includes("Shared after you complete onboarding."), "before consent only states are shared");
    assert.ok(!text.includes("asha_lc") && !text.includes("alpha"));
    await noEmDash("connections preview"); await shot("connections-preview-pending-1440-light");
    profile._complete = true;
    // Connecting with a token from the manage page: success, field cleared.
    profile.accounts = profile.accounts.map((a) => (a.platform === "github" ? acct("github", { state: "declared_none", authMethod: "none", ownership: "unavailable" }) : a));
    await page.goto(origin + "/student/connections"); await ghm.getByRole("button", { name: "Use a fine-grained token" }).click();
    await ghm.getByLabel("Fine-grained token").fill(secret); await ghm.getByRole("button", { name: "Connect with token" }).click();
    await ghm.getByText("Sync pending", { exact: true }).waitFor();
    assert.ok(!(await page.content()).includes(secret), "token is never re-displayed after success");

    // ---- Dashboard -------------------------------------------------------------
    profile = full();
    await page.goto(origin + "/student/dashboard"); await page.getByRole("heading", { name: "Your placement profile" }).waitFor();
    for (const text of ["8.52", "3 of 4", "3 of 6", "412", "18,240", "Selected by you", "Pinned on GitHub", "AI generated"]) await page.getByText(text, { exact: true }).first().waitFor();
    await page.getByText("Dense rank by official CGPA within your passing-out batch", { exact: false }).waitFor();
    await page.getByText("Counted in UTC from the GitHub contribution calendar.", { exact: false }).first().waitFor();
    assert.ok(!/readiness score/i.test(await visibleText()));
    await page.getByRole("button", { name: "Mark as reviewed" }).click(); await page.getByText(/Reviewed by you/).waitFor();
    await page.getByRole("button", { name: "Hide from placement officers" }).click(); await page.getByText("Hidden from placement officers", { exact: true }).waitFor();
    await noEmDash("dashboard"); await noOverflow("dashboard 1440"); await shot("dashboard-skills-1440-light");
    profile = empty();
    await page.goto(origin + "/student/dashboard"); await page.getByRole("heading", { name: "Coding activity" }).waitFor();
    assert.ok((await page.locator(".st-si-activity .st-si-unavailable").count()) >= 6, "missing metrics show Unavailable");
    await page.getByText("Not ranked (CGPA not recorded)", { exact: true }).first().waitFor();
    await page.getByRole("button", { name: "Generate summary" }).click(); await page.getByText("Official CGPA in the Advanced category", { exact: false }).waitFor();
    await shot("dashboard-skills-empty-1440-light");
    await page.goto(origin + "/student/dashboard?skills=error"); await page.getByText(/The rest of your dashboard is unaffected/).waitFor();

    // ---- Widths and themes -----------------------------------------------------
    for (const theme of ["light", "dark"]) {
      await page.addInitScript((t) => { try { localStorage.setItem("dsu-student-theme", t); } catch {} }, theme);
      for (const width of [390, 1440, 2560]) {
        await page.setViewportSize({ width, height: 900 });
        for (const [name, url, setup] of [["onboarding-2", "/student/onboarding", () => { profile = fresh(); profile._identity = true; }], ["onboarding-1", "/student/onboarding", () => { profile = fresh(); }], ["connections", "/student/connections?preview=1", () => { profile = full(); }], ["dashboard", "/student/dashboard", () => { profile = full(); }]]) {
          setup(); await page.goto(origin + url); await page.locator("h1").first().waitFor(); await page.waitForTimeout(150);
          if (name === "onboarding-2") await page.getByRole("heading", { name: "Developer platforms" }).waitFor();
          if (name === "dashboard") await page.getByRole("heading", { name: "Your placement profile" }).waitFor();
          assert.equal(await page.locator(theme === "dark" ? ".st-dark" : ".st-light").count(), 1, "theme " + theme);
          await noOverflow(`${name} ${width} ${theme}`); await noEmDash(`${name} ${width} ${theme}`);
          await shot(`${name}-${width}-${theme}`);
        }
      }
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, checks: ["read-only institution record", "no navigation while onboarding is required", "GitHub app not configured", "integrations not configured", "classic token rejected", "token never re-displayed", "declare_none", "client and server validation errors", "student-submitted labels", "visibility revision conflict", "server-reported missing sections", "consent and completion redirect", "resume from server state", "GitHub return errors", "refresh limit wait", "sync failure message", "disconnect confirmation", "featured limit of three", "placement preview", "dashboard academic, activity, featured, AI summary", "unavailable values", "skills error state", "390, 1440, 2560 in light and dark", "no horizontal overflow", "no em dashes"], data: "synthetic fixtures with backend contract shapes" }));
  } catch (error) { console.error(error.stack); const p = browser?.contexts()[0]?.pages()[0]; if (p) await p.screenshot({ path: path.join(dir, "failure.png"), fullPage: true }); process.exitCode = 1; }
  finally { await browser?.close(); if (server) await new Promise((r) => server.close(r)); }
})();
