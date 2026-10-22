const {installInterviewSecurity}=require("./fixtures/interview-security.cjs");
// Browser check for the interview, assessment and Observation Haki screens.
// Renders the real components with synthetic fixtures and mocked campus APIs,
// at desktop and phone widths, in light and dark themes.
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const { build } = require("esbuild"),
  { chromium } = require("@playwright/test");

const dir = path.resolve(".qa/intelligence-ui");
fs.mkdirSync(dir, { recursive: true });
const id = "11111111-1111-4111-8111-111111111111";
const now = new Date().toISOString(),
  later = new Date(Date.now() + 30 * 60000).toISOString(),
  closes = new Date(Date.now() + 3 * 86400000).toISOString();

// ---- Interview fixtures ----
const scores = {
  overall: 7, communication: 8, confidence: 6, accuracy: 7, relevance: 8, clarity: 7,
  structure: 6, specificity: 5, roleFit: 7, depth: 6, conciseness: 8,
};
const feedback = {
  scores, quality: "Good", explanation: "Clear answer. Add the measured outcome.",
  strengths: ["Clear structure"], improvements: ["Quantify the result"], followUp: "What result did you get?",
  turn: { kind: "answer", scored: true, reason: "Answers the question." },
  star: { applicable: true, situation: true, task: true, action: true, result: false, missing: ["result"], score: 6, feedback: "Say what changed because of your work." },
};
const earlier = { ...feedback, quality: "Basic", scores: { ...scores, overall: 5, specificity: 3, structure: 4 } };
const questions = [
  { question: "Describe a project you led.", focus: "Leadership", parent: null },
  { question: "What result did you get?", focus: "Follow-up", parent: 0 },
  { question: "How do you handle a missed deadline?", focus: "Behavioural", parent: null },
  { question: "Explain a SQL join to a new teammate.", focus: "Technical", parent: null },
  { question: "Why this role?", focus: "Motivation", parent: null },
];
const answers = [
  { id: "a1", question: questions[0].question, focus: "Leadership", question_index: 0, answer: "I led four classmates building a placement tracker in Next.js and PostgreSQL.", feedback, original_answer: "I built a tracker.", original_feedback: earlier, retried: true, coaching: {} },
  { id: "a2", question: questions[1].question, focus: "Follow-up", question_index: 1, answer: "Registrations moved from spreadsheets to the app and errors dropped.", feedback: { ...feedback, star: undefined }, original_answer: null, original_feedback: null, retried: false },
  // Saved before the fuller rubric: only the headline scores.
  { id: "a3", question: questions[2].question, focus: "Behavioural", question_index: 2, answer: "I tell my lead early and re-plan.", feedback: { scores: { overall: 6, communication: 6, confidence: 6, accuracy: 6 }, quality: "Good", explanation: "Reasonable.", strengths: [], improvements: [], followUp: null }, original_answer: null, original_feedback: null, retried: false },
];
const config = { durationMinutes: 10, language: "en-IN", tone: "friendly", depth: "moderate", questionCount: 4, company: "Example employer", role: "Analyst" };
const session = {
  id, interview_id: id, title: "Analyst interview", mode: "mock", status: "active", started_at: now, expires_at: later, ended_at: null, config,
  currentIndex: 1, currentQuestion: questions[1].question, currentFocus: "Follow-up", currentIsFollowUp: true, currentParent: 0, currentNumber: 1, plannedCount: 4,
  questionCount: 5, answeredCount: 1, answers: answers.slice(0, 1), report: null, questions, integrity: [], termination_reason: null,
};
const report = {
  scores: { overall: 6.7, communication: 7.3, confidence: 6, accuracy: 6.7 },
  dimensions: { relevance: 8, clarity: 7, structure: 6, specificity: 5, roleFit: 7, depth: 6, conciseness: 8, communication: 7.3, confidence: 6, accuracy: 6.7, overall: 6.7 },
  qualities: { Good: 3 }, answered: 3, graded: 3, unscored: 0, pending: 0,
  star: { answers: 1, complete: 0, elements: { situation: 1, task: 1, action: 1, result: 0 }, score: 6 },
  strengths: ["Clear structure"], improvements: ["Quantify results"], nextPlan: ["Practise two STAR stories with numbers"],
  basis: "Average of 3 scored answers.",
};
const completed = { ...session, status: "completed", ended_at: now, answers, answeredCount: 3, report, currentQuestion: null, currentIsFollowUp: false };
const plan = {
  id, title: "Analyst interview", goal: "Explain real project experience.", config, created_at: now, seconds: 0, archived: false,
  jd: "Analyst role working with SQL dashboards.", resume_context: "B.Tech CSE, placement tracker project.",
  context: {
    jdSummary: "Entry-level analyst building SQL dashboards for operations.",
    responsibilities: ["Write SQL reports", "Present findings to managers"],
    mustHaveSkills: ["SQL", "Excel", "Communication"],
    resumeSummary: "CSE student with a full-stack placement tracker project.",
    strengths: ["PostgreSQL project"], risks: ["No internship yet"],
    objective: "Show evidence of analysis and communication.",
    sections: [{ name: "Projects", description: "Depth on the tracker", questionCount: 2 }, { name: "Behavioural", description: "Ownership", questionCount: 2 }],
    sources: { jd: true, resume: true },
  },
  questions: questions.filter((q) => q.parent === null).map((q) => ({ focus: q.focus })),
  sessions: [],
};

