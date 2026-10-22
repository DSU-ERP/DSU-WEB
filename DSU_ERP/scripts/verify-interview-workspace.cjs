const {installInterviewSecurity}=require("./fixtures/interview-security.cjs");
const fs = require("node:fs"), path = require("node:path"), http = require("node:http"), assert = require("node:assert/strict");
const { build } = require("esbuild"), { chromium } = require("@playwright/test");
const dir = path.resolve(".qa/interview-workspace"); fs.mkdirSync(dir, { recursive: true });
const id = "11111111-1111-4111-8111-111111111111", now = new Date().toISOString();
const config = { durationMinutes: 10, language: "en-IN", tone: "friendly", depth: "moderate", questionCount: 3 };
const scores = { overall: 7.5, communication: 8, accuracy: 7, confidence: 7, relevance: 8, clarity: 8, structure: 6, specificity: 6, roleFit: 8, depth: 7, conciseness: 8 };
const feedback = { scores, quality: "Strong", explanation: "Explain the measured result.", strengths: ["A clear project example"], improvements: ["Add the result"], followUp: null, turn: { kind: "answer", scored: true, reason: "Relevant evidence" } };
const questions = [{ question: "Describe a project you led.", focus: "Ownership", parent: null }, { question: "How did you measure its result?", focus: "Follow-up", parent: 0 }, { question: "How would you test your solution?", focus: "Technical", parent: null }];
const report = { scores, dimensions: scores, qualities: { Strong: 2 }, answered: 2, graded: 2, pending: 0, strengths: feedback.strengths, improvements: feedback.improvements, nextPlan: ["Practise explaining one outcome with a real metric."], basis: "Average of two scored answers; preparation guidance only.", star: null };
const session = { id, interview_id: id, title: "Graduate software engineer interview", mode: "mock", status: "completed", started_at: new Date(Date.now() - 600000).toISOString(), expires_at: now, ended_at: now, config, questions, report, currentIndex: -1, currentQuestion: null, questionCount: 3, answeredCount: 2, integrity: [], termination_reason: null, answers: questions.slice(0, 2).map((q, index) => ({ id: "answer-" + index, question_index: index, question: q.question, focus: q.focus, answer: "I built an application and wrote regression tests with my team.", feedback, original_answer: null, original_feedback: null, retried: false, coaching: {} })) };
const plan = { id, title: session.title, goal: "Prepare for graduate engineering interviews with evidence from my projects.", config, created_at: now, questions: 3, sessions: 1, seconds: 600, archived: false };
const stats = { answers: 2, plans: { plans: 1, questions: 3 }, sessions: { total: 1, completed: 1, seconds: 600 }, statuses: [{ status: "completed", total: 1 }], focus: [{ label: "Ownership", total: 2 }, { label: "Technical reasoning", total: 1 }], daily: [{ activity_date: now.slice(0, 10), sessions: 1, seconds: 600 }], answerDays: [{ activity_date: now.slice(0, 10), answers: 2 }], recent: [{ ...session, title: plan.title }] };
const entry = `import React from 'react';import{createRoot}from'react-dom/client';
import{StudentShell}from'@/features/student/components/StudentShell';import{InterviewDashboard}from'@/features/student/components/InterviewOverview';import{InterviewCreator}from'@/features/student/components/InterviewCreator';import{InterviewLibrary}from'@/features/student/components/InterviewWorkspace';import{InterviewResultCard}from'@/features/student/components/InterviewResultCard';import{InterviewPlanView}from'@/features/student/components/InterviewRoom';import{InterviewSessions}from'@/features/student/components/InterviewSessions';
const stats=${JSON.stringify(stats)},plan=${JSON.stringify(plan)},session=${JSON.stringify(session)};
const query=new URLSearchParams(location.search),view=query.get('view');const planDetail={...plan,config:window.__planConfig||{...plan.config,preferredMode:'mock',channels:{text:true,voice:false,video:false}},questions:session.questions,context:null,sessions:[]};const page=location.pathname.includes('/report/')?<InterviewResultCard initial={session} autoOpen={query.get('open')==='1'}/>:location.pathname==='/student/interview/${id}'?<InterviewPlanView plan={planDetail}/>:location.pathname.includes('/session/')?<h1>Live interview fixture</h1>:view==='create'?<InterviewCreator/>:view==='library'?<InterviewLibrary initial={[plan]}/>:view==='sessions'?<InterviewSessions initial={{rows:stats.recent,page:1,hasMore:false}}/>:<InterviewDashboard stats={stats} plans={[plan]}/>;
createRoot(document.getElementById('root')).render(<StudentShell name='Example Student' usn='QA001'>{page}</StudentShell>);`;
const mocks = { "next/link": "import React from'react';export default function Link({children,...p}){return <a {...p}>{children}</a>}", "next/navigation": "export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);export const useRouter=()=>({push:p=>location.assign(p),refresh:()=>{}});", "@/app/login/actions": "export async function signOut(){}" };
(async () => { let browser, server; const errors = [], calls = []; let fail = true, createdConfig = null;
  try {
    await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, outfile: path.join(dir, "bundle.js"), jsx: "automatic", platform: "browser", define: { "process.env.NODE_ENV": '"development"' }, plugins: [{ name: "boundaries", setup(b) { b.onResolve({ filter: /.*/ }, (args) => mocks[args.path] ? { path: args.path, namespace: "mock" } : undefined); b.onLoad({ filter: /.*/, namespace: "mock" }, (args) => ({ contents: mocks[args.path], loader: "tsx", resolveDir: process.cwd() })); } }] });
    const css = "*{box-sizing:border-box}body,h1,h2,h3,p,dl,dd{margin:0}body{font-family:Arial}a{color:inherit;text-decoration:none}button,input,textarea,select{font:inherit}button{border:0;cursor:pointer}svg{flex-shrink:0}:root{--mono:monospace}" + ["src/app/student/student.css", "src/features/student/components/interview-studio.css", "src/features/student/components/interview-meeting.css", "src/app/student/workspace-polish.css", "src/app/student/interview/interview-workspace.css"].map((file) => fs.readFileSync(file, "utf8")).join("\n");
    server = http.createServer(async (req, res) => {
      if (req.url === "/bundle.js") { res.setHeader("Content-Type", "text/javascript"); return res.end(fs.readFileSync(path.join(dir, "bundle.js"))); }
      if (req.url.startsWith("/student/api/")) {
        const chunks = []; for await (const chunk of req) chunks.push(chunk); const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : undefined; calls.push({ url: req.url, body });
        res.setHeader("Content-Type", "application/json");
        if (req.url.endsWith('/coach')) { await new Promise((resolve)=>setTimeout(resolve,250)); return res.end(JSON.stringify({data:{title:'Coaching for answer '+body.questionIndex,explanation:'Use the measured outcome.',points:['Explain the result'],rewrite:null,why:'Evidence makes the answer concrete.',nextTip:'Practise once more.'}})); }
        if (req.url === "/student/api/interviews" && body && fail) { fail = false; res.statusCode = 503; return res.end(JSON.stringify({ error: "Temporary generation issue. Your draft is safe." })); }
        if (req.url === "/student/api/interviews" && body) createdConfig = body.config;
        if (req.url.includes("/documents")) return res.end(JSON.stringify({ data: { id, filename: "resume.txt", content: "Built a tested student portal.", chars: 29 } }));
        if (body) return res.end(JSON.stringify({ data: { id, title: plan.title } }));
        return res.end(JSON.stringify({ data: [plan] }));
      }
      res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + css + '</style></head><body><div id="root"></div><script>('+installInterviewSecurity.toString()+')({ready:false});</script><script>window.__planConfig='+JSON.stringify(createdConfig)+'</script><script src="/bundle.js"></script></body></html>');
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve)); const origin = "http://127.0.0.1:" + server.address().port;
    browser = await chromium.launch({ headless: true, ...(process.platform === "win32" ? { channel: "msedge" } : {}) });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(origin + "/student/interview?view=create");
    assert.equal(await page.locator('.st-sidebar,.st-topbar').count(), 0, "no ERP frame inside the interview workspace");
    await page.getByRole('button',{name:'Manual questions',exact:true}).click();
    await page.getByLabel('Your interview goal').fill('Prepare for a graduate engineering role.');
    await page.getByLabel('Questions · one per line, between 3 and 15').fill('Describe your project.\nExplain a challenge.\nHow did you test it?');
    
    await page.getByRole('radio',{name:/Proctored AI/}).check();
    assert.equal(await page.getByRole('switch',{name:'Voice channel'}).isChecked(),true);
    assert.equal(await page.getByRole('switch',{name:'Camera channel'}).isDisabled(),true);
    await page.getByText('Security required in both interview modes',{exact:true}).waitFor();
    await page.getByRole('radio',{name:/Coached practice/}).check();
    await page.getByRole('switch',{name:'Voice channel'}).uncheck();
    
    await page.getByRole('button',{name:'Continue to instructions',exact:true}).click();
    await page.getByText('Temporary generation issue. Your draft is safe.').waitFor();
    
    assert.equal(await page.getByLabel('Your interview goal').inputValue(),'Prepare for a graduate engineering role.');
    await page.getByRole('button',{name:'Continue to instructions',exact:true}).click();
    await page.waitForURL('**/student/interview/'+id);
    await page.getByRole('heading',{name:'Interview instructions',exact:true}).waitFor();
    await page.screenshot({path:path.join(dir,'instructions-mock.png'),fullPage:true});
    assert.equal(await page.getByText('Your plan is ready.',{exact:true}).count(),0);
    const begin = page.getByRole('button',{name:'Begin mock interview',exact:false});
    assert.equal(await begin.isDisabled(),true,'agreement is required');
    assert.equal(calls.filter(call=>call.url.endsWith('/sessions')).length,0,'no timer/session before agreement');
    await page.getByRole('checkbox',{name:/I agree to the interview instructions/}).check();
    for(const label of ['Camera & microphone','Single-display check','Entire-screen sharing','Fullscreen workspace'])await page.getByRole('button',{name:new RegExp(label)}).click();
    await begin.click();
    await page.waitForURL('**/student/interview/session/'+id);
    assert.deepEqual(calls.findLast(call=>call.url.endsWith('/sessions')).body,{mode:'mock',accepted:true});
    assert.equal(calls.filter(call=>call.url.endsWith('/sessions')).length,1,'one timed session is created');
    assert.equal(calls.filter((call) => call.body?.source === 'manual').length, 2, "one request per explicit attempt");
    const saved = calls.findLast((call) => call.body?.source === 'manual').body;
    assert.equal(saved.manualQuestions.length,3);assert.equal(saved.config.questionCount,3);assert.equal(saved.config.channels.voice,false);assert.equal(saved.config.preferredMode,'mock');
    await page.goto(origin+'/student/interview?view=create');
    await page.getByRole('button',{name:'Technical',exact:true}).click();
    await page.locator('.iw-document').first().locator('summary').click();
    await page.locator('.iw-document[open] input[type="file"]').setInputFiles({name:'jd.txt',mimeType:'text/plain',buffer:Buffer.from('Synthetic role description.')});
    await page.getByLabel('Company JD and role context').waitFor();
    await page.waitForFunction(()=>document.querySelector('.iw-document[open] textarea').value==='Built a tested student portal.');
    
    await page.getByRole('radio',{name:/Proctored AI/}).check();
    await page.getByRole('button',{name:'Continue to instructions',exact:true}).click();await page.getByRole('heading',{name:'Interview instructions',exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Begin proctored AI interview',exact:false}).isDisabled(),true,'selected mode proceeds directly to required permissions');
    await page.screenshot({path:path.join(dir,'instructions-proctored.png'),fullPage:true});
    assert.equal(calls.findLast(call=>call.body?.source==='ai').body.jd,'Built a tested student portal.');
    await page.goto(origin+'/student/interview/report/'+id);
    const resultDialog = page.getByRole('dialog',{name:'Interview results',exact:true});
    assert.equal(await resultDialog.isVisible(),false,'results initially appear as a compact card');
    assert.equal(await page.locator('.iw-report').count(),0,'detailed report loads on demand');
    await page.getByRole('button',{name:'View interview results',exact:true}).click();
    await resultDialog.waitFor();
    await page.locator('.iw-answer-performance button').nth(1).click();
    await page.getByText('How did you measure its result?',{exact:true}).first().waitFor();
    assert.equal(await page.getByRole('button',{name:/Follow-up to question 1/}).getAttribute('aria-current'),'true');
    await page.locator('.iw-answer-performance button').first().click();
    await page.getByRole('button',{name:'Improve My Answer',exact:true}).click();
    await page.locator('.iw-answer-performance button').nth(1).click();
    await page.getByText('Preparing specific, useful coaching…',{exact:true}).waitFor({state:'hidden'});
    assert.equal(await page.getByRole('heading',{name:'Coaching for answer 0',exact:true}).count(),0,'old coaching never appears under a different question');
    await page.locator('.iw-answer-performance button').first().click();
    await page.getByRole('button',{name:/Improve My Answer/}).click();
    await page.getByRole('heading',{name:'Coaching for answer 0',exact:true}).waitFor();
    assert.equal(calls.filter(call=>call.url.endsWith('/coach')).length,1,'returning to an answer uses its saved coaching');
    await page.emulateMedia({media:'print'});assert.equal(await page.locator('.iw-print-transcript article').count(),2);assert.equal(await page.locator('.iw-print-transcript').isVisible(),true);await page.emulateMedia({media:'screen'});
    await page.keyboard.press('Escape');
    assert.equal(await resultDialog.isVisible(),false);
    assert.equal(await page.getByRole('button',{name:'View interview results',exact:true}).evaluate(el=>el===document.activeElement),true,'report dialog restores focus');
    await page.getByRole('button',{name:'View interview results',exact:true}).click();
    await page.getByRole('heading',{name:'Coaching for answer 0',exact:true}).waitFor();
    assert.equal(calls.filter(call=>call.url.endsWith('/coach')).length,1,'closing and reopening retains coaching');
    await page.getByRole('button',{name:'Close interview results',exact:true}).click();
    for (const theme of ['light','dark']) {
      await page.evaluate((value)=>localStorage.setItem('dsu-student-theme',value),theme);
      for (const width of [320,390,768,1440]) {
        await page.setViewportSize({width,height:1000});
        for (const [name, url] of [['overview','/student/interview'],['library','/student/interview?view=library'],['create','/student/interview?view=create'],['instructions','/student/interview/'+id],['sessions','/student/interview?view=sessions'],['report','/student/interview/report/'+id]]) {
          await page.goto(origin+url);await page.locator('h1').first().waitFor();
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${name} ${theme} ${width} overflow`);
          assert.equal(await page.locator('.st-sidebar').count(),0);
          if(name==='instructions') assert.equal(await page.locator('.st-preflight').evaluate(el=>el.scrollWidth>el.clientWidth),false,`instructions content ${theme} ${width} is not clipped`);
          await page.screenshot({path:path.join(dir,`${name}-${theme}-${width}.png`),fullPage:true});
          if(name==='report') {
            await page.getByRole('button',{name:'View interview results',exact:true}).click();
            await page.getByRole('dialog',{name:'Interview results',exact:true}).waitFor();
            await page.getByRole('heading',{name:'Your interview, decoded.',exact:true}).waitFor();
            assert.equal(await page.locator('.iw-result-dialog-body').evaluate(el=>el.scrollWidth>el.clientWidth),false,`floating report ${theme} ${width} overflow`);
            await page.screenshot({path:path.join(dir,`report-dialog-${theme}-${width}.png`),fullPage:true});
            await page.getByRole('button',{name:'Close interview results',exact:true}).click();
          }
        }
        await page.goto(origin+'/student/interview?view=create');await page.getByLabel('Your interview goal').fill('Prepare for a graduate engineering interview.');
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`experience ${theme} ${width} overflow`);
        await page.screenshot({path:path.join(dir,`experience-${theme}-${width}.png`),fullPage:true});
      }
    }
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'Open interview navigation'}).click();await page.getByRole('navigation',{name:'Interview modules'}).getByRole('link',{name:'Interviews',exact:true}).click();await page.waitForURL('**/student/interview?view=library');
    await page.getByRole('button',{name:'Open interview navigation'}).click();await page.getByRole('link',{name:'Back to dashboard',exact:true}).click();await page.waitForURL('**/student/dashboard');
    await page.goto(origin+'/student/interview/report/'+id+'?open=1');await page.getByRole('dialog',{name:'Interview results',exact:true}).waitFor();
    assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks:['dedicated workspace','single-page creation directly to instructions','agreement before timed session','selected mock/proctored mode retained','failure recovery and retained draft','one request per explicit generation','result card and floating analysis with Escape/focus/print','coaching retained on reopen','follow-up report navigation','light/dark at 320/390/768/1440','mobile navigation and dashboard return'],data:'Synthetic fixtures; authorization and persistence verified separately.'}));
  } catch (error) { console.error(error.stack); const page=browser?.contexts()[0]?.pages()[0];if(page)await page.screenshot({path:path.join(dir,'failure.png'),fullPage:true});process.exitCode=1; }
  finally { await browser?.close();if(server)await new Promise((resolve)=>server.close(resolve)); }
})();
