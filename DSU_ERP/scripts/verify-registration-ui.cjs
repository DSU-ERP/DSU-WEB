// Real React components, synthetic records and mocked server-action responses.
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const { build } = require("esbuild"),
  { chromium } = require("@playwright/test");
const dir = path.resolve(".qa/registration-ui");
fs.mkdirSync(dir, { recursive: true });
const official = {
  id: "fixture",
  full_name: "Example Student",
  enrollment_no: "DSU-QA-001",
  department_name: "Computer Science",
  course_name: "B.Tech",
  current_semester: "6",
  source_batch: "2028",
  cgpa: "8.5",
  phone: "0000000000",
  city: "Bengaluru",
};
const entry = `import React from 'react';import {createRoot} from 'react-dom/client';import {RegistrationWizard} from '@/features/student/components/RegistrationWizard';
const matched=location.pathname==='/matched';const initial={state:matched?'matched':'unmatched',email:'student@example.invalid',name:'Example Student',official:matched?${JSON.stringify(official)}:undefined,profile:null,draft:JSON.parse(sessionStorage.getItem(location.pathname)||'null')};
createRoot(document.getElementById('root')).render(<main className='st-app st-registration'><header><a className='st-brand' href='/'>DSU <small>/ YOUR WORKSPACE</small></a></header><RegistrationWizard initial={initial}/></main>);`;
const mocks = {
  "next/navigation": `export const useRouter=()=>({replace:home=>{window.__destination=home},refresh:()=>{}});`,
  "@/app/onboarding/actions": `export async function saveRegistration(input){window.__saved=input;if(window.__fail){window.__fail=false;return {data:null,error:'Your onboarding changed in another tab. Reload before saving.'}}const status=input.complete?(location.pathname==='/matched'?'completed':'pending'):'draft';sessionStorage.setItem(location.pathname,JSON.stringify({...input,revision:input.revision+1,status}));return {data:{revision:input.revision+1,status,home:status==='completed'?'/student/dashboard':null},error:''};}`,
};
(async () => {
  let browser, server;
  try {
    await build({
      stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
      bundle: true,
      outfile: path.join(dir, "bundle.js"),
      jsx: "automatic",
      platform: "browser",
      define: { "process.env.NODE_ENV": '"development"' },
      plugins: [
        {
          name: "registration-fixtures",
          setup(b) {
            b.onResolve({ filter: /.*/ }, (args) =>
              Object.hasOwn(mocks, args.path)
                ? { path: args.path, namespace: "fixture" }
                : undefined,
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
              contents: mocks[args.path],
              loader: "js",
            }));
          },
        },
      ],
    });
    const css =
      "*{box-sizing:border-box}body,h1,h2,h3,p,dl,dd{margin:0}body{font-family:Arial}a{color:inherit;text-decoration:none}button,input,textarea,select{font:inherit}button{cursor:pointer}:root{--mono:monospace}" +
      fs.readFileSync("src/app/student/student.css", "utf8");
    server = http.createServer((req, res) => {
      if (req.url === "/bundle.js") {
        res.setHeader("Content-Type", "text/javascript");
        res.end(fs.readFileSync(path.join(dir, "bundle.js")));
        return;
      }
      res.setHeader("Content-Type", "text/html");
      res.end(
        '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>' +
          css +
          '</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
      );
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const origin = "http://127.0.0.1:" + server.address().port;
    browser = await chromium.launch({
      headless: true,
      ...(process.platform === "win32" ? { channel: "msedge" } : {}),
    });
    const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const next = () =>
      page.getByRole("button", { name: "Save & continue →" }).click();
    const overflow = async () =>
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        "Horizontal overflow",
      );
    await page.goto(origin + "/matched");
    await page
      .getByRole("heading", { name: "Your profile", exact: true })
      .waitFor();
    assert.equal(
      await page.getByLabel("Full name · university record").inputValue(),
      "Example Student",
    );
    assert.equal(
      await page
        .getByLabel("Full name · university record")
        .getAttribute("readonly"),
      "",
    );
    assert.equal(
      await page.getByLabel("Phone number").inputValue(),
      "0000000000",
    );
    await overflow();
    await page.screenshot({
      path: path.join(dir, "onboarding-desktop.png"),
      fullPage: true,
    });
    await page.getByLabel("City", { exact: true }).fill("Mysuru");
    await next();
    assert.equal(
      await page.getByLabel("Official USN / enrollment number").inputValue(),
      "DSU-QA-001",
    );
    assert.equal(await page.getByLabel("Official CGPA").inputValue(), "8.5");
    assert.equal(
      await page.getByLabel("Official CGPA").getAttribute("readonly"),
      "",
    );
    await next();
    await page.reload();
    await page
      .getByRole("heading", { name: "Interests & skills", exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await page.getByRole("status").waitFor();
    await next();
    await page
      .getByRole("alert")
      .filter({ hasText: "Choose at least one interest" })
      .waitFor();
    await page
      .getByRole("button", { name: "Software engineering", exact: true })
      .click();
    await page.getByLabel("Skills and tools").fill("TypeScript, communication");
    await next();
    await page
      .getByLabel("Roles you want to explore")
      .fill("Software engineer");
    await page
      .getByLabel("GitHub profile", { exact: true })
      .fill("https://github.com/example");
    await next();
    await page
      .getByRole("heading", { name: "Review & finish", exact: true })
      .waitFor();
    await page.getByLabel(/I confirm these details/).check();
    await page.getByRole("button", { name: "Finish & open workspace" }).click();
    await page.waitForFunction(
      () => window.__destination === "/student/dashboard",
    );
    const saved = await page.evaluate(() => window.__saved);
    assert.equal(saved.details.city, "Mysuru");
    assert.equal(saved.details.github, "https://github.com/example");
    assert.deepEqual(saved.details.interests, ["Software engineering"]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + "/manual");
    await page
      .getByRole("heading", { name: "Your profile", exact: true })
      .waitFor();
    await overflow();
    await page.screenshot({
      path: path.join(dir, "onboarding-mobile.png"),
      fullPage: true,
    });
    await next();
    await page
      .getByLabel("USN / enrollment number", { exact: true })
      .fill("SELF-REPORTED");
    await page.getByLabel("Department", { exact: true }).fill("Business");
    await page.getByLabel("Program", { exact: true }).fill("MBA");
    await next();
    await page.getByRole("button", { name: "Finance", exact: true }).click();
    await page.evaluate(() => {
      window.__fail = true;
    });
    await next();
    await page.getByRole("alert").filter({ hasText: "another tab" }).waitFor();
    await next();
    await page
      .getByLabel("Roles you want to explore")
      .fill("Financial analyst");
    await next();
    await overflow();
    await page.getByLabel(/I confirm these details/).check();
    await page.getByRole("button", { name: "Submit for verification" }).click();
    await page
      .getByRole("heading", { name: "Your profile is saved for verification." })
      .waitFor();
    assert.equal(await page.evaluate(() => window.__destination), undefined);
    await page.reload();
    await page
      .getByRole("heading", { name: "Your profile is saved for verification." })
      .waitFor();
    await page.getByRole("button", { name: "Review my details" }).click();
    await page
      .getByRole("heading", { name: "Review & finish", exact: true })
      .waitFor();
    assert.deepEqual(errors, []);
    if (process.argv.includes("--live")) {
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto("http://127.0.0.1:3000/");
        const choices = page.getByRole("navigation", {
          name: "Campus sign in",
        });
        await choices.waitFor();
        for (const label of ["Student sign in", "Placement Officer sign in"]) {
          const box = await choices
            .getByRole("link", { name: label, exact: true })
            .boundingBox();
          assert.ok(
            box && box.y >= 0 && box.y + box.height < 900,
            "Sign-in choice must be visible without scrolling",
          );
        }
        await overflow();
        await page.screenshot({
          path: path.join(dir, "landing-" + width + ".png"),
          fullPage: false,
        });
        await choices
          .getByRole("link", { name: "Placement Officer sign in", exact: true })
          .click();
        await page
          .getByText("PLACEMENT OFFICER SIGN IN", { exact: true })
          .waitFor();
        assert.equal(
          await page
            .getByRole("link", {
              name: "Create a student account ↗",
              exact: true,
            })
            .count(),
          0,
        );
        await page
          .getByRole("navigation", { name: "Choose sign-in portal" })
          .getByRole("link", { name: "Student", exact: true })
          .click();
        await page
          .getByRole("link", {
            name: "Create a student account ↗",
            exact: true,
          })
          .waitFor();
      }
    }
    console.log(
      JSON.stringify({
        passed: true,
        checks: [
          "five steps",
          "verified autofill",
          "readonly official records",
          "draft resume",
          "interest validation",
          "save retry",
          "completion",
          "pending verification",
          "desktop/mobile layout",
          ...(process.argv.includes("--live")
            ? [
                "live landing choices visible immediately",
                "role-specific login",
              ]
            : []),
        ],
        data: "Synthetic only; no accounts created or shared database writes",
      }),
    );
  } catch (error) {
    console.error(error.stack);
    const page = browser?.contexts()[0]?.pages()[0];
    if (page)
      await page.screenshot({
        path: path.join(dir, "failure.png"),
        fullPage: true,
      });
    process.exitCode = 1;
  } finally {
    await browser?.close();
    if (server) await new Promise((resolve) => server.close(resolve));
  }
})();
