const test = require('node:test'), assert = require('node:assert/strict');
const { build } = require('esbuild');
async function load(entry, mocks) {
  const result = await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', write: false, loader: { '.css': 'empty' }, external: ['react', 'react/*'], plugins: [{ name: 'performance-boundaries', setup(b) {
    b.onResolve({ filter: /.*/ }, a => Object.hasOwn(mocks, a.path) ? { path: a.path, namespace: 'fixture' } : undefined);
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, a => ({ contents: mocks[a.path], loader: 'js' }));
  } }] });
  const module = { exports: {} }; new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports); return module.exports;
}
const serverMock = `exports.NextResponse={next:()=>({headers:new Headers(),cookies:{set:(...v)=>global.__studentPerf.cookies.push(v)}})};`;
const request = path => ({ method: 'GET', url: 'http://localhost'+path, nextUrl: new URL('http://localhost'+path), cookies: { getAll: () => [], set() {} }, headers: new Headers({host:'localhost'}) });

test('student API avoids duplicate proxy authentication while page refresh and cookies remain intact', async () => {
  const previous = { url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY };
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://synthetic.invalid';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='synthetic';
  global.__studentPerf={auth:0,clients:0,cookies:[]};
  try {
    const { proxy } = await load('src/proxy.ts', { 'next/server': serverMock, '@supabase/ssr': `exports.createServerClient=(_u,_k,options)=>{global.__studentPerf.clients++;return {auth:{getUser:async()=>{global.__studentPerf.auth++;options.cookies.setAll([{name:'refreshed',value:'synthetic',options:{httpOnly:true}}]);return {data:{user:{id:'student'}}}}}}};` });
    for (const path of ['/student/api/conversations', '/student/api/sessions/id/answer', '/student/api/netcheck']) {
      const result=await proxy(request(path));assert.equal(result.headers.get('Cache-Control'),'private, no-store');
    }
    assert.equal(global.__studentPerf.clients,0);assert.equal(global.__studentPerf.auth,0);
    for (const path of ['/student/dashboard','/student/interview','/placement','/login']) await proxy(request(path));
    assert.equal(global.__studentPerf.auth,4,'page refresh remains authoritative');assert.equal(global.__studentPerf.cookies.length,4,'refreshed cookies still reach the response');
  } finally {
    for (const [name,value] of [['NEXT_PUBLIC_SUPABASE_URL',previous.url],['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',previous.key]]) if(value===undefined)delete process.env[name];else process.env[name]=value;
    delete global.__studentPerf;
  }
});

test('student API handler still verifies the user once, denies missing sessions and forwards only the verified token', async () => {
  const originalFetch=global.fetch;global.__studentPerf={auth:0,tokenReads:0,user:null,requests:[],urls:[]};
  try {
    global.fetch=async(url,options)=>{global.__studentPerf.requests.push(options.headers.Authorization);global.__studentPerf.urls.push(new URL(url).pathname);return Response.json({data:{ready:true}});};
    const { GET }=await load('src/app/student/api/[...path]/route.ts', {
      'server-only':'', 'react':'exports.cache=fn=>fn;', 'next/navigation':'exports.redirect=()=>{throw Error("NEXT_REDIRECT")};',
      '@/shared/config/env':'exports.backendOrigin=()=>new URL("http://synthetic-backend.invalid");',
      './supabase':`exports.supabaseServer=async()=>({auth:{getUser:async()=>{global.__studentPerf.auth++;return {data:{user:global.__studentPerf.user},error:null}},getSession:async()=>{global.__studentPerf.tokenReads++;return {data:{session:{access_token:'verified-token'}}}}}});`,
    });
    const run=()=>GET(request('/student/api/conversations'),{params:Promise.resolve({path:['conversations']})});
    assert.equal((await run()).status,401);assert.equal(global.__studentPerf.requests.length,0);
    global.__studentPerf.user={id:'student'};global.__studentPerf.auth=0;
    const result=await run();assert.equal(result.status,200);assert.deepEqual(await result.json(),{data:{ready:true}});
    assert.equal(global.__studentPerf.auth,1,'the onboarding check reuses the verified session');
    assert.deepEqual(global.__studentPerf.requests,['Bearer verified-token','Bearer verified-token']);
    assert.deepEqual(global.__studentPerf.urls.sort(),['/api/v1/session','/api/v1/student/conversations']);
  } finally { global.fetch=originalFetch;delete global.__studentPerf; }
});

