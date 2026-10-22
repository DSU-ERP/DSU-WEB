// Real interview preflight/room guards with synthetic media and transport.
// No physical devices, accounts, live provider or biometric checks are used.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {build}=require('esbuild'),{chromium}=require('@playwright/test');
const {installInterviewSecurity}=require('./fixtures/interview-security.cjs');
const dir=path.resolve('.qa/interview-security');fs.mkdirSync(dir,{recursive:true});
const base={interview_id:'11111111-1111-4111-8111-111111111111',title:'Secure engineering interview',status:'active',started_at:new Date().toISOString(),expires_at:new Date(Date.now()+1200000).toISOString(),ended_at:null,config:{durationMinutes:20,language:'en-IN',tone:'friendly',depth:'moderate',questionCount:3,channels:{text:true,voice:false,video:true}},currentIndex:0,currentQuestion:'Describe your academic project.',questionCount:3,answeredCount:0,answers:[],report:null,integrity:[],termination_reason:null};
const entry=`import React from'react';import{createRoot}from'react-dom/client';import{InterviewRoom,InterviewPreflight}from'@/features/student/components/InterviewRoom';import{depositMedia}from'@/features/student/lib/media';const initial=window.__initial;if(location.pathname==='/room')depositMedia(initial.id,window.__makeInterviewMedia());createRoot(document.getElementById('root')).render(<React.StrictMode><div className='st-app st-interview-app st-light'>{location.pathname==='/room'?<InterviewRoom initial={initial}/>:<InterviewPreflight mode={initial.mode} title={initial.title} minutes={20} channels={initial.config.channels} onReady={async()=>{await fetch('/student/api/start',{method:'POST',body:JSON.stringify({mode:initial.mode,accepted:true})});}}/>}</div></React.StrictMode>);`;
const mocks={
 'next/link':"import React from'react';export default function Link({children,...props}){return <a {...props}>{children}</a>}",
 'next/navigation':"const router={push:path=>{window.__navigation=path},replace:path=>{window.__navigation=path}};export const useRouter=()=>router;",
 './InterviewVoiceControls':"import React,{useEffect}from'react';export function InterviewSpeechCheck({onReady}){useEffect(()=>onReady(true),[onReady]);return <p>Local speech fixture ready</p>}export function InterviewVoicePicker(){return <p>Installed local voice fixture</p>}",
 '../lib/useInterviewVoice':"export function useInterviewVoice(){return {available:true,selected:'calm',choose(){},stop(){window.__voiceStopped=true},speak(lines,options){options?.onStart?.();options?.onEnd?.();return true},playing:false,voiceFor(){return {name:'Local'}}}}",
 '../lib/useInterviewSpeech':"export function useInterviewSpeech(){return {listening:false,loading:false,requesting:false,transcribing:false,partial:false,silenceRemaining:null,level:0,error:'',cancel(){},async stop(){},startWith(){window.__speechStarts=(window.__speechStarts||0)+1}}}",
};
(async()=>{let browser,server;const calls=[],errors=[],sessions=new Map(),counts=new Map(),seen=new Set();let serial=0,failIntegrity=false;
try{
 await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'tsx'},bundle:true,outfile:path.join(dir,'bundle.js'),jsx:'automatic',platform:'browser',loader:{'.css':'empty'},plugins:[{name:'security-fixtures',setup(b){b.onResolve({filter:/.*/},a=>mocks[a.path]?{path:a.path,namespace:'fixture'}:undefined);b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:mocks[a.path],loader:'tsx',resolveDir:process.cwd()}));}}]});
 const css='*{box-sizing:border-box}body,h1,h2,h3,p{margin:0}body{font-family:Arial}button,input,textarea{font:inherit}'+['src/app/student/student.css','src/features/student/components/interview-studio.css','src/app/student/interview/interview-workspace.css','src/features/student/components/interview-meeting.css'].map(file=>fs.readFileSync(file,'utf8')).join('\n');
 server=http.createServer(async(req,res)=>{
  if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');return res.end(fs.readFileSync(path.join(dir,'bundle.js')));}
  if(req.url.startsWith('/student/api/')){
   let raw='';for await(const chunk of req)raw+=chunk;const body=raw?JSON.parse(raw):null;calls.push({url:req.url,body});const id=req.url.split('/')[4];let data=sessions.get(id)||{};
   if(req.url.endsWith('/integrity')){const before=counts.get(id)||0;if(!seen.has(body.incidentId)){seen.add(body.incidentId);counts.set(id,before+(body.kind==='inactive'?0:1));}const warnings=counts.get(id)||0;if(warnings>=3&&sessions.has(id))sessions.get(id).status='terminated';if(failIntegrity){failIntegrity=false;res.statusCode=503;res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({error:'Synthetic connection interruption'}));}data={warnings,ended:warnings>=3,severity:body.kind==='inactive'?'info':'warning',recorded:true};}
   res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({data}));
  }
  const url=new URL(req.url,'http://localhost'),id=url.searchParams.get('id'),initial={...structuredClone(base),id,mode:url.searchParams.get('mode')||'mock'};sessions.set(id,initial);
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style><div id="root"></div><script>window.__initial='+JSON.stringify(initial)+';('+installInterviewSecurity.toString()+')({ready:'+String(url.pathname==='/room')+'});</script><script src="/bundle.js"></script>');
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
 const open=async(mode,route='room',width=1440)=>{const id='00000000-0000-4000-8000-'+String(++serial).padStart(12,'0');const context=await browser.newContext({viewport:{width,height:950}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(`${origin}/${route}?mode=${mode}&id=${id}`);return {context,page,id};};
 const restore=async page=>{await page.getByRole('button',{name:'Restore & continue',exact:true}).click();await page.getByRole('dialog',{name:'Restore your secure workspace.'}).waitFor({state:'hidden'});};
 for(const mode of ['mock','proctored']){
  const {context,page}=await open(mode,'preflight',mode==='mock'?390:1440),begin=page.getByRole('button',{name:mode==='mock'?'Begin mock interview':'Begin proctored AI interview',exact:false});
  assert.equal(await begin.isDisabled(),true);await page.getByRole('checkbox').check();assert.equal(await begin.isDisabled(),true,'consent alone does not bypass security');
  await page.evaluate(()=>{window.__interviewSecurity.surface='window'});await page.getByRole('button',{name:/Entire-screen sharing/}).click();await page.getByText(/Choose your entire screen/).waitFor();
  await page.evaluate(()=>{window.__interviewSecurity.surface='monitor';window.__interviewSecurity.denyCamera=true});await page.getByRole('button',{name:/Camera & microphone/}).click();await page.getByText(/Camera and microphone access are required/).waitFor();
  await page.evaluate(()=>{window.__interviewSecurity.denyCamera=false});await page.getByRole('button',{name:/Camera & microphone/}).click();
  await page.evaluate(()=>{window.__interviewSecurity.extended=true});await page.getByRole('button',{name:/Single-display check/}).click();assert.equal(await begin.isDisabled(),true,'multiple monitors cannot pass preflight');
  await page.evaluate(()=>{window.__interviewSecurity.extended=false});await page.getByRole('button',{name:/Single-display check/}).click();await page.getByRole('button',{name:/Entire-screen sharing/}).click();await page.getByRole('button',{name:/Fullscreen workspace/}).click();
  await page.waitForFunction(()=>!document.querySelector('.st-preflight-checklist>button.st-button').disabled);
  const before=calls.filter(c=>c.url.endsWith('/start')).length;await begin.evaluate(el=>{el.click();el.click()});await page.waitForTimeout(150);assert.equal(calls.filter(c=>c.url.endsWith('/start')).length,before+1,'start is guarded against duplicate clicks');
  await page.screenshot({path:path.join(dir,`preflight-${mode}.png`),fullPage:true});await context.close();
 }
 for(const mode of ['mock','proctored']){
  const {context,page,id}=await open(mode);await page.locator('.im-room').waitFor();
  if(mode==='mock')await page.getByLabel('Your answer · type or speak').fill('My project answer must survive a security pause.');
  await page.evaluate(()=>{const s=window.__interviewSecurity;s.fullscreen=false;s.visible=false;s.focused=false;document.dispatchEvent(new Event('fullscreenchange'));document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('blur'));});
  await page.getByRole('dialog',{name:'Restore your secure workspace.'}).waitFor();await page.waitForFunction(()=>document.querySelector('.im-security-count').textContent.startsWith('1/3'));
  assert.equal(calls.filter(c=>c.url.includes(id)&&c.url.endsWith('/integrity')).length,1,'one tab/fullscreen incident counts once');
  await page.getByRole('button',{name:'Send answer',exact:true}).evaluate(el=>el.click());assert.equal(calls.filter(c=>c.url.includes(id)&&c.url.endsWith('/answer')).length,0,'paused answers cannot bypass the guard');
  await page.screenshot({path:path.join(dir,`paused-${mode}.png`),fullPage:true});
  await page.evaluate(()=>{window.__interviewSecurity.visible=true;window.__interviewSecurity.focused=true});await restore(page);
  if(mode==='mock')assert.equal(await page.getByLabel('Your answer · type or speak').inputValue(),'My project answer must survive a security pause.');
  await page.waitForTimeout(1900);assert.equal(await page.evaluate(()=>document.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}))),false);await page.waitForFunction(()=>document.querySelector('.im-security-count').textContent.startsWith('2/3'));await restore(page);
  await page.waitForTimeout(1900);assert.equal(await page.evaluate(()=>document.dispatchEvent(new Event('paste',{bubbles:true,cancelable:true}))),false);await page.waitForFunction(()=>window.__navigation?.includes('/report/'));
  assert.equal(counts.get(id),3,'both modes reach the report after three warnings');await context.close();
 }
 {
  const {context,page,id}=await open('mock');await page.locator('.im-room').waitFor();await page.evaluate(()=>{window.__interviewSecurity.coverage=.5;window.dispatchEvent(new Event('resize'));});await page.getByRole('dialog',{name:'Restore your secure workspace.'}).waitFor();
  await page.waitForFunction(()=>document.querySelector('.im-security-count').textContent.startsWith('1/3'));assert.ok(calls.some(c=>c.url.includes(id)&&c.body?.kind==='restricted-window'));
  await page.evaluate(()=>{window.__interviewSecurity.coverage=1});await restore(page);
  await page.evaluate(()=>{window.__interviewSecurity.extended=true;window.__interviewSecurity.media.displays.dispatchEvent(new Event('screenschange'));});await page.getByRole('dialog',{name:'Restore your secure workspace.'}).waitFor();assert.equal(await page.evaluate(()=>window.__interviewSecurity.fullscreen),true,'extra display is blocked even while fullscreen remains active');await context.close();
 }
 {
  const {context,page,id}=await open('mock');await page.locator('.im-room').waitFor();failIntegrity=true;
  assert.equal(await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'r',ctrlKey:true,bubbles:true,cancelable:true}))),false);
  await page.getByRole('dialog').getByText('Synthetic connection interruption',{exact:true}).waitFor();await restore(page);
  const attempts=calls.filter(c=>c.url.includes(id)&&c.url.endsWith('/integrity'));assert.equal(attempts.length,2);assert.equal(attempts[0].body.incidentId,attempts[1].body.incidentId);assert.equal(counts.get(id),1,'retrying an interrupted warning is idempotent');
  assert.equal(await page.evaluate(()=>window.dispatchEvent(new Event('beforeunload',{cancelable:true}))),false,'active navigation requests a browser confirmation');await context.close();
 }
 {
  const {context,page,id}=await open('mock');await page.locator('.im-room').waitFor();await page.evaluate(()=>{const track=window.__interviewSecurity.media.camera.getVideoTracks()[0];track.stop();track.dispatchEvent(new Event('ended'));});await page.getByRole('dialog',{name:'Restore your secure workspace.'}).waitFor();assert.ok(calls.some(c=>c.url.includes(id)&&c.body?.kind==='camera-stopped'));await page.getByRole('button',{name:'Recheck devices & display'}).click();await page.getByRole('heading',{name:'Interview instructions',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Begin mock interview',exact:false}).isDisabled(),true);await context.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks:['both modes require all permissions, single display and consent','window/tab sharing rejected','denied camera and extra monitor block start','one start per explicit action','tab/fullscreen incident pauses once','draft preserved and no paused submissions','three warnings end both modes','reduced screen coverage and attached display block','navigation and clipboard restricted','network retry does not double count','camera loss requires setup again'],data:'Synthetic media/browser state and campus transport; no OS-lock or physical-device claim.'}));
}catch(e){console.error(e.stack);const page=browser?.contexts()[0]?.pages()[0];if(page)await page.screenshot({path:path.join(dir,'failure.png'),fullPage:true});process.exitCode=1;}finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}})();
