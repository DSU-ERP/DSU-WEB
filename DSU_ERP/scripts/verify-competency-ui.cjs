const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{build}=require('esbuild'),{chromium}=require('@playwright/test');
const dir=path.resolve('.qa/competency-ui');fs.mkdirSync(dir,{recursive:true});
const backend=path.resolve('../..','DSU-Backend');
let fixture,server,browser;
(async()=>{
 fixture=spawn(process.execPath,['--no-wasm-tier-up','scripts/competency-ui-fixture-server.js'],{cwd:backend,stdio:['ignore','pipe','pipe'],windowsHide:true});
 const ready=await new Promise((resolve,reject)=>{let data='';const timer=setTimeout(()=>reject(Error('Fixture server timed out')),60000);fixture.stdout.on('data',chunk=>{data+=chunk;const line=data.split('\n').find(s=>s.startsWith('{'));if(line){clearTimeout(timer);resolve(JSON.parse(line));}});fixture.on('exit',code=>{clearTimeout(timer);reject(Error('Fixture server exited '+code));});fixture.stderr.on('data',chunk=>process.stderr.write(chunk));});
 const api='http://127.0.0.1:'+ready.port;
 const get=async(route,role='officer')=>{const r=await fetch(api+'/api/v1'+route,{headers:{authorization:'Bearer '+ready[role]}});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data.data;};
 const data={catalog:await get('/competency/catalog'),overview:await get('/placement/talent-intelligence'),profile:await get('/student/career-intelligence','student')};
 fs.writeFileSync(path.join(dir,'fixture.json'),JSON.stringify(data));
 fs.writeFileSync(path.join(dir,'entry.tsx'),`import React from 'react';import{createRoot}from'react-dom/client';import{StudentIntelligence,OfficerIntelligence}from '../../src/features/competency/Intelligence';import data from './fixture.json';const student=location.pathname.startsWith('/student');createRoot(document.getElementById('root')!).render(student?<StudentIntelligence initial={data.profile as any} catalog={data.catalog as any}/>:<OfficerIntelligence initial={data.overview as any} catalog={data.catalog as any}/>);`);
 await build({entryPoints:[path.join(dir,'entry.tsx')],bundle:true,outfile:path.join(dir,'bundle.js'),platform:'browser',jsx:'automatic',plugins:[{name:'next-link-test',setup(b){b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:`import React from 'react';export default function Link(props){return React.createElement('a',props)}`,loader:'js',resolveDir:process.cwd()}));}}]});
 const aliases={catalog:'/competency/catalog',student:'/student/career-intelligence',overview:'/placement/talent-intelligence',cohort:'/placement/talent-intelligence/cohort',evidence:'/student/career-intelligence/evidence',corrections:'/student/career-intelligence/corrections',review:'/placement/talent-intelligence/review',recalculate:'/placement/talent-intelligence/recalculate',documents:'/student/career-intelligence/documents','import-platforms':'/student/career-intelligence/import-platforms'};
 server=http.createServer(async(req,res)=>{try{
  if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(dir,'bundle.js')));return;}
  if(req.url.startsWith('/api/competency/')){
   const u=new URL(req.url,'http://localhost'),key=u.pathname.slice('/api/competency/'.length);let target=aliases[key];
   if(key.startsWith('profile/'))target='/placement/talent-intelligence/student/'+key.slice(8);
   if(key.startsWith('template/'))target='/competency/templates/'+key.slice(9);
   if(!target){res.writeHead(404);res.end('{}');return;}
   const chunks=[];for await(const chunk of req)chunks.push(chunk);
   const role=req.headers.referer?.includes('/student')?'student':'officer';
   const response=await fetch(api+'/api/v1'+target+u.search,{method:req.method,headers:{authorization:'Bearer '+ready[role],'Content-Type':'application/json'},...(req.method==='POST'?{body:Buffer.concat(chunks).toString()}:{} )});
   res.writeHead(response.status,{'Content-Type':'application/json'});res.end(await response.text());return;
  }
  const css=fs.readFileSync('src/features/competency/competency.css','utf8');res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:Arial,sans-serif;background:#f7f7f4}*{box-sizing:border-box}'+css+'</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
 }catch(e){res.writeHead(500);res.end(JSON.stringify({error:e.message}));}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/student/career-intelligence');await page.getByRole('heading',{name:'Career intelligence',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.getByLabel('Title',{exact:true}).fill('Browser-tested project');await page.getByLabel('Source reference').fill('work:browser-test');await page.getByLabel('Your contribution').fill('Implemented input validation.');await page.getByLabel('Work sample and validation').fill('Validation rejects malformed requests and tests document the expected errors.');await page.getByRole('button',{name:'Submit work sample'}).click();await page.locator('summary').filter({hasText:'Browser-tested project'}).waitFor();
 await page.getByRole('button',{name:'Import stored platform evidence'}).click();await page.getByRole('status').filter({hasText:'0 stored platform measurements'}).waitFor();
 await page.screenshot({path:path.join(dir,'student-desktop.png'),fullPage:false});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(dir,'student-mobile.png')});
 await page.setViewportSize({width:1440,height:1000});await page.goto(origin+'/placement/talent-intelligence');await page.getByRole('heading',{name:'Talent intelligence',exact:true}).waitFor();
 const selected=data.catalog.roles.find(r=>r.id==='software-development-engineer').templates.find(t=>t.status==='simulated');await page.getByLabel('Role and assessment version').selectOption(selected.id);await page.getByLabel('Minimum coverage (%)',{exact:true}).fill('100');await page.getByRole('button',{name:'Compare cohort'}).click();await page.getByText(/matching students from a cohort of 100/).waitFor();
 assert.ok(await page.getByRole('button',{name:'Propose shortlist',exact:true}).count()>0);assert.equal(await page.getByRole('button',{name:'Propose shortlist',exact:true}).first().isDisabled(),true);
 await page.getByRole('button',{name:/Synthetic Student/}).first().click();await page.getByRole('heading',{name:'Student evidence review',exact:true}).waitFor();
 await page.screenshot({path:path.join(dir,'officer-desktop.png')});await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(dir,'officer-mobile.png')});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks:['student evidence submission through real routes','stored-source import without network','server-calculated cohort comparison','simulation shortlist rejection control','student drill-down','desktop and mobile overflow','no React runtime errors'],screenshots:dir},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));fixture?.kill();});