test('student layout streams loading before authenticated profile work and withholds private children on denial', async () => {
  const React=require('react'),{renderToPipeableStream}=require('react-dom/server'),{Writable}=require('node:stream');
  const { default: Layout }=await load('src/app/student/layout.tsx', {
    'server-only':'',
    'next/headers':'exports.headers=async()=>new Headers();',
    'next/navigation':'exports.redirect=path=>{throw Object.assign(new Error("NEXT_REDIRECT"),{destination:path})};',
    '@/shared/auth/workspace':'exports.workspaceAccess=async()=>{throw new Error("no gate read without a student path")};',
    '@/features/student/lib/server':'exports.studentProfile=()=>global.__studentPerf.profile;',
    '@/features/student/components/StudentShell':`const React=require('react');exports.StudentShell=({name,children})=>React.createElement('main',null,name,children);`,
    '../login/actions':'exports.signOut=async()=>{};',
  });
  for (const denied of [false,true]) {
    let resolve;global.__studentPerf={profile:new Promise(r=>resolve=r)};
    let output='',ready;const shellReady=new Promise(r=>ready=r);let finish;const complete=new Promise(r=>finish=r);
    const sink=new Writable({write(chunk,_encoding,callback){output+=chunk.toString();callback();}});sink.on('finish',finish);
    const tree=await Layout({children:React.createElement('b',null,'Private coursework')});
    const stream=renderToPipeableStream(React.createElement('html',null,React.createElement('body',null,tree)), {onShellReady(){stream.pipe(sink);ready();},onError:()=>{}});
    await shellReady;await new Promise(r=>setImmediate(r));assert.match(output,/Loading your student workspace/);assert.doesNotMatch(output,/Private coursework/);
    if(denied){resolve(Promise.reject(Object.assign(new Error('not allowed'),{status:403})));await complete;assert.doesNotMatch(output,/Private coursework/);}
    else {resolve({details:{fullName:'Synthetic Student'},official:{enrollment_no:'QA'}});await complete;assert.match(output,/Synthetic Student/);assert.match(output,/Private coursework/);}
  }
  delete global.__studentPerf;
});

test('proxy tells the student layout the requested path and never keeps a browser supplied value', async () => {
  const previous = { url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY };
  delete process.env.NEXT_PUBLIC_SUPABASE_URL; delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  global.__studentPerf={auth:0,clients:0,cookies:[],forwarded:[]};
  try {
    const { proxy } = await load('src/proxy.ts', { 'next/server': `exports.NextResponse={next:(init)=>{global.__studentPerf.forwarded.push(init&&init.request&&new Headers(init.request.headers));return {headers:new Headers(),cookies:{set(){}}}}};`, '@supabase/ssr': 'exports.createServerClient=()=>{throw new Error("no auth without configuration")};' });
    const spoofed = path => { const r = request(path); r.headers.set('x-dsu-pathname','/student/onboarding'); return r; };
    for (const [path, expected] of [['/student/dashboard','/student/dashboard'],['/student','/student'],['/student/connections/github/callback','/student/connections/github/callback'],['/placement',null],['/login',null]]) {
      global.__studentPerf.forwarded=[];
      const result = await proxy(spoofed(path));
      assert.equal(result.headers.get('Cache-Control'),'private, no-store');
      assert.equal(global.__studentPerf.forwarded[0].get('x-dsu-pathname'), expected, path);
    }
  } finally {
    for (const [name,value] of [['NEXT_PUBLIC_SUPABASE_URL',previous.url],['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',previous.key]]) if(value===undefined)delete process.env[name];else process.env[name]=value;
    delete global.__studentPerf;
  }
});

test('student layout redirects gated pages before rendering any child content, without loops', async () => {
  const React=require('react'),{renderToString}=require('react-dom/server');
  const { default: Layout }=await load('src/app/student/layout.tsx', {
    'server-only':'',
    'next/headers':'exports.headers=async()=>new Headers(global.__gate.path?{"x-dsu-pathname":global.__gate.path}:{});',
    'next/navigation':'exports.redirect=path=>{throw Object.assign(new Error("NEXT_REDIRECT"),{destination:path})};',
    '@/shared/auth/workspace':'exports.workspaceAccess=async()=>{global.__gate.reads++;return global.__gate.access};',
    '@/features/student/lib/server':'exports.studentProfile=async()=>{global.__gate.rendered=true;return {details:{fullName:"Synthetic Student"},official:{enrollment_no:"QA"},skillsOnboardingRequired:global.__gate.access.onboardingRequired===true};};',
    '@/features/student/components/StudentShell':`const React=require('react');exports.StudentShell=({children})=>React.createElement('main',null,children);`,
    '../login/actions':'exports.signOut=async()=>{};',
  });
  const run = async (path, onboardingRequired) => {
    global.__gate={path,reads:0,rendered:false,access:{role:'student',home:'/student',onboardingRequired}};
    try {
      const tree = await Layout({children:React.createElement('b',null,'Private coursework')});
      return { tree, reads: global.__gate.reads };
    } catch (error) {
      return { redirect: error.destination, rendered: global.__gate.rendered, reads: global.__gate.reads };
    }
  };
  try {
    for (const path of ['/student/dashboard','/student/timetable','/student/interview/abc','/student/connections']) {
      const r = await run(path, true);
      assert.equal(r.redirect, '/student/onboarding', path);
      assert.equal(r.rendered, false, 'no profile or page work before the redirect: ' + path);
    }
    const onboarding = await run('/student/onboarding', true);
    assert.equal(onboarding.redirect, undefined, 'the onboarding page itself never loops');
    assert.ok(onboarding.tree);
    assert.equal((await run('/student/onboarding', false)).redirect, '/student/dashboard');
    assert.equal((await run('/student/dashboard', false)).redirect, undefined, 'the dashboard never loops');
    assert.equal((await run('/student/timetable', undefined)).redirect, undefined, 'older backends omit the flag');
    const root = await run('/student', true);
    assert.equal(root.redirect, undefined, 'the landing page decides with the registration state');
    const unknown = await run(null, true);
    assert.equal(unknown.redirect, undefined);
    assert.equal(unknown.reads, 0, 'no gate read without the proxy header');
    // An allowed page still renders through the authenticated layout.
    const allowed = await run('/student/onboarding', true);
    assert.match(renderToString(allowed.tree), /Loading your student workspace|Private coursework/);
  } finally { delete global.__gate; }
});

