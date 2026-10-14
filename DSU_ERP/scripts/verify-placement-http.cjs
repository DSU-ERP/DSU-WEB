// Run against a local production server. Does not log in or mutate campus records.
const assert = require("node:assert/strict");
const { chromium } = require("@playwright/test");
(async () => {
  const origin = process.env.PLACEMENT_TEST_ORIGIN || "http://127.0.0.1:3108";
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
  for (const path of ["/placement/overview", "/placement/students", "/placement/export/students"]) {
    const response = await fetch(origin + path, { redirect: "manual" });
    assert.ok([307, 308].includes(response.status));
    assert.ok(response.headers.get("location").includes("/login?portal=placement-officer"));
  }
  assert.equal((await fetch(origin + "/placement/assistant-api")).status, 401);
  const rejected = await fetch(origin + "/placement/assistant-api", {
    method: "POST", headers: { Origin: "https://example.invalid", "Content-Type": "application/json" }, body: "{}",
  });
  assert.equal(rejected.status, 403);
  const friday = await fetch(origin + "/placement/assistants/friday", { redirect: "manual" });
  assert.ok(friday.headers.get("permissions-policy").includes("microphone=(self)"));
  const browser = await chromium.launch({ headless: true, ...(process.platform === "win32" ? { channel: "msedge" } : {}) });
  try {
    const page = await browser.newPage();
    await page.goto(origin + "/login?portal=placement-officer");
    await page.getByText("PLACEMENT OFFICER PORTAL", { exact: true }).waitFor();
    assert.equal(await page.locator('input[name="portal"][value="placement-officer"]').count(), 1);
    assert.equal(await page.locator('input[type="password"]').count(), 1);
  } finally { await browser.close(); }
  console.log(JSON.stringify({passed:true,checks:["protected pages and exports","assistant authentication","cross-origin rejection","voice header","officer login form"]}));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