// ---- Assessment fixtures ----
const q = (n, section, state, score) => ({ id: `q${n}`, section, type: "mcq", question: `Question ${n} about ${section}?`, options: ["One", "Two", "Three", "Four"], marks: 2, answer: "1", selectedText: "Two", expected: "Two", score, state, feedback: "Explanation." });
const review = [q(1, "Reasoning", "correct", 2), q(2, "Reasoning", "incorrect", 0), q(3, "Technical", "correct", 2), q(4, "Technical", "partial", 1)];
const result = {
  title: "Placement preparation", difficulty: "medium", score: 5, maximum: 8, percentage: 62.5, attempted: 4, correct: 2, partial: 1, unanswered: 0,
  strengths: ["Technical"], weaknesses: ["Reasoning"], recommendations: ["Practise ratio questions"], review, kind: "ai", category: null, level: null,
  integrity: [{ kind: "window-blur", at: now, seconds: 0, severity: "low" }, { kind: "fullscreen-exit", at: now, seconds: 0, severity: "high" }],
  integritySummary: { total: 2, high: 1, medium: 0, low: 1 }, highRisk: 1,
  sections: [
    { name: "Reasoning", score: 2, maximum: 4, questions: 2, correct: 1, percentage: 50 },
    { name: "Technical", score: 3, maximum: 4, questions: 2, correct: 1, percentage: 75 },
  ],
  submittedAt: now, durationSeconds: 754,
};
const attempt = {
  id, status: "completed", title: "Placement preparation", kind: "ai", category: null, level: null,
  config: { durationMinutes: 30, fullscreen: false, difficulty: "medium" },
  questions: review.map(({ id: qid, section, type, question, options, marks }) => ({ id: qid, section, type, question, options, marks })),
  answers: {}, marked: [], expires_at: later, revision: 3, result, integrity: result.integrity,
  insights: {
    strengths: [{ text: "Technical basics are solid.", questionIds: ["q3"] }],
    weaknesses: [{ text: "Ratio reasoning needs work.", questionIds: ["q2"] }],
    suggestions: [{ text: "Practise ten ratio problems.", questionIds: ["q2"] }],
    generatedAt: now,
  },
  official: { name: "Example Student", usn: "QA001" },
};
const withheldResult = {
  ...result, strengths: undefined, weaknesses: undefined, recommendations: undefined, sections: undefined, kind: "assigned",
  review: review.map(({ expected, feedback: f, score, state, ...rest }) => rest), answersWithheld: true, answersReleaseAt: closes,
};
const withheld = { ...attempt, kind: "assigned", insights: null, result: withheldResult, answerRelease: { withheld: true, releaseAt: closes } };

