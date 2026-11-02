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
    "@/shared/auth/supabase": `exports.supabaseServer=async()=>({auth:{signInWithPassword:async input=>{global.__credentials=input;return {error:null}},signOut:async()=>{},signUp:async input=>{global.__signup=input;return {data:{session:global.__signupSession||null},error:null}},resend:async input=>{global.__resend=input;return {error:null}},resetPasswordForEmail:async (email,options)=>{global.__reset={email,options};return {error:global.__resetError||null}},updateUser:async input=>{global.__updated=input;return {error:global.__updateError||null}}}});`,
    "next/headers": `exports.cookies=async()=>({set:(name,value,options)=>{(global.__cookies=global.__cookies||{})[name]={value,options}},delete:name=>{(global.__cookies=global.__cookies||{})[name]=null},get:name=>global.__cookies&&global.__cookies[name]?{value:global.__cookies[name].value}:undefined});`,
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
test("forgot password sends a reset link to a fixed origin and never reveals whether the account exists", async () => {
  const previous = process.env.DSU_WEB_URL;
  process.env.DSU_WEB_URL = "https://campus.example.invalid";
  try {
    const { requestPasswordReset } = await load("src/app/forgot-password/actions.ts");
    const form = new FormData();
    form.set("email", "not-an-email");
    assert.match((await requestPasswordReset({ error: "", success: "" }, form)).error, /valid email/);
    form.set("email", "  Student@Example.invalid ");
    global.__cookies = {};
    const sent = await requestPasswordReset({ error: "", success: "" }, form);
    assert.equal(sent.error, "");
    assert.match(sent.success, /If an account uses that email/);
    assert.deepEqual(global.__reset, {
      email: "Student@Example.invalid",
      options: { redirectTo: "https://campus.example.invalid/auth/confirm" },
    });
    assert.equal(global.__cookies["dsu-password-reset"].value, "1", "marks this browser as resetting");
    assert.equal(global.__cookies["dsu-password-reset"].options.httpOnly, true);
    // Unknown accounts and provider errors look the same as success.
    global.__resetError = { status: 400, message: "User not found" };
    assert.match((await requestPasswordReset({ error: "", success: "" }, form)).success, /If an account uses that email/);
    global.__resetError = { status: 429, message: "rate limited" };
    assert.match((await requestPasswordReset({ error: "", success: "" }, form)).error, /wait a minute/);
  } finally {
    if (previous === undefined) delete process.env.DSU_WEB_URL;
    else process.env.DSU_WEB_URL = previous;
    delete global.__resetError;
  }
});
test("a new password must be long enough and match, then opens the workspace", async () => {
  const { updatePassword } = await load("src/app/reset-password/actions.ts");
  const form = new FormData();
  form.set("password", "short");
  form.set("confirm", "short");
  assert.match((await updatePassword({ error: "" }, form)).error, /at least 12 characters/);
  form.set("password", "a-long-new-password");
  form.set("confirm", "different-password");
  assert.match((await updatePassword({ error: "" }, form)).error, /do not match/);
  form.set("confirm", "a-long-new-password");
  global.__updateError = { message: "Auth session missing!" };
  assert.match((await updatePassword({ error: "" }, form)).error, /expired/);
  delete global.__updateError;
  global.__cookies = { "dsu-password-reset": { value: "1" } };
  await assert.rejects(() => updatePassword({ error: "" }, form), (e) => e.destination === "/workspace");
  assert.deepEqual(global.__updated, { password: "a-long-new-password" });
  assert.equal(global.__cookies["dsu-password-reset"], null, "the reset marker is cleared");
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
