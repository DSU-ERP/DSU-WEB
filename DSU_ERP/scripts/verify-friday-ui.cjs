// Renders the real F.R.I.D.A.Y. components inside the real Workspace shell
// with synthetic data, then drives them in a browser. The model stream is a
// fixture replayed through the actual event protocol; speech recognition is a
// stand-in, and the microphone is Chromium's fake device, so the level bars
// are driven by a real audio signal. Screenshots go to .qa/friday-ui/.
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const { build } = require("esbuild"),
  { chromium } = require("@playwright/test");

const root = process.cwd(),
  dir = path.join(root, ".qa/friday-ui");
fs.mkdirSync(dir, { recursive: true });

// A tone that swells and fades, written as a WAV and played through the fake
// microphone. The browser's default fake device is not guaranteed to make
// sound (it is silent in some Edge releases), and the level bars need a real
// signal to follow.
const tone = path.join(dir, "tone.wav");
{
  const rate = 16000,
    n = rate * 2,
    data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const s = i / rate;
    const swell = 0.15 + 0.85 * Math.abs(Math.sin(Math.PI * 1.5 * s));
    data.writeInt16LE(Math.round(Math.sin(2 * Math.PI * 440 * s) * swell * 0.8 * 32767), i * 2);
  }
  const head = Buffer.alloc(44);
  head.write("RIFF", 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write("WAVEfmt ", 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(rate, 24);
  head.writeUInt32LE(rate * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write("data", 36);
  head.writeUInt32LE(data.length, 40);
  fs.writeFileSync(tone, Buffer.concat([head, data]));
}

const now = Date.now(),
  hour = 3600e3,
  day = 24 * hour;
// Anchored to local midnight so the date groups hold at any time of day.
const midnight = new Date(new Date(now).setHours(0, 0, 0, 0)).getTime();
const history = [
  { id: "c1000000-0000-4000-8000-000000000001", title: "Batch 2026 eligibility by branch", updated_at: new Date(now - 60e3).toISOString() },
  { id: "c1000000-0000-4000-8000-000000000002", title: "Open recruitment drives this month", updated_at: new Date(now - 120e3).toISOString() },
  { id: "c1000000-0000-4000-8000-000000000003", title: "Top 20 students in CSE by CGPA", updated_at: new Date(midnight - hour).toISOString() },
  { id: "c1000000-0000-4000-8000-000000000004", title: "Placement statistics for 2025", updated_at: new Date(midnight - 12 * day).toISOString() },
];
const capabilities = { chat: true, model: "deepseek/deepseek-v4.1-flash", provider: "baseten/fp8, deepinfra/fp8", serverSpeechToText: false, serverTextToSpeech: false };

// Fixture answer: exercises paragraphs, bold, a table, a list, an internal
// link, an outside link that must not become clickable, and injected markup
// that must render as text.
const answer =
  "Using the configured rule (a valid CGPA of 6.75 or above, with no backlog condition), **1,084 of 1,420** students in Batch 2026 are placement eligible.\n\n" +
  "| Branch | Eligible | Total |\n|---|---:|---:|\n| CSE | 412 | 498 |\n| ECE | 287 | 371 |\n| ISE | 205 | 268 |\n| ME | 180 | 283 |\n\n" +
  "- 194 students have a valid CGPA below 6.75.\n- 142 records have no valid CGPA and are unclassified.\n\n" +
  "The highest-ranked student's record is at /placement/students/11111111-1111-4111-8111-111111111111. An outside page such as [this one](https://example.com) is not linked. <img src=x onerror=\"window.__xss=1\">\n\n" +
  "Shall I break the eligible students down by quota?";

const events = [
  [0, { type: "status", state: "preparing" }],
  [250, { type: "status", state: "retrieving" }],
  [300, { type: "tool_status", label: "Checking eligibility rules", state: "running" }],
  [650, { type: "tool_status", label: "Checking eligibility rules", state: "done" }],
  [700, { type: "tool_status", label: "Retrieving batch figures", state: "running" }],
  [1100, { type: "tool_status", label: "Retrieving batch figures", state: "done" }],
  [1150, { type: "status", state: "responding" }],
];
let t = 1200;
for (let i = 0; i < answer.length; i += 24) events.push([(t += 18), { type: "text_delta", text: answer.slice(i, i + 24) }]);
events.push([(t += 40), { type: "usage", usage: { promptTokens: 2104, completionTokens: 236, totalTokens: 2340 } }]);
events.push([(t += 10), { type: "done", text: answer }]);
events.push([(t += 10), { type: "saved", conversationId: "c1000000-0000-4000-8000-000000000009" }]);

// A profile question: the server resolves students through its tools and
// emits profile_link events. Only well-formed, distinct links may render, and
// the model's own text links are not the mechanism for the button.
const PROFILE_A = "2b7d4c1e-5f3a-4e8b-9c6d-0a1b2c3d4e5f";
const PROFILE_B = "7e8f9a0b-1c2d-4e3f-8a5b-6c7d8e9f0a1b";
const profileAnswer =
  "### Aditi Rao\n\n" +
  "- **USN:** 1DS23CS014\n- **Department:** CSE\n- **Batch:** 2027\n- **CGPA:** 9.12 (institution record)\n" +
  "- **Category:** Advanced (institution record)\n- **Batch rank:** 2 within the 2027 batch (dense rank)\n" +
  "- **Category rank:** 2 within the Advanced category of the 2027 batch (dense rank)\n" +
  "- **GitHub:** 18 public repositories (verified on GitHub)\n- **LeetCode:** 312 problems solved (student submitted)\n" +
  "- **Kaggle:** Not linked (unavailable)\n\n" +
  "The profile summary describes backend projects in Python (AI generated).\n\n" +
  "I also compared her with Rahul Menon (1DS23CS027), who is rank 5 within the same category.";
const profileEvents = [
  [0, { type: "status", state: "preparing" }],
  [200, { type: "status", state: "retrieving" }],
  [220, { type: "tool_status", label: "Opening student profile", state: "running" }],
  [500, { type: "tool_status", label: "Opening student profile", state: "done" }],
  [510, { type: "profile_link", id: PROFILE_A, usn: "1DS23CS014", name: "Aditi Rao", url: `/placement/students/${PROFILE_A}` }],
  // A duplicate and three malformed events must all be ignored.
  [515, { type: "profile_link", id: PROFILE_A, usn: "1DS23CS014", name: "Aditi Rao", url: `/placement/students/${PROFILE_A}` }],
  [520, { type: "profile_link", id: "not-a-uuid", usn: "X", name: "Bad", url: "/placement/students/not-a-uuid" }],
  [525, { type: "profile_link", id: PROFILE_B, usn: "X", name: "Elsewhere", url: `https://example.com/placement/students/${PROFILE_B}` }],
  [530, { type: "profile_link", id: PROFILE_B, usn: "X", name: "Other page", url: `/student/${PROFILE_B}` }],
  [540, { type: "tool_status", label: "Opening student profile", state: "running" }],
  [700, { type: "tool_status", label: "Opening student profile", state: "done" }],
  [710, { type: "profile_link", id: PROFILE_B, usn: "1DS23CS027", name: "Rahul Menon", url: `/placement/students/${PROFILE_B}` }],
  [750, { type: "status", state: "responding" }],
];
let tp = 800;
for (let i = 0; i < profileAnswer.length; i += 24) profileEvents.push([(tp += 14), { type: "text_delta", text: profileAnswer.slice(i, i + 24) }]);
profileEvents.push([(tp += 30), { type: "done", text: profileAnswer }]);
profileEvents.push([(tp += 10), { type: "saved", conversationId: "c1000000-0000-4000-8000-000000000010" }]);

const entry = `import React from 'react';import {createRoot} from 'react-dom/client';
import {Workspace} from '@/features/placement/components/Workspace';import {FridayChat} from '@/features/assistant/components/FridayChat';
createRoot(document.getElementById('root')).render(<Workspace><FridayChat initialHistory={${JSON.stringify(history)}} initialCapabilities={${JSON.stringify(capabilities)}} focusBatch="2026"/></Workspace>);`;

const mock = {
  "next/link": `import React from 'react';export default function Link({children,prefetch,scroll,...props}){return <a {...props}>{children}</a>}`,
  "next/navigation": `export const useRouter=()=>({push:p=>location.assign(p),refresh(){}});export const usePathname=()=>location.pathname;`,
  "@/app/login/actions": `export async function signOut(){window.__signedOut=true}`,
};

const css =
  "*{box-sizing:border-box}body,h1,h2,h3,p,dl,dd{margin:0}a{color:inherit;text-decoration:none}button{cursor:pointer}" +
  fs.readFileSync("src/app/globals.css", "utf8").replace('@import "tailwindcss";', "") +
  fs.readFileSync("src/app/workspace.css", "utf8") +
  fs.readFileSync("src/app/placement/placement.css", "utf8") +
  fs.readFileSync("src/app/placement/friday.css", "utf8");

// A stand-in for the browser's speech recognition that "hears" a sentence
// word by word, firing the same events the real API fires.
const fakeSpeech = () => {
  class FakeRecognition {
    start() {
      const words = "Show me computer science students with a CGPA above 8.5 who are eligible for tier one drives".split(" ");
      let i = 0;
      setTimeout(() => {
        this.timer = setInterval(() => {
          i++;
          this.onresult?.({ results: [[{ transcript: words.slice(0, i).join(" ") }]] });
          if (i >= words.length) clearInterval(this.timer);
        }, 260);
      }, 500);
    }
    stop() {
      clearInterval(this.timer);
      setTimeout(() => this.onend?.(), 30);
    }
    abort() {
      clearInterval(this.timer);
    }
  }
  window.SpeechRecognition = FakeRecognition;
};

(async () => {
  let browser, server;
  const shots = [];
  try {
    await build({
      stdin: { contents: entry, resolveDir: root, loader: "tsx" },
      bundle: true,
      write: true,
      outfile: path.join(dir, "bundle.js"),
      platform: "browser",
      jsx: "automatic",
      define: { "process.env.NODE_ENV": '"development"' },
      logLevel: "error",
      plugins: [
        {
          name: "component-boundaries",
          setup(b) {
            b.onResolve({ filter: /.*/ }, (args) => (mock[args.path] ? { path: args.path, namespace: "mock" } : undefined));
            b.onLoad({ filter: /.*/, namespace: "mock" }, (args) => ({ contents: mock[args.path], loader: "tsx", resolveDir: root }));
          },
        },
      ],
    });

    const deleted = [];
    server = http.createServer((req, res) => {
      const url = req.url || "/";
      if (url === "/bundle.js") {
        res.setHeader("Content-Type", "text/javascript");
        return res.end(fs.readFileSync(path.join(dir, "bundle.js")));
      }
      if (url.startsWith("/fonts/")) {
        res.setHeader("Content-Type", "font/woff2");
        return res.end(fs.readFileSync(path.join(root, "public", url)));
      }
      if (url.startsWith("/placement/friday-api") && req.method === "POST") {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          const profile = /profile/i.test(JSON.parse(body).message || "");
          const list = profile ? profileEvents : events;
          const end = profile ? tp : t;
          res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8" });
          for (const [at, ev] of list) setTimeout(() => res.write(`data: ${JSON.stringify(ev)}\n\n`), at);
          setTimeout(() => res.end(), end + 50);
        });
        return;
      }
      if (url.startsWith("/placement/assistant-api")) {
        res.setHeader("Content-Type", "application/json");
        if (req.method === "POST") {
          let body = "";
          req.on("data", (c) => (body += c));
          req.on("end", () => {
            const input = JSON.parse(body);
            if (input.operation === "rename") {
              if (input.title === "Simulate failure") {
                res.statusCode = 503;
                return res.end(JSON.stringify({ error: "Rename temporarily unavailable." }));
              }
              const row = history.find((h) => h.id === input.id);
              row.title = input.title.trim();
              return res.end(JSON.stringify({ data: row }));
            }
            deleted.push(input.id);
            res.end(JSON.stringify({ data: { id: input.id } }));
          });
          return;
        }
        return res.end(JSON.stringify({ data: { rows: history.filter((h) => !deleted.includes(h.id)) } }));
      }
      res.setHeader("Content-Type", "text/html");
      res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`);
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const origin = "http://127.0.0.1:" + server.address().port;

    browser = await chromium.launch({
      headless: true,
      args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--use-file-for-fake-audio-capture=" + tone],
      ...(process.platform === "win32" ? { channel: "msedge" } : {}),
    });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.grantPermissions(["microphone"], { origin });
    await context.addInitScript(fakeSpeech);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    const shot = async (name, full = false) => {
      const file = path.join(dir, name + ".png");
      await page.screenshot({ path: file, fullPage: full });
      shots.push(file);
    };
    const noOverflow = async (where) =>
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "horizontal overflow on " + where);

    // 1. Welcome state.
    await page.goto(origin + "/placement/assistants/friday");
    await page.getByRole("heading", { name: "What would you like to know?" }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator(".fr-starter").count(), 4);
    assert.match(await page.locator(".fr-starter").first().innerText(), /Batch 2026/);
    assert.equal(await page.locator(".fr-count").first().innerText(), "4");
    const font = await page.evaluate(() => document.fonts.check('600 16px "Geist"'));
    assert.equal(font, true, "variable Geist should be loaded");
    await noOverflow("welcome");
    assert.equal(await page.locator(".fr-toggle:visible").count(), 1, "one visible speak toggle on desktop");
    // On arrival everything fits: neither the page nor the chat area scrolls.
    const fits = () =>
      page.evaluate(() => {
        const m = document.querySelector(".fr-main");
        return { page: document.documentElement.scrollHeight - innerHeight, main: m.scrollHeight - m.clientHeight };
      });
    let f = await fits();
    assert.ok(f.page <= 0 && f.main <= 0, "welcome must fit without scrolling at 1440x900: " + JSON.stringify(f));
    assert.equal(await page.locator('a[href="/terms"], a[href="/privacy"]').count(), 0, "no policy links inside the app");
    const color = (sel) => page.locator(sel).first().evaluate((el) => getComputedStyle(el).color);
    // The header bar holds only its controls: no back link, label or title.
    assert.equal(await page.locator(".fr-bar").getByText("Campus Intelligence Assistant").count(), 0);
    assert.equal(await page.locator(".fr-bar").getByRole("link").count(), 0, "no back link in the bar");
    await page.locator(".fr-bar").getByRole("heading", { level: 1, name: "F.R.I.D.A.Y." }).waitFor();
    assert.equal(await page.locator(".fr-welcome").getByText("F.R.I.D.A.Y.", { exact: true }).count(), 0, "name moved out of the welcome");
    await page.getByRole("heading", { level: 1, name: "F.R.I.D.A.Y." }).waitFor({ state: "attached" });
    assert.equal(await color(".fr-bar-name"), "rgb(217, 37, 42)", "name in the bar in logo red");
    assert.equal(await page.locator(".fr-bar-name").evaluate((el) => getComputedStyle(el).fontSize), "30px", "larger name");
    assert.equal(await color(".po-nav-friday"), "rgb(208, 35, 41)", "sidebar name in red");
    assert.equal(await page.locator(".fr-starter-source").count(), 0, "starters carry no source labels");
    const edges = await page.evaluate(() => {
      const a = document.querySelector(".fr-starters").getBoundingClientRect();
      const b = document.querySelector(".fr-composer").getBoundingClientRect();
      return { left: Math.abs(a.left - b.left), right: Math.abs(a.right - b.right) };
    });
    assert.ok(edges.left <= 1 && edges.right <= 1, "chat content lines up with the composer: " + JSON.stringify(edges));
    // The welcome input is a single row with no resize grip.
    const hero = await page.locator(".fr-composer--hero textarea").evaluate((el) => {
      const cs = getComputedStyle(el);
      return { height: Math.round(el.getBoundingClientRect().height), resize: cs.resize };
    });
    assert.ok(hero.height <= 44 && hero.resize === "none", "single-row welcome input: " + JSON.stringify(hero));
    const openingComposer = await page.locator(".fr-composer").boundingBox();
    await shot("1-welcome-desktop");

    // 2. Ask a starter question and watch the stream.
    await page.locator(".fr-starter").first().click();
    await page.getByText("Retrieving batch figures").first().waitFor();
    await shot("2a-streaming-desktop");
    await page.getByRole("button", { name: "Copy text" }).waitFor({ timeout: 15000 });
    assert.equal(await page.locator(".fr-answer table tbody tr").count(), 4, "table rows");
    assert.equal(await page.locator(".fr-answer ul li").count(), 2, "list items");
    assert.equal(await page.locator('.fr-answer a[href^="/placement/students/"]').count(), 1, "internal link");
    assert.equal(await page.locator('.fr-answer a[href^="http"]').count(), 0, "outside link must not be clickable");
    assert.equal(await page.locator(".fr-answer img").count(), 0, "injected markup must stay text");
    assert.equal(await page.evaluate(() => window.__xss), undefined, "no script ran");
    assert.equal(await page.locator(".fr-sources").count(), 0, "no sources list");
    assert.equal(await page.getByText(/^Sources$/i).count(), 0, "no sources heading");
    assert.equal(await color(".fr-answer"), "rgb(10, 10, 10)", "reply in near-black");
    assert.equal(await color(".fr-turn--assistant .fr-turn-who"), "rgb(217, 37, 42)");
    assert.equal(await color(".fr-question"), "rgb(23, 23, 23)", "officer message in black");
    assert.equal(await page.locator(".fr-strip, .fr-composer-status, .fr-turn-tokens, .fr-turn-facts").count(), 0, "no dashboard metadata appears after sending");
    assert.equal(await page.getByRole("heading", { name: "What would you like to know?" }).count(), 0, "welcome heading gives way to the conversation");
    assert.equal(await page.locator(".fr-composer").count(), 1, "one reply input");
    assert.equal(await page.locator(".fr-dock .fr-composer").count(), 1, "reply input sits below the conversation");
    const conversationComposer = await page.locator(".fr-composer").boundingBox();
    assert.ok(Math.abs(openingComposer.width - conversationComposer.width) <= 1, "same input width after sending: " + JSON.stringify({ openingComposer, conversationComposer }));
    assert.ok(Math.abs(openingComposer.height - conversationComposer.height) <= 1, "same compact input height after sending");
    const replyBox = await page.locator(".fr-turn--assistant").last().boundingBox();
    assert.ok(replyBox.y + replyBox.height <= conversationComposer.y + 1, "answer ends above the reply input");
    assert.ok(conversationComposer.y + conversationComposer.height <= 900, "reply input stays in the viewport");
    const replySurface = await page.locator(".fr-reply").evaluate((el) => {
      const cs = getComputedStyle(el);
      return { background: cs.backgroundColor, border: cs.borderTopWidth, shadow: cs.boxShadow };
    });
    assert.deepEqual(replySurface, { background: "rgba(0, 0, 0, 0)", border: "0px", shadow: "none" }, "reply stays on the opening canvas");
    await page.getByRole("button", { name: "Copy text" }).waitFor();
    await page.getByRole("button", { name: "Replay answer" }).waitFor();
    await noOverflow("conversation");
    f = await fits();
    assert.ok(f.page <= 0, "the page itself never scrolls: " + JSON.stringify(f));
    await shot("2b-answer-desktop");
    for (const question of ["Break this down by branch", "Show the top 20 students by CGPA"]) {
      const before = await page.locator(".fr-turn--assistant .fr-turn-actions").count();
      await page.getByRole("textbox", { name: "Ask F.R.I.D.A.Y." }).fill(question);
      await page.getByRole("button", { name: "Send", exact: true }).click();
      await page.waitForFunction(
        (n) => document.querySelectorAll(".fr-turn--assistant .fr-turn-actions").length > n,
        before,
        { timeout: 15000 },
      );
    }
    f = await fits();
    assert.ok(f.page <= 0, "page still does not scroll: " + JSON.stringify(f));
    assert.ok(f.main > 0, "a long conversation scrolls inside the chat area: " + JSON.stringify(f));
    await page.waitForTimeout(150);
    const gap = await page.evaluate(() => {
      const m = document.querySelector(".fr-main");
      return Math.round(m.scrollHeight - m.scrollTop - m.clientHeight);
    });
    assert.ok(gap < 8, "the chat follows to the newest reply; distance from bottom " + gap + "px");
    await shot("2c-long-conversation-desktop");

    // 3. Dark theme on the same conversation.
    await page.getByRole("button", { name: "Use dark theme" }).click();
    await page.waitForTimeout(150);
    assert.equal(await color(".fr-answer"), "rgb(232, 236, 227)", "dark reply in light ink");
    assert.equal(await color(".fr-question"), "rgb(232, 236, 227)", "dark officer message stays readable on the canvas");
    assert.equal(
      await page.locator(".fr-question").first().evaluate((el) => getComputedStyle(el).backgroundColor),
      "rgba(0, 0, 0, 0)",
      "no separate message panel in dark mode",
    );
    await shot("3-conversation-dark");
    await page.getByRole("button", { name: "Use light theme" }).click();

    // 4. History drawer, grouping, delete confirmation.
    await page.getByRole("button", { name: /Conversations/ }).click();
    const drawer = page.locator("dialog.fr-drawer");
    await drawer.getByRole("heading", { name: /Conversations/ }).waitFor();
    const groups = await drawer.locator(".fr-drawer-group h3 span:first-child").allInnerTexts();
    assert.deepEqual(groups.map((g) => g.toUpperCase()), ["TODAY", "YESTERDAY", "OLDER"]);
    await page.waitForTimeout(260);
    await shot("4a-history-drawer");
    await drawer.getByRole("button", { name: "Rename conversation: Batch 2026 eligibility by branch" }).click();
    const renameDialog = page.getByRole("dialog", { name: "Rename conversation", exact: true });
    const nameInput = renameDialog.getByLabel("Conversation name");
    await nameInput.fill("   ");
    assert.equal(await renameDialog.getByRole("button", { name: "Save name" }).isDisabled(), true);
    await nameInput.fill("Simulate failure");
    await renameDialog.getByRole("button", { name: "Save name" }).click();
    await renameDialog.getByRole("alert").waitFor();
    // Chromium reports the deliberately simulated 503 to its console as well.
    const expectedError = errors.findIndex((e) => e.includes('503 (Service Unavailable)'));
    if (expectedError !== -1) errors.splice(expectedError, 1);
    assert.equal(await nameInput.inputValue(), "Simulate failure");
    await nameInput.fill("2026 follow-ups");
    await nameInput.press("Enter");
    await renameDialog.waitFor({ state: "hidden" });
    await drawer.getByRole("button", { name: "Rename conversation: 2026 follow-ups" }).waitFor();
    assert.equal(history[0].title, "2026 follow-ups", "rename saved at server boundary");
    await drawer.getByRole("button", { name: "Rename conversation: 2026 follow-ups" }).click();
    await nameInput.fill("Cancelled name");
    await nameInput.press("Escape");
    await renameDialog.waitFor({ state: "hidden" });
    assert.equal(history[0].title, "2026 follow-ups", "cancel leaves saved name intact");
    await drawer.getByRole("button", { name: "Delete conversation: Top 20 students in CSE by CGPA" }).click();
    const confirm = page.getByRole("alertdialog");
    await confirm.getByRole("heading", { name: "Delete this conversation?" }).waitFor();
    assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Cancel", "Cancel is focused first");
    await shot("4b-delete-confirm");
    await confirm.getByRole("button", { name: "Delete" }).click();
    await confirm.waitFor({ state: "hidden" });
    assert.equal(await drawer.getByText("Top 20 students in CSE by CGPA").count(), 0, "row removed");
    await page.keyboard.press("Escape");
    await drawer.waitFor({ state: "hidden" });

    // 5. Voice: real level bars from the fake microphone, live transcript, Esc.
    await page.getByRole("button", { name: "New conversation" }).first().click();
    await page.getByRole("button", { name: /Voice input/ }).click();
    await page.locator(".fr-recorder").waitFor();
    await page.getByText("Live transcription").waitFor();
    await page.waitForTimeout(2600);
    const scales = await page.$$eval(".fr-bars span", (s) => s.map((el) => el.style.transform));
    const moving = new Set(scales).size;
    assert.ok(moving > 3, "level bars should follow the real input signal, got " + moving + " distinct heights: " + scales.slice(0, 6).join(","));
    assert.equal(await page.locator(".fr-steps .is-current").innerText(), "2. TRANSCRIBING →");
    await shot("5a-voice-listening");
    await page.getByRole("button", { name: "Stop recording" }).click();
    await page.locator(".fr-composer textarea").waitFor();
    assert.match(await page.locator(".fr-composer textarea").inputValue(), /^Show me computer science/);
    await page.getByText("Check the transcript, edit anything misheard, then send.").waitFor();
    // Nothing is running while the officer reviews, so no step is current.
    assert.equal(await page.locator(".fr-steps .is-current").count(), 0, "no current step while reviewing");
    assert.equal(await page.locator(".fr-steps .is-done").count(), 2);
    await shot("5b-voice-review");
    // Esc cancels a recording and discards the transcript.
    await page.getByRole("button", { name: /Voice input/ }).click();
    await page.locator(".fr-recorder").waitFor();
    await page.keyboard.press("Escape");
    await page.locator(".fr-composer textarea").waitFor();
    assert.equal(await page.locator(".fr-composer textarea").inputValue(), "");

    // 6. Sidebar: drag, persistence, keyboard, reset, then the icon rail.
    await page.goto(origin + "/placement/assistants/friday");
    await page.getByRole("heading", { name: "What would you like to know?" }).waitFor();
    const sidebarWidth = () =>
      page.locator(".erp-sidebar").evaluate((el) => Math.round(el.getBoundingClientRect().width));
    const settle = () => page.waitForTimeout(260);
    assert.equal(await sidebarWidth(), 246);
    const handle = page.getByRole("separator", { name: "Resize sidebar" });
    const hb = await handle.boundingBox();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + 300);
    await page.mouse.down();
    await page.mouse.move(hb.x + hb.width / 2 + 90, hb.y + 300, { steps: 6 });
    await page.mouse.up();
    await settle();
    assert.equal(await sidebarWidth(), 336, "dragging widens the sidebar");
    f = await fits();
    assert.ok(f.page <= 0 && f.main <= 0, "still fits with a wide sidebar: " + JSON.stringify(f));
    await shot("6a-sidebar-resized");
    await page.reload();
    await page.getByRole("heading", { name: "What would you like to know?" }).waitFor();
    // The stored width is applied after mount and then animates, so wait for
    // it rather than for a fixed time.
    await page
      .waitForFunction(() => Math.round(document.querySelector(".erp-sidebar").getBoundingClientRect().width) === 336, null, { timeout: 3000 })
      .catch(() => {});
    assert.equal(await sidebarWidth(), 336, "width survives a reload");
    await handle.focus();
    await page.keyboard.press("Home");
    await settle();
    assert.equal(await sidebarWidth(), 200, "Home sets the minimum");
    await page.keyboard.press("ArrowRight");
    await settle();
    assert.equal(await sidebarWidth(), 216, "arrow keys step by 16px");
    await page.keyboard.press("End");
    await settle();
    assert.equal(await sidebarWidth(), 380, "End sets the maximum");
    await handle.dblclick();
    await settle();
    assert.equal(await sidebarWidth(), 246, "double-click resets");

    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await settle();
    assert.equal(await sidebarWidth(), 76, "collapsed rail");
    // Every VISIBLE navigation link keeps its icon in the collapsed rail, and each group
    // is an icon button. Links inside a closed group are hidden until it is expanded.
    assert.equal(
      await page.locator("#placement-nav a:visible svg:visible").count(),
      await page.locator("#placement-nav a:visible").count(),
      "icons remain when collapsed",
    );
    assert.equal(
      await page.locator("#placement-nav .po-nav-toggle:visible > svg:not(.po-nav-chevron):visible").count(),
      await page.locator("#placement-nav .po-nav-toggle:visible").count(),
      "group buttons keep their icons when collapsed",
    );
    // A group opens in the collapsed rail, and its links stay reachable with icons.
    const closed = page.locator("#placement-nav .po-nav-toggle[aria-expanded='false']").first();
    const hiddenBefore = await page.locator("#placement-nav a:visible").count();
    await closed.click();
    const opened = await page.locator("#placement-nav a:visible").count();
    assert.ok(opened > hiddenBefore, "expanding a group in the collapsed rail reveals its links");
    assert.equal(await page.locator("#placement-nav a:visible svg:visible").count(), opened, "revealed links keep icons");
    await closed.click();
    assert.equal(await page.getByRole("link", { name: "F.R.I.D.A.Y." }).count(), 1, "links keep their names");
    assert.equal(await page.locator('#placement-nav a[href="/placement/overview"]').getAttribute("title"), "Placement overview", "tooltip");
    assert.equal(await page.getByRole("separator", { name: "Resize sidebar" }).count(), 0, "no resize when collapsed");
    await shot("6b-sidebar-collapsed");
    await page.getByRole("button", { name: "Expand sidebar" }).click();
    await settle();

    // 7. A shorter laptop screen still fits on arrival.
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto(origin + "/placement/assistants/friday");
    await page.getByRole("heading", { name: "What would you like to know?" }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    f = await fits();
    assert.ok(f.page <= 0 && f.main <= 0, "welcome must fit at 1366x768: " + JSON.stringify(f));
    await shot("7-welcome-1366x768");

    // 7b. Large desktop monitors (24 and 27 inch): the whole interface scales
    // up with the display instead of staying at laptop size.
    const rootPx = () => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    assert.equal(await rootPx(), 16, "default size on a laptop screen");
    for (const [w, h, scale] of [[1920, 1080, 1.0833], [2560, 1440, 1.25]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(origin + "/placement/assistants/friday");
      await page.getByRole("heading", { name: "What would you like to know?" }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      await noOverflow("welcome " + w);
      assert.ok(Math.abs((await rootPx()) / 16 - scale) < 0.01, `scale at ${w}x${h}: ${await rootPx()}px`);
      const sized = await page.evaluate(() => ({
        column: document.querySelector(".fr-composer").getBoundingClientRect().width,
        sidebar: document.querySelector(".erp-sidebar").getBoundingClientRect().width,
        heading: parseFloat(getComputedStyle(document.querySelector(".fr-welcome h2")).fontSize),
        icon: document.querySelector(".fr-starter svg").getBoundingClientRect().width,
      }));
      assert.ok(Math.abs(sized.column - 768 * scale) <= 2, "column scales: " + JSON.stringify(sized));
      assert.ok(Math.abs(sized.sidebar - 246 * scale) <= 2, "sidebar scales: " + JSON.stringify(sized));
      assert.ok(sized.icon > 18 * scale - 1 && sized.icon < 18 * scale + 1, "icons scale with text: " + JSON.stringify(sized));
      f = await fits();
      assert.ok(f.page <= 0 && f.main <= 0, `welcome must fit at ${w}x${h}: ` + JSON.stringify(f));
      await shot(`7b-welcome-${w}x${h}`);
      await page.locator(".fr-starter").first().click();
      await page.getByRole("button", { name: "Copy text" }).waitFor({ timeout: 15000 });
      await noOverflow("conversation " + w);
      await shot(`7c-conversation-${w}x${h}`);
    }

    // 8. Mobile.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + "/placement/assistants/friday");
    await page.getByRole("heading", { name: "What would you like to know?" }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    await noOverflow("mobile welcome");
    await shot("8a-welcome-mobile");
    await page.locator(".fr-starter").nth(1).click();
    await page.getByRole("button", { name: "Copy text" }).waitFor({ timeout: 15000 });
    await noOverflow("mobile conversation");
    const prompt = await page.locator(".fr-prompt").boundingBox();
    assert.ok(prompt && prompt.height < 844 * 0.34, "compact prompt leaves room for the answer, got " + prompt?.height);
    await page.locator(".fr-turn--assistant").evaluate((el) => el.scrollIntoView({ block: "start" }));
    await page.waitForTimeout(100);
    await shot("8b-conversation-mobile");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(100);
    await shot("8c-conversation-end-mobile");

    // 9. Profile action bound to tool output, desktop and mobile, both themes.
    const askProfile = async () => {
      await page.getByRole("textbox", { name: "Ask F.R.I.D.A.Y." }).fill("Show the skills profile for 1DS23CS014");
      await page.getByRole("button", { name: "Send", exact: true }).click();
      // No button while the answer is still streaming.
      await page.getByText("Opening student profile").first().waitFor();
      assert.equal(await page.locator(".fr-profile-link").count(), 0, "no profile button before the answer completes");
      await page.getByRole("button", { name: "Copy text" }).waitFor({ timeout: 15000 });
    };
    const checkProfileLinks = async (where) => {
      const links = page.locator(".fr-profile-link");
      assert.equal(await links.count(), 2, "one button per distinct valid profile on " + where);
      assert.deepEqual(
        await links.evaluateAll((els) => els.map((el) => el.getAttribute("href"))),
        [`/placement/students/${PROFILE_A}`, `/placement/students/${PROFILE_B}`],
        "hrefs come from the profile_link events",
      );
      await page.getByRole("link", { name: "View student profile: Aditi Rao, 1DS23CS014" }).waitFor();
      assert.equal(await page.locator(".fr-profile-links").getByText("Elsewhere").count(), 0, "external URL rejected");
      assert.equal(await page.locator(".fr-profile-links").getByText("Bad").count(), 0, "non-UUID rejected");
      const shape = await links.first().evaluate((el) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return { radius: parseFloat(cs.borderTopLeftRadius), height: r.height, right: r.right, icon: !!el.querySelector("svg"), bg: cs.backgroundColor, color: cs.color };
      });
      assert.ok(shape.radius <= 6, "not pill shaped: " + JSON.stringify(shape));
      assert.ok(shape.icon, "button carries an icon");
      assert.ok(shape.right <= (await page.evaluate(() => innerWidth)), "button fits the viewport");
      assert.notEqual(shape.bg, shape.color, "readable button");
      const clipped = await page
        .locator(".fr-profile-link-name")
        .evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent));
      assert.deepEqual(clipped, [], "student names are not cut off on " + where);
      const visible = await page.locator(".fr-log").innerText();
      assert.equal(visible.includes("\u2014"), false, "no em dash in visible text");
      await noOverflow("profile " + where);
      return shape;
    };
    const showProfileTurn = () =>
      page.locator(".fr-profile-links").last().evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(origin + "/placement/assistants/friday");
    await page.getByRole("heading", { name: "What would you like to know?" }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    await askProfile();
    const lightShape = await checkProfileLinks("desktop light");
    await showProfileTurn();
    await page.waitForTimeout(100);
    await shot("9a-profile-link-desktop");
    await page.getByRole("button", { name: "Use dark theme" }).click();
    await page.waitForTimeout(150);
    const darkShape = await checkProfileLinks("desktop dark");
    assert.notEqual(darkShape.bg, lightShape.bg, "dark theme restyles the button");
    await shot("9b-profile-link-desktop-dark");
    // A plain question in the same conversation shows no profile buttons.
    await page.getByRole("textbox", { name: "Ask F.R.I.D.A.Y." }).fill("Break this down by branch");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll(".fr-turn--assistant .fr-turn-actions").length > 1, null, { timeout: 15000 });
    assert.equal(await page.locator(".fr-profile-links").count(), 1, "buttons belong only to the turn that resolved them");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + "/placement/assistants/friday");
    await page.getByRole("heading", { name: "What would you like to know?" }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    await askProfile();
    await checkProfileLinks("mobile " + ((await page.locator(".po-dark").count()) ? "dark" : "light"));
    await showProfileTurn();
    await page.waitForTimeout(100);
    const mobileDark = (await page.locator(".po-dark").count()) > 0;
    await shot(mobileDark ? "9c-profile-link-mobile-dark" : "9c-profile-link-mobile");
    await page.getByRole("button", { name: mobileDark ? "Use light theme" : "Use dark theme" }).click();
    await page.waitForTimeout(150);
    await checkProfileLinks("mobile other theme");
    // The theme toggle sits at the top of the page; wait for its re-render
    // before scrolling back to the profile buttons.
    await page.waitForTimeout(300);
    await showProfileTurn();
    await page.waitForTimeout(200);
    await shot(mobileDark ? "9d-profile-link-mobile" : "9d-profile-link-mobile-dark");
    if (!mobileDark) await page.getByRole("button", { name: "Use light theme" }).click();

    assert.deepEqual(errors, [], "browser errors: " + errors.join(" | "));
    console.log("F.R.I.D.A.Y. UI verified. Screenshots:\n" + shots.map((s) => "  " + path.relative(root, s)).join("\n"));
  } catch (e) {
    console.error("FAILED:", e.message);
    process.exitCode = 1;
  } finally {
    await browser?.close();
    server?.close();
  }
})();
