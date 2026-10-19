const test = require("node:test"),
  assert = require("node:assert/strict");
const { build } = require("esbuild");
async function load(entry) {
  const mocks = {
    "server-only": "",
    react: "exports.cache=fn=>fn;",
    "react/jsx-runtime":
      "exports.jsx=exports.jsxs=(type,props)=>({type,props});",
    "next/link": "exports.default=function Link(){};",
    "next/navigation": `exports.redirect=path=>{throw Object.assign(new Error('redirect'),{destination:path})};`,
    "@/shared/http/backend": `exports.backendApi=async path=>{if(path!=='/session')throw Error('Unexpected resource');return {data:global.__workspaceAccess}};`,
    "@/shared/auth/supabase": `exports.supabaseServer=async()=>({auth:{signInWithPassword:async input=>{global.__credentials=input;return {error:null}},signOut:async()=>{},signUp:async input=>{global.__signup=input;return {data:{session:global.__signupSession||null},error:null}},resend:async input=>{global.__resend=input;return {error:null}}}});`,
  };
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "cjs",
    jsx: "automatic",
    loader: { ".css": "empty" },
    write: false,
    plugins: [
      {
        name: "auth-fixtures",
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
  const module = { exports: {} };
  new Function("require", "module", "exports", result.outputFiles[0].text)(
    require,
    module,
    module.exports,
  );
  return module.exports;
}
test("database roles choose the workspace and deny entry into the other role workspace", async () => {
  const { requireWorkspace } = await load("src/shared/auth/workspace.ts");
  global.__workspaceAccess = { role: "student", home: "/student" };
  assert.equal((await requireWorkspace("student")).role, "student");
  await assert.rejects(
    () => requireWorkspace("placement_officer"),
    (e) => e.destination === "/student",
  );
  global.__workspaceAccess = { role: "placement_officer", home: "/placement" };
  assert.equal(
    (await requireWorkspace("placement_officer")).role,
    "placement_officer",
  );
  await assert.rejects(
    () => requireWorkspace("student"),
    (e) => e.destination === "/placement",
  );
  global.__workspaceAccess = { role: null, home: "/access" };
  await assert.rejects(
    () => requireWorkspace("student"),
    (e) => e.destination === "/access",
  );
  global.__workspaceAccess = { role: null, home: "/onboarding" };
  await assert.rejects(
    () => requireWorkspace("student"),
    (e) => e.destination === "/onboarding",
  );
});
test("selected portals enforce the database role before opening their workspace", async () => {
  const { default: page } = await load("src/app/workspace/page.tsx");
  for (const [role, home, portal] of [
    ["student", "/student", "student"],
    ["placement_officer", "/placement", "placement-officer"],
    [null, "/onboarding", "student"],
  ]) {
    global.__workspaceAccess = { role, home };
    await assert.rejects(
      () => page({ searchParams: Promise.resolve({ portal }) }),
      (e) => e.destination === home,
    );
  }
  global.__workspaceAccess = { role: "student", home: "/student" };
  const wrongRole = await page({
    searchParams: Promise.resolve({ portal: "placement-officer" }),
  });
  assert.match(
    JSON.stringify(wrongRole),
    /does not have placement officer access/,
  );
  global.__workspaceAccess = { role: "placement_officer", home: "/placement" };
  assert.match(
    JSON.stringify(
      await page({ searchParams: Promise.resolve({ portal: "student" }) }),
    ),
    /does not have student access/,
  );
  global.__workspaceAccess = { role: null, home: "/onboarding" };
  assert.match(
    JSON.stringify(
      await page({
        searchParams: Promise.resolve({ portal: "placement-officer" }),
      }),
    ),
    /Set up student account/,
  );
});
test("account creation and confirmation use a fixed site origin without granting a role", async () => {
  const previous = process.env.DSU_WEB_URL;
  process.env.DSU_WEB_URL = "https://campus.example.invalid";
  try {
    const { signUp, resendConfirmation } = await load(
      "src/app/sign-up/actions.ts",
    );
    const form = new FormData();
    form.set("name", "Example Student");
    form.set("email", "student@example.invalid");
    form.set("password", "a-long-test-password");
    form.set("confirm", "a-long-test-password");
    form.set("role", "placement_officer");
    global.__signupSession = null;
    const result = await signUp({ error: "", success: "" }, form);
    assert.equal(result.error, "");
    assert.match(result.success, /Check your email/);
    assert.equal(
      global.__signup.options.emailRedirectTo,
      "https://campus.example.invalid/auth/confirm",
    );
    assert.deepEqual(global.__signup.options.data, {
      full_name: "Example Student",
      requested_role: "student",
    });
    global.__signupSession = {};
    await assert.rejects(
      () => signUp({ error: "", success: "" }, form),
      (e) => e.destination === "/onboarding",
    );
    const resend = new FormData();
    resend.set("email", "student@example.invalid");
    assert.equal(
      (await resendConfirmation({ error: "", success: "" }, resend)).error,
      "",
    );
    assert.equal(
      global.__resend.options.emailRedirectTo,
      "https://campus.example.invalid/auth/confirm",
    );
    form.set("confirm", "wrong");
    assert.match(
      (await signUp({ error: "", success: "" }, form)).error,
      /do not match/,
    );
  } finally {
    if (previous === undefined) delete process.env.DSU_WEB_URL;
    else process.env.DSU_WEB_URL = previous;
    delete global.__signupSession;
  }
});
test("portal form fields choose a role-checking destination, never an authorized workspace", async () => {
  const { signIn } = await load("src/app/login/actions.ts");
  for (const portal of [
    "student",
    "placement-officer",
    "admin",
    "https://example.invalid",
  ]) {
    const form = new FormData();
    form.set("email", "fixture@example.invalid");
    form.set("password", "fixture-password");
    form.set("portal", portal);
    const expected = ["student", "placement-officer"].includes(portal)
      ? "/workspace?portal=" + portal
      : "/workspace";
    await assert.rejects(
      () => signIn({ error: "" }, form),
      (e) => e.destination === expected,
    );
    assert.deepEqual(Object.keys(global.__credentials).sort(), [
      "email",
      "password",
    ]);
  }
});
