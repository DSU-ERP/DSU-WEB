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
  const originalFetch=global.fetch;global.__studentPerf={auth:0,tokenReads:0,user:null,requests:[]};
  try {
    global.fetch=async(url,options)=>{global.__studentPerf.requests.push(options.headers.Authorization);return Response.json({data:{ready:true}});};
    const { GET }=await load('src/app/student/api/[...path]/route.ts', {
      'server-only':'', 'react':'exports.cache=fn=>fn;', 'next/navigation':'exports.redirect=()=>{throw Error("NEXT_REDIRECT")};',
      '@/shared/config/env':'exports.backendOrigin=()=>new URL("http://synthetic-backend.invalid");',
      './supabase':`exports.supabaseServer=async()=>({auth:{getUser:async()=>{global.__studentPerf.auth++;return {data:{user:global.__studentPerf.user},error:null}},getSession:async()=>{global.__studentPerf.tokenReads++;return {data:{session:{access_token:'verified-token'}}}}}});`,
    });
    const run=()=>GET(request('/student/api/conversations'),{params:Promise.resolve({path:['conversations']})});
    assert.equal((await run()).status,401);assert.equal(global.__studentPerf.requests.length,0);
    global.__studentPerf.user={id:'student'};global.__studentPerf.auth=0;
    const result=await run();assert.equal(result.status,200);assert.deepEqual(await result.json(),{data:{ready:true}});
    assert.equal(global.__studentPerf.auth,1);assert.deepEqual(global.__studentPerf.requests,['Bearer verified-token']);
  } finally { global.fetch=originalFetch;delete global.__studentPerf; }
});

test('student layout streams loading before authenticated profile work and withholds private children on denial', async () => {
  const React=require('react'),{renderToPipeableStream}=require('react-dom/server'),{Writable}=require('node:stream');
  const { default: Layout }=await load('src/app/student/layout.tsx', {
    'server-only':'',
    '@/features/student/lib/server':'exports.studentProfile=()=>global.__studentPerf.profile;',
    '@/features/student/components/StudentShell':`const React=require('react');exports.StudentShell=({name,children})=>React.createElement('main',null,name,children);`,
    '../login/actions':'exports.signOut=async()=>{};',
  });
  for (const denied of [false,true]) {
    let resolve;global.__studentPerf={profile:new Promise(r=>resolve=r)};
    let output='',ready;const shellReady=new Promise(r=>ready=r);let finish;const complete=new Promise(r=>finish=r);
    const sink=new Writable({write(chunk,_encoding,callback){output+=chunk.toString();callback();}});sink.on('finish',finish);
    const stream=renderToPipeableStream(React.createElement('html',null,React.createElement('body',null,React.createElement(Layout,null,React.createElement('b',null,'Private coursework')))), {onShellReady(){stream.pipe(sink);ready();},onError:()=>{}});
    await shellReady;await new Promise(r=>setImmediate(r));assert.match(output,/Loading your student workspace/);assert.doesNotMatch(output,/Private coursework/);
    if(denied){resolve(Promise.reject(Object.assign(new Error('not allowed'),{status:403})));await complete;assert.doesNotMatch(output,/Private coursework/);}
    else {resolve({details:{fullName:'Synthetic Student'},official:{enrollment_no:'QA'}});await complete;assert.match(output,/Synthetic Student/);assert.match(output,/Private coursework/);}
  }
  delete global.__studentPerf;
});