test('student landing page and GitHub callback use the same onboarding rule as the gate', async () => {
  const { default: StudentPage } = await load('src/app/student/page.tsx', {
    'server-only':'',
    'next/navigation':'exports.redirect=path=>{throw Object.assign(new Error("NEXT_REDIRECT"),{destination:path})};',
    '@/features/student/lib/server':'exports.studentProfile=async()=>global.__landing;',
  });
  const land = async (onboarded, skillsOnboardingRequired) => {
    global.__landing = { onboarded, skillsOnboardingRequired };
    try { await StudentPage(); } catch (error) { return error.destination; }
    return null;
  };
  try {
    assert.equal(await land(false, true), '/onboarding', 'registration comes first');
    assert.equal(await land(false, false), '/onboarding');
    assert.equal(await land(true, true), '/student/onboarding');
    assert.equal(await land(true, false), '/student/dashboard');
  } finally { delete global.__landing; }

  const { GET } = await load('src/app/student/connections/github/callback/route.ts', {
    'server-only':'',
    '@/shared/auth/workspace':'exports.workspaceAccess=async()=>global.__callback;',
    '@/shared/http/backend':'exports.backendApi=async()=>({data:{}});',
  });
  const back = async (access) => {
    global.__callback = access;
    const url = new URL('http://localhost/student/connections/github/callback?code=abc&state=' + 'a'.repeat(40));
    return (await GET({ nextUrl: url })).headers.get('Location');
  };
  try {
    assert.equal(await back({ role: 'student', onboardingRequired: true }), '/student/onboarding?github=connected');
    assert.equal(await back({ role: 'student', onboardingRequired: false }), '/student/connections?github=connected');
    assert.equal(await back({ role: 'student' }), '/student/connections?github=connected', 'a missing flag means nothing is required, as in the gate');
  } finally { delete global.__callback; }
});

test('student API serves only skills resources while onboarding is required', async () => {
  const originalFetch=global.fetch;global.__studentPerf={auth:0,urls:[],required:true};
  try {
    global.fetch=async(url)=>{const path=new URL(url).pathname;global.__studentPerf.urls.push(path);
      return Response.json({data:path==='/api/v1/session'?{role:'student',onboardingRequired:global.__studentPerf.required}:{ok:true}});};
    const route=await load('src/app/student/api/[...path]/route.ts', {
      'server-only':'', 'react':'exports.cache=fn=>fn;', 'next/navigation':'exports.redirect=()=>{throw Error("NEXT_REDIRECT")};',
      '@/shared/config/env':'exports.backendOrigin=()=>new URL("http://synthetic-backend.invalid");',
      './supabase':`exports.supabaseServer=async()=>({auth:{getUser:async()=>{global.__studentPerf.auth++;return {data:{user:{id:'student'}},error:null}},getSession:async()=>({data:{session:{access_token:'verified-token'}}})}});`,
    });
    const call=async(method,path)=>{global.__studentPerf.urls=[];global.__studentPerf.auth=0;
      const req={...request('/student/api/'+path.join('/')),method,body:method==='POST'?new Response('{}').body:null};
      req.headers.set('origin','http://localhost');
      const res=await route[method](req,{params:Promise.resolve({path})});return {status:res.status,body:await res.json(),urls:global.__studentPerf.urls,auth:global.__studentPerf.auth};};
    const read=await call('GET',['dashboard']);
    assert.equal(read.status,403);assert.deepEqual(read.body,{code:'ONBOARDING_REQUIRED',error:'Complete your skills onboarding first.'});
    assert.equal(read.auth,1);
    const write=await call('POST',['conversations']);
    assert.equal(write.status,403);assert.equal(write.body.code,'ONBOARDING_REQUIRED');
    assert.deepEqual(write.urls,['/api/v1/session'],'a write is never forwarded while onboarding is required');
    const skills=await call('GET',['skills','profile']);
    assert.equal(skills.status,200);assert.deepEqual(skills.urls,['/api/v1/student/skills/profile'],'skills resources need no /session read');
    global.__studentPerf.required=false;
    const open=await call('POST',['conversations']);
    assert.equal(open.status,200);assert.deepEqual(open.urls,['/api/v1/session','/api/v1/student/conversations']);assert.equal(open.auth,1);
  } finally { global.fetch=originalFetch;delete global.__studentPerf; }
});