// ---- Dashboard fixture ----
const day = (offset) => new Date(Date.now() - offset * 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const dashboard = {
  official: { name: "Example Student", usn: "QA001", department: "CSE", cgpa: 8.1, batch: "2028" },
  profile: { fullName: "Example Student" }, onboarded: true, score: 62, band: "Developing", basis: "Interviews and tests you completed.",
  skills: { overall: 6.7, communication: 7.3, accuracy: 6.7, confidence: 6 }, sessions: 3, plans: 1, assessments: 2,
  resume: { id, created_at: now }, latestSession: { id, report: { strengths: ["Clear structure"], improvements: ["Quantify results"], nextPlan: ["Practise STAR"] }, ended_at: now },
  streak: { current: 2, best: 4 }, activityDates: [day(0), day(1), day(4)],
  activity: [{ day: day(0), count: 3 }, { day: day(1), count: 1 }, { day: day(4), count: 5 }],
  pipeline: { registered: 3, inProgress: 1, selected: 1, placed: 0, rejected: 1, total: 6 },
  schedule: [], deadlines: [], applications: [], notifications: [],
  next: { title: "Finish your mock interview", reason: "You have one open plan.", href: "/student/interview", label: "Open" },
  academicEligibility: true,
};

// ---- Officer drive import fixture ----
const company = { id: "c1", name: "Example employer", industry: "Software" };
const options = { batches: ["2028"], departments: ["CSE", "ECE"], quotas: [], industries: ["Software"], policy: { label: "Campus policy", minimumCgpa: "6" }, categories: [] };
const importResult = {
  intakeId: id,
  fields: {
    company_name: "Example employer", title: "Graduate analyst", package_lpa: 8, location: "Bengaluru", drive_date: "", registration_deadline: "",
    min_cgpa: 7, max_backlogs: 0, branches: ["CSE"], skills: "SQL, Excel", description: "Analyst role.", rounds: ["Aptitude", "Interview"],
    required_documents: "Resume", job_category: "", employment_type: "full-time", openings: 10, contact: "",
  },
  missingFields: ["drive_date", "registration_deadline", "job_category", "contact"],
  warnings: ["The PDF did not state a drive date."],
  document: { filename: "drive.pdf", pageCount: 2, chars: 1840, truncated: false, lowText: false, stored: "text" },
  text: "Graduate analyst at Example employer.",
};

const entry = `import React from 'react';import{createRoot}from'react-dom/client';
import{StudentShell}from'@/features/student/components/StudentShell';
import{InterviewRoom,InterviewResults,InterviewPlanView}from'@/features/student/components/InterviewRoom';
import{TestResults}from'@/features/student/components/Assessments';
import{StudentChat}from'@/features/student/components/StudentChat';
import{Dashboard}from'@/features/student/components/Dashboard';
import{Workspace}from'@/features/placement/components/Workspace';
import{DriveCreator}from'@/features/placement/components/DriveImport';
const session=${JSON.stringify(session)},completed=${JSON.stringify(completed)},plan=${JSON.stringify(plan)},attempt=${JSON.stringify(attempt)},withheld=${JSON.stringify(withheld)},dashboard=${JSON.stringify(dashboard)},company=${JSON.stringify(company)},options=${JSON.stringify(options)};
const route=location.pathname.split('/').pop();
const student=(page)=><StudentShell name='Example Student' usn='QA001'>{page}</StudentShell>;
const pages={
 room:()=>student(<InterviewRoom initial={session}/>),
 report:()=>student(<InterviewResults initial={completed}/>),
 plan:()=>student(<InterviewPlanView plan={plan}/>),
 result:()=>student(<TestResults initial={attempt}/>),
 withheld:()=>student(<TestResults initial={withheld}/>),
 chat:()=>student(<StudentChat initial={[{id:'${id}',title:'Resume feedback',updated_at:'${now}'},{id:'22222222-2222-4222-8222-222222222222',title:'Interview plan',updated_at:'${now}'}]}/>),
 dashboard:()=>student(<Dashboard data={dashboard}/>),
 'drive-import':()=><Workspace><h1>Create a placement drive.</h1><DriveCreator companies={[company]} options={options}/></Workspace>,
};
import{depositMedia}from"@/features/student/lib/media";if(location.pathname.endsWith("/room"))depositMedia(session.id,window.__makeInterviewMedia());createRoot(document.getElementById('root')).render(<React.StrictMode>{pages[route]()}</React.StrictMode>);`;
const mocks = {
  "next/link": "import React from'react';export default function Link({children,prefetch,scroll,...p}){return <a {...p}>{children}</a>}",
  "next/navigation": "export const usePathname=()=>location.pathname.endsWith('/room')?'/student/interview/session/fixture':location.pathname.endsWith('/chat')?'/student/observation-haki':location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);const router={push:p=>{window.__pushed=p},replace:p=>{window.__pushed=p},refresh:()=>{}};export const useRouter=()=>router;",
  "@/app/login/actions": "export async function signOut(){}",
  "@/app/placement/actions": "export async function changePlacement(){return {error:'',success:'Changes saved.'}}",
};
const send = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

(async () => {
  let server, browser;
  const calls = [];
  try {
    await build({
      stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
      bundle: true, outfile: path.join(dir, "bundle.js"), jsx: "automatic", platform: "browser",
      define: { "process.env.NODE_ENV": '"development"' },
      plugins: [{
        name: "boundaries",
        setup(b) {
          b.onResolve({ filter: /.*/ }, (a) => (mocks[a.path] ? { path: a.path, namespace: "mock" } : undefined));
          b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({ contents: mocks[a.path], loader: "tsx", resolveDir: process.cwd() }));
        },
      }],
    });
    const css =
      fs.readFileSync("src/features/student/components/interview-meeting.css","utf8") + "*{box-sizing:border-box}body,h1,h2,h3,p,dl,dd{margin:0}body{font-family:Arial}a{color:inherit;text-decoration:none}button,input,textarea,select{font:inherit}button{cursor:pointer}" +
      fs.readFileSync("src/app/globals.css", "utf8").replace('@import "tailwindcss";', "") +
      fs.readFileSync("src/app/student/student.css", "utf8") + fs.readFileSync("src/app/student/workspace-polish.css", "utf8") + fs.readFileSync("src/app/student/interview/interview-workspace.css", "utf8") +
      fs.readFileSync("src/features/student/components/interview-studio.css", "utf8") +
      fs.readFileSync("src/app/student/observation-haki/haki.css", "utf8") +
      fs.readFileSync("src/app/student/observation-haki/haki-navigation.css", "utf8") +
      fs.readFileSync("src/app/workspace.css", "utf8") +
      fs.readFileSync("src/app/placement/placement.css", "utf8");
    server = http.createServer(async (req, res) => {
      if (req.url === "/bundle.js") {
        res.setHeader("Content-Type", "text/javascript");
        return res.end(fs.readFileSync(path.join(dir, "bundle.js")));
      }
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const raw = Buffer.concat(chunks).toString();
      const body = raw ? JSON.parse(raw) : undefined;
      if (req.url.startsWith("/student/api/netcheck")) {
        const bytes = Number(new URL(req.url, "http://x").searchParams.get("bytes")) || 1024;
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("Cache-Control", "no-store");
        return res.end(Buffer.alloc(bytes, 7));
      }
      if (req.url.startsWith("/student/api/")) {
        calls.push({ url: req.url, body });
        const p = req.url.replace("/student/api/", "");
        if (p === "assistant/status") return send(res, 200, { data: { chatReady: true, researchReady: true } });
        if (p === "conversations" && req.method === "POST") return send(res, 200, { data: { id } });
        if (p === "conversations") return send(res, 200, { data: [{ id, title: "Resume feedback", updated_at: now }, { id: "22222222-2222-4222-8222-222222222222", title: "Interview plan", updated_at: now }] });
        if (p.endsWith("/message"))
          return send(res, 200, {
            data: {
              conversationId: id,
              text: "## Where you stand\n- **SQL**: strong project evidence\n- Excel: not shown yet\n<script>window.__xss=1</script>",
              card: {
                type: "jd-match", title: "Graduate analyst · Example employer", summary: "Good base; show Excel and a measured result.", score: 64,
                items: [
                  { label: "SQL", description: "Tracker project uses PostgreSQL.", status: "strong" },
                  { label: "Excel", description: "No evidence in the resume.", status: "missing" },
                  { label: "Communication", description: "Presentations mentioned briefly.", status: "partial" },
                ],
                actions: ["Practise an Excel answer"],
              },
              sources: [
                { title: "Analyst skills overview", url: "https://example.org/analyst", description: "Skills employers list.", domain: "example.org" },
                { title: "Unsafe link", url: "javascript:alert(1)", description: "Must not render." },
              ],
              research: "used",
              researchInfo: { query: body.message, resultCount: 1, results: [{title:"Analyst skills overview",url:"https://example.org/analyst",description:"Skills employers list.",domain:"example.org"}] },
            },
          });
        if (p.startsWith("sessions/")) return send(res, 200, { data: session });
        return send(res, 200, { data: [] });
      }
      if (req.url === "/placement/drive-import-api") {
        calls.push({ url: req.url, body: { filename: body?.filename } });
        return send(res, 200, { data: importResult });
      }
      res.setHeader("Content-Type", "text/html");
      res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>(${installInterviewSecurity.toString()})({ready:true});</script><script src="/bundle.js"></script></body></html>`);
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ headless: true, ...(process.platform === "win32" ? { channel: "msedge" } : {}) });
    const errors = [];
    const open = async (theme, width) => {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript((t) => { try { localStorage.setItem("dsu-student-theme", t); } catch {} }, theme);
      const page = await context.newPage();
      page.on("console", (m) => {
        if (m.type() === "error" && !/Failed to load resource|favicon/.test(m.text())) errors.push(m.text());
      });
      page.on("pageerror", (e) => errors.push(String(e)));
      return { context, page };
    };
    const expectations = {
      room: ["Following up", "Conversation"],
      report: ["STAR"],
      plan: ["Interview instructions", "Required in every interview"],
      result: ["Reasoning", "Ratio reasoning needs work."],
      withheld: ["release"],
      dashboard: ["Your preparation", "Example."],
      "drive-import": ["Import from drive PDF"],
      chat: ["What can I help you with?", "Find my direction"],
    };
    const checks = [];
    for (const theme of ["light", "dark"])
      for (const width of [1440, 375]) {
        const { context, page } = await open(theme, width);
        for (const [route, texts] of Object.entries(expectations)) {
          await page.goto(`${origin}/qa/${route}`);
          await page.locator("h1").first().waitFor({ timeout: 10000 });
          await page.waitForTimeout(400);
          const text = await page.locator("body").innerText();
          for (const t of texts) assert.ok(text.toLowerCase().includes(t.toLowerCase()), `${route} (${theme}, ${width}px) shows "${t}". Page text: ${text.replace(/\s+/g, " ").slice(0, 700)}`);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          assert.ok(overflow <= 1, `${route} (${theme}, ${width}px) has no horizontal scroll (overflow ${overflow}px)`);
          if (route === "room") {
            await page.getByRole("button", { name: "Conversation settings", exact: true }).click();
            const voices = page.getByRole("group", { name: "Interviewer voice", exact: true });
            assert.equal(await voices.getByRole("button").count(), 4);
            await voices.getByRole("button", { name: /Focused/ }).click();
            assert.equal(await voices.getByRole("button", { name: /Focused/ }).getAttribute("aria-pressed"), "true");
            assert.equal(await voices.locator('[aria-pressed="true"]').count(), 1);
            assert.ok(await page.getByRole("button", { name: "Start microphone", exact: true }).isVisible());
            await page.getByRole("button", {name:"Done",exact:true}).click();
          }
          if (route === "chat") {
            assert.equal(await page.locator(".st-sidebar, .st-topbar, .st-footer").count(), 0, "Haki has no dashboard frame");
            assert.equal(await page.getByRole("dialog", {name:"Conversation history"}).isVisible(), false, "mobile drawer stays closed until requested");
            assert.equal(await page.getByRole("complementary", { name: "Chat sidebar" }).isVisible(), width > 900, "desktop recents sidebar follows viewport");
            const bounds = await page.locator(".hk-page").boundingBox();
            assert.equal(bounds.x, 0);
            assert.equal(Math.round(bounds.width), width);
            assert.equal(Math.round(bounds.height), 900);
            assert.ok(await page.getByRole("button", {name:"Send message",exact:true}).isVisible());
            if (width > 900) assert.equal(await page.getByRole("link", {name:"Back to dashboard"}).getAttribute("href"), "/student/dashboard");
          }
          await page.screenshot({ path: path.join(dir, `${route}-${theme}-${width}.png`), fullPage: true });
        }
        await context.close();
      }
    checks.push("room, report, plan, result, withheld, dashboard and drive import at 1440/375 px in light and dark");

    // Withheld answers: no expected answers or section marks on the page.
    {
      const { context, page } = await open("light", 1440);
      await page.goto(`${origin}/qa/withheld`);
      await page.locator("h1").first().waitFor();
      const text = await page.locator("body").innerText();
      assert.ok(!/Expected answer|Correct answer: Two/i.test(text), "withheld result hides answer keys");
      await context.close();
      checks.push("withheld result hides keys");
    }

    // Haki chat: optimistic send, JD match card, safe formatting, safe sources.
    {
      const { context, page } = await open("light", 1440);
      await page.goto(`${origin}/qa/chat`);
      await page.locator("h1").first().waitFor();
      const box = page.locator("textarea").first();
      await page.getByRole("button", {name:"Web search",exact:true}).click();
      await box.fill("Compare my profile with the analyst JD");
      const beforeEnter = calls.filter(c => c.url.endsWith("/message")).length;
      await box.press("Shift+Enter");
      assert.ok((await box.inputValue()).endsWith("\n"), "Shift+Enter adds a new line");
      assert.equal(calls.filter(c => c.url.endsWith("/message")).length, beforeEnter, "Shift+Enter does not send");
      await box.press("Enter");
      await page.getByText("JD match", { exact: false }).first().waitFor({ timeout: 10000 });
      const text = await page.locator("body").innerText();
      assert.ok(text.includes("Compare my profile with the analyst JD"), "user message stays visible");
      assert.ok(text.includes("Where you stand"), "heading rendered");
      assert.equal(await box.inputValue(), "", "Enter submits and clears the main message box");
      assert.equal(calls.filter(c => c.url.endsWith("/message")).length, beforeEnter + 1, "Enter sends exactly one message");
      assert.equal(await page.evaluate(() => window.__xss), undefined, "no script execution from AI text");
      const hrefs = await page.locator('.st-sources[aria-label="Sources"] a').evaluateAll((links) => links.map((a) => a.getAttribute("href")));
      assert.deepEqual(hrefs, ["https://example.org/analyst"], "only http(s) sources are linked");
      const rel = await page.locator(".st-sources a").first().getAttribute("rel");
      assert.ok(/noopener/.test(rel) && /noreferrer/.test(rel), "source links are isolated");
      assert.equal(calls.filter(c=>c.url.endsWith('/message')).at(-1).body.webSearch,true,'enabled search is sent to campus services');
      assert.ok(await page.locator('.hk-answer-phrase').count()>0,'new answers reveal in short phrases');
      assert.equal(await page.locator('.hk-answer-phrase').first().evaluate(el=>getComputedStyle(el).animationName),'hk-answer-reveal');
      await page.locator('.hk-search-activity summary').click();
      assert.equal(await page.locator('.hk-search-query').innerText(),'Compare my profile with the analyst JD');
      assert.equal(await page.locator('.hk-search-activity a').getAttribute('href'),'https://example.org/analyst');
      await page.locator('.st-chat-assistant').evaluate(el=>Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished)));
      assert.equal(await page.locator('.hk-answer-phrase').evaluateAll(els=>els.every(el=>getComputedStyle(el).opacity==='1')),true,'the full answer becomes visible after its bounded reveal');
      await page.screenshot({ path: path.join(dir, "chat-conversation.png"), fullPage: true });
      await page.getByRole('button',{name:'New conversation',exact:true}).first().click();
      assert.equal(await page.getByRole('button',{name:'Web search',exact:true}).getAttribute('aria-pressed'),'true','new chat preserves the selected search preference');
      await page.reload();
      assert.equal(await page.getByRole('button',{name:'Web search',exact:true}).getAttribute('aria-pressed'),'true','search preference survives reload');
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.getByLabel('Message Observation Haki').fill('Show a clear answer without motion.');await page.getByRole('button',{name:'Send message',exact:true}).click();await page.locator('.hk-answer-phrase').first().waitFor();
      assert.equal(await page.locator('.hk-answer-phrase').first().evaluate(el=>getComputedStyle(el).animationName),'none','reduced motion reveals the answer immediately');
      await context.close();
      checks.push("chat send, JD match card, safe formatter/sources, phrase reveal/reduced motion and persistent web-search preference");
    }

    // A full answer must stay in one reading column, with a right-aligned
    // question and real block spacing rather than a wall of Markdown text.
    for (const theme of ["light", "dark"]) {
      const { context, page } = await open(theme, 1440);
      await page.route("**/student/api/conversations/*/message", route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: {
        text: "Your SQL project gives you a useful starting point for graduate analyst roles. Focus your next week on showing how you use data to solve a problem.\n\n## Build on what you already know\n\nYou have **practical project evidence**. Explain the problem you solved, the decision you made, and the result you observed.\n\n- Write one concise project story with a measurable outcome.\n- Practise joins, grouping, and explaining a query in plain language.\n- Add one spreadsheet example to broaden your evidence.\n\n## A focused plan for this week\n\n1. Choose a real dataset and write three useful queries.\n2. Check the results and document one trade-off.\n3. Rehearse a two-minute explanation of your work.\n\nUse `GROUP BY` when you need a summary for each category.\n\n```sql\nSELECT department, COUNT(*) AS total\nFROM students\nGROUP BY department;\n```\n\nWhich part would you like to practise first?", card: null, sources: []
      } }) }));
      await page.goto(`${origin}/qa/chat`);
      await page.getByLabel("Message Observation Haki").fill("How can I prepare for a graduate analyst role with my SQL project experience?");
      await page.getByRole("button", { name: "Send message", exact: true }).click();
      await page.getByRole("heading", { name: "Build on what you already know" }).waitFor();
      await page.waitForFunction(()=>{const answer=document.querySelector('.st-chat-assistant').getBoundingClientRect(),area=document.querySelector('.st-chat-messages').getBoundingClientRect();return answer.y>=area.y-1&&answer.y<area.y+80;},undefined,{timeout:3000});
      assert.equal(await page.locator(".st-chat-assistant .st-rich li").count(), 6);
      assert.equal(await page.locator(".st-chat-assistant pre").count(), 1);
      await page.locator('.st-chat-assistant').evaluate(el=>Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished)));
      for (const width of [320, 390, 768, 1440, 1905]) {
        await page.setViewportSize({ width, height: 900 });
        const layout = await page.evaluate(() => {
          const rect = selector => document.querySelector(selector).getBoundingClientRect();
          const thread = rect(".hk-thread"), assistant = rect(".st-chat-assistant"), user = rect(".st-chat-user .hk-message-content"), form = rect(".st-chat-compose form");
          const rich = document.querySelector(".st-rich");
          return { thread: { x: thread.x, right: thread.right, width: thread.width }, assistantX: assistant.x, userRight: user.right, formX: form.x, formRight: form.right, fontSize: parseFloat(getComputedStyle(rich).fontSize), listGap: parseFloat(getComputedStyle(rich.querySelector("ul")).gap), overflow: document.documentElement.scrollWidth > innerWidth, messageOverflow: document.querySelector(".st-chat-messages").scrollWidth > document.querySelector(".st-chat-messages").clientWidth };
        });
        assert.ok(!layout.overflow && !layout.messageOverflow, `no horizontal overflow at ${width}`);
        assert.ok(Math.abs(layout.thread.x - layout.assistantX) < 2, "answer aligns with reading column");
        assert.ok(Math.abs(layout.thread.right - layout.userRight) < 2, "question aligns right within the column");
        assert.ok(Math.abs(layout.thread.x - layout.formX) < 2 && Math.abs(layout.thread.right - layout.formRight) < 2, "composer and conversation align");
        assert.ok(layout.thread.width <= 800 && layout.fontSize >= 15 && layout.listGap >= 10, "readable width, text and list spacing");
        await page.locator(".st-chat-messages").evaluate(el => { el.scrollTop = 0; });
        await page.screenshot({ path: path.join(dir, `haki-answer-${theme}-${width}.png`), fullPage: true });
      }
      await context.close();
    }
    checks.push("Haki readable answers, aligned bubbles/composer and Markdown at 320–1905 px in both themes");

    // Search availability can recover after a backend restart; checking it
    // again must not discard a question or silently enable search.
    {
      const {context,page}=await open('light',390);let ready=false;
      await page.route('**/student/api/assistant/status',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({data:{chatReady:true,researchReady:ready}})}));
      await page.goto(`${origin}/qa/chat`);await page.getByRole('button',{name:'Check web search',exact:true}).waitFor();
      await page.getByLabel('Message Observation Haki').fill('Keep this question while reconnecting search.');ready=true;
      await page.getByRole('button',{name:'Check web search',exact:true}).click();await page.getByRole('button',{name:'Web search',exact:true}).waitFor();
      assert.equal(await page.getByLabel('Message Observation Haki').inputValue(),'Keep this question while reconnecting search.');
      assert.equal(await page.getByRole('button',{name:'Web search',exact:true}).getAttribute('aria-pressed'),'false');
      await context.close();checks.push('web search reconnects without losing the draft or changing opt-in');
    }

    // A service failure keeps the question and supports retry; rapid switching
    // must never show a late response from the previous conversation.
    {
      const { context, page } = await open("light", 1440);
      let attempts = 0;
      await page.route("**/student/api/conversations/*/message", async route => {
        attempts++;
        await route.fulfill({ status: attempts === 1 ? 503 : 200, contentType: "application/json", body: JSON.stringify(attempts === 1 ? {error:"The assistant is reconnecting. Please retry."} : {data:{text:"Your question is safe. Let’s work on it.",card:null,sources:[]}}) });
      });
      await page.goto(`${origin}/qa/chat`);
      await page.getByRole("button", { name: /Find my direction/ }).click();
      assert.equal(await page.getByLabel("Message Observation Haki").inputValue(), "Help me choose my next preparation step.");
      await page.getByRole("button", { name: "Send message", exact: true }).click();
      await page.getByText(/Not sent.*reconnecting/).waitFor();
      await page.getByRole("button", { name: "Retry", exact: true }).click();
      await page.getByText("Your question is safe. Let’s work on it.", {exact:true}).waitFor();
      assert.equal(await page.locator(".st-chat-user").count(), 1, "retry does not duplicate the question");
      await page.route("**/student/api/conversations/*", async route => {
        const first = route.request().url().endsWith("/" + id);
        if (first) await new Promise(resolve => setTimeout(resolve, 350));
        await route.fulfill({ contentType:"application/json", body:JSON.stringify({data:{context:{},drive:null,messages:[{id:first?"first":"second",role:"assistant",content:first?"First conversation answer":"Second conversation answer",card:null}]}}) }).catch(() => {});
      });
      await page.getByRole("button", {name:/^Resume feedback/}).click();
      await page.getByRole("button", {name:/^Interview plan/}).click();
      await page.getByText("Second conversation answer", {exact:true}).waitFor();
      await page.waitForTimeout(500);
      assert.equal(await page.getByText("First conversation answer", {exact:true}).count(), 0);
      await page.screenshot({path:path.join(dir,"haki-recovery.png"),fullPage:true});
      await context.close();
      checks.push("Haki starters, failed-message retry and stale-conversation protection");
    }
    // Desktop navigation remains available beside the conversation. On phones
    // it becomes a modal drawer with keyboard dismissal and focus restoration.
    {
      const { context, page } = await open("light", 1440);
      await page.route("**/student/api/conversations/*", route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { context: {}, drive: null, messages: [{ id: "saved-answer", role: "assistant", content: "Your saved preparation notes.", card: null }] } }) }));
      await page.goto(`${origin}/qa/chat`);
      const sidebar = page.getByRole("complementary", { name: "Chat sidebar" });
      await sidebar.getByRole("heading", { name: "Recents", exact: true }).waitFor();
      const resizer = page.getByRole("separator", {name:"Resize chat sidebar"});
      await resizer.focus();
      await resizer.press("End");
      assert.equal(await resizer.getAttribute("aria-valuenow"),"420");
      const edge = await resizer.boundingBox();
      await page.mouse.move(edge.x + edge.width / 2, edge.y + 140);
      await page.mouse.down();
      await page.mouse.move(edge.x + edge.width / 2 - 80, edge.y + 140,{steps:8});
      await page.mouse.up();
      assert.equal(Math.round((await sidebar.boundingBox()).width),340,"drag adjusts sidebar width");
      await page.reload();
      await page.waitForFunction(()=>document.querySelector('[aria-label="Resize chat sidebar"]').getAttribute('aria-valuenow')==='340');
      assert.equal(Math.round((await sidebar.boundingBox()).width),340,"width survives refresh");
      await resizer.focus();
      await resizer.press("Home");
      assert.equal(await resizer.getAttribute("aria-valuenow"),"220");
      await resizer.press("ArrowLeft");
      assert.equal(await resizer.getAttribute("aria-valuenow"),"220","resize has a minimum");
      await resizer.dblclick();
      assert.equal(await resizer.getAttribute("aria-valuenow"),"264","double click resets width");
      await page.getByLabel("Message Observation Haki").fill("Keep this draft while I browse the sidebar.");
      await sidebar.getByRole("textbox", { name: "Search conversations" }).fill("resume");
      assert.equal(await sidebar.getByRole("button", {name:/^Interview plan/}).count(), 0);
      await sidebar.getByRole("textbox", { name: "Search conversations" }).fill("not found");
      await sidebar.getByText("No chats found", {exact:true}).waitFor();
      await sidebar.getByRole("textbox", { name: "Search conversations" }).fill("");
      await page.getByRole("button", { name: "Collapse sidebar", exact: true }).click();
      assert.equal(await sidebar.isVisible(), false);
      assert.equal(await page.getByLabel("Message Observation Haki").inputValue(), "Keep this draft while I browse the sidebar.");
      await page.getByRole("button", { name: "Expand sidebar", exact: true }).click();
      await sidebar.getByRole("button", { name:/^Resume feedback/ }).click();
      await page.getByText("Your saved preparation notes.", {exact:true}).waitFor();
      assert.equal(await page.locator('.hk-answer-phrase').count(),0,'saved answers display immediately without replaying the reveal');
      assert.equal(await sidebar.locator('[aria-current="true"]').innerText(), "Resume feedback");
      await sidebar.getByRole("button", { name: "New conversation", exact: true }).click();
      assert.equal(await page.locator(".st-chat-message").count(), 0);
      await sidebar.getByRole("button", { name: "Resume and job description", exact: true }).click();
      await page.getByRole("dialog", { name:"Resume and JD review" }).waitFor();
      await page.getByRole("button", { name:"Close JD review" }).click();
      await page.screenshot({path:path.join(dir,"haki-sidebar-desktop.png"),fullPage:true});
      await page.setViewportSize({width:390,height:900});
      await page.getByLabel("Message Observation Haki").fill("Mobile draft stays here.");
      const toggle = page.getByRole("button", { name:"Show conversations", exact:true });
      await toggle.click();
      const drawer = page.getByRole("dialog", {name:"Conversation history"});
      await drawer.getByRole("heading", {name:"Recents",exact:true}).waitFor();
      await page.screenshot({path:path.join(dir,"haki-sidebar-mobile.png"),fullPage:true});
      await page.keyboard.press("Escape");
      assert.equal(await drawer.isVisible(),false);
      assert.equal(await toggle.evaluate(el => el === document.activeElement),true,"drawer restores opener focus");
      assert.equal(await page.getByLabel("Message Observation Haki").inputValue(),"Mobile draft stays here.");
      await toggle.click();
      await drawer.getByRole("button",{name:/^Interview plan/}).click();
      await drawer.waitFor({state:"hidden"});
      await toggle.click();
      await page.setViewportSize({width:1440,height:900});
      await drawer.waitFor({state:"hidden"});
      assert.equal(await sidebar.isVisible(),true,"desktop resize closes mobile modal");
      await context.close();
      checks.push("Haki sidebar recents/search, selected chat, collapse, drag/keyboard resize with saved width, new chat, context review and mobile focus/Escape/resize");
    }
    {
      const { context, page } = await open("light", 375);
      await page.route("**/student/api/assistant/status", route => route.fulfill({contentType:"application/json",body:JSON.stringify({data:{chatReady:false,researchReady:false}})}));
      await page.goto(`${origin}/qa/chat`);
      await page.getByText("Haki needs its AI connection configured.",{exact:true}).waitFor();
      await page.getByLabel("Message Observation Haki").fill("My draft stays here.");
      assert.equal(await page.getByRole("button",{name:"Send message",exact:true}).isDisabled(),true);
      await page.getByRole("button",{name:"Show conversations"}).click();
      await page.getByRole("dialog",{name:"Conversation history"}).getByRole("link",{name:"Back to dashboard"}).waitFor();
      await page.getByRole("button",{name:"Close conversation history"}).click();
      assert.equal(await page.getByLabel("Message Observation Haki").inputValue(),"My draft stays here.");
      await page.screenshot({path:path.join(dir,"haki-service-state-mobile.png"),fullPage:true});
      await page.getByRole("button",{name:"Show conversations"}).click();
      await page.getByRole("link",{name:"Back to dashboard"}).click();
      await page.waitForURL("**/student/dashboard");
      assert.equal(await page.locator(".st-sidebar").count(),1,"dashboard frame returns after leaving Haki");
      await context.close();
      checks.push("full-screen Haki, mobile history drawer, draft preservation and back-to-dashboard navigation");
    }

    // Drive import: fills the form, then asks before replacing typed values.
    {
      const { context, page } = await open("light", 1440);
      await page.goto(`${origin}/qa/drive-import`);
      await page.locator("h1").first().waitFor();
      await page.setInputFiles('input[type="file"]', { name: "drive.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%fixture\n") });
      await page.getByRole("button", { name: "Read PDF" }).click();
      await page.getByRole("button", { name: /Fill the form/ }).waitFor();
      assert.ok((await page.locator("body").innerText()).includes("fields found"), "review summary shown");
      await page.getByRole("button", { name: /Fill the form/ }).click();
      const title = page.locator('input[name="title"]');
      await title.waitFor();
      assert.equal(await title.inputValue(), "Graduate analyst", "form filled from the PDF");
      await title.fill("My own title");
      let asked = false;
      page.once("dialog", (d) => { asked = true; void d.dismiss(); });
      await page.getByRole("button", { name: /Fill the form again/ }).click();
      await page.waitForTimeout(300);
      assert.ok(asked, "officer is asked before typed values are replaced");
      assert.equal(await page.locator('input[name="title"]').inputValue(), "My own title", "declining keeps typed values");
      assert.ok(!calls.some((c) => /save|publish/.test(c.url)), "nothing saved or published");
      await context.close();
      checks.push("drive PDF import fill and overwrite confirmation");
    }

    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, checks, screenshots: path.relative(process.cwd(), dir), data: "synthetic fixtures; campus APIs mocked" }));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await browser?.close();
    server?.close();
  }
})();
