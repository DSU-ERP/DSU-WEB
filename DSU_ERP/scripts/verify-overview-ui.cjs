// Real Home dashboard, Insights and officer navigation with clearly synthetic, local-only fixtures.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const { chromium } = require('@playwright/test');
const root = process.cwd(), dir = path.join(root, '.qa/overview-ui');
fs.mkdirSync(dir, { recursive: true });
const departments = ['CSE','AIML','ECE','DS','CY','CST','A very long department name for accessibility'];
const chart = {
  filters: {batch:null,department:null},
  kpis:{totalStudents:700,eligible:490,placed:0,placementRate:0,eligiblePlaced:0,eligiblePlacementRate:0,companies:2,activeDrives:1,acceptedOffers:0,activeOffers:0,averageCgpa:'7.12'},
  status:[{key:'placed',label:'Placed',count:0},{key:'eligible_not_placed',label:'Eligible, not placed',count:490},{key:'not_eligible_not_placed',label:'Not eligible, not placed',count:203},{key:'unknown_not_placed',label:'CGPA unknown, not placed',count:7}],
  progress:[], departments:departments.map((department,i)=>({department,total:i===0?650:i===6?10:8,eligible:i===0?455:i===6?5:6,placed:0})),
  definitions:{status:'Four mutually exclusive groups reconcile to the selected cohort.',departments:'Total, eligible and placed students within the selected filters.',placed:'Distinct students with an active offered or accepted offer.'},
};
const report = {
  rows:[],pagination:{total:0,page:1,limit:25},options:{batches:['2026','2027'],departments,quotas:[],industries:[],categories:[],policy:{label:'CGPA 6.75 or above',minimumCgpa:'6.75'}},
  summary:{students:700,placed:0,unplaced:700,placement_percentage:0,average:null,highest:null,median:null,offers:0,accepted:0,drives:1,companies:2},
  drive_statuses:[{status:'upcoming',count:1},{status:'ongoing',count:0},{status:'completed',count:0},{status:'cancelled',count:0}],
  categories:['regular','dream','super-dream','mega'].map(category=>({category,offers:0})),
  scheduled:[{id:'drive-1',title:'Graduate engineer',company:'Fixture Recruiting Company',drive_date:'2026-10-22',registration_deadline:'2026-10-21',status:'upcoming'}],
  recent:[],companies:[],departments:departments.map(department=>({department,total:100,placed:0,placement_percentage:0,average:null,highest:null})),
};
const entry=`import React from 'react';import {createRoot} from 'react-dom/client';
import {PlacementOverview} from '@/features/placement/components/Overview';
import {PlacementInsights} from '@/features/placement/components/Insights';
import {Workspace} from '@/features/placement/components/Workspace';
const data=${JSON.stringify(report)},charts=${JSON.stringify(chart)};
const query=Object.fromEntries(new URLSearchParams(location.search));
if(query.search==='no match'){data.summary.students=0;charts.kpis.totalStudents=0;charts.status=[];charts.departments=[];}
if(query.search==='matched'){data.summary.students=1;charts.kpis.totalStudents=1;charts.kpis.eligible=1;charts.status=[{key:'eligible_not_placed',label:'Eligible, not placed',count:1}];charts.departments=[{department:'CSE',total:1,eligible:1,placed:0}];}
if(query.state==='populated'){data.summary.average=8;data.summary.highest=8;data.summary.median=8;}
if(query.progress==='yes'){charts.progress=Array.from({length:14},(_,i)=>{const d=new Date(Date.UTC(2025,8+i,1));return {month:d.toISOString().slice(0,7),offersRecorded:i+1,studentsPlaced:i,drivesCompleted:i%3};});}
function Fixture(){const [liveCharts,setCharts]=React.useState(charts);window.__updateDepartments=rows=>setCharts(previous=>({...previous,departments:rows}));
 const shown=query.state==='error'?null:liveCharts;
 const body=location.pathname==='/placement/insights'
  ?<PlacementInsights data={data} charts={shown} query={query} environment='Visual QA · synthetic fixtures'/>
  :location.pathname==='/placement/overview'
  ?<PlacementOverview data={data} charts={shown} query={query} today='2026-10-26' environment='Visual QA · synthetic fixtures' notices={{audience:'officer',unread:0,rows:[]}} pendingRequests={query.requests==='none'?null:Number(query.requests||0)}/>
  :<h1>Fixture page</h1>;
 return <Workspace competencyTesting={query.testing==='true'}>{body}</Workspace>}
createRoot(document.getElementById('root')).render(<Fixture/>);`;
const mocks={...require("./harness-server-mocks.cjs"),
 'next/link':`import React from 'react';export default function Link({children,prefetch,scroll,...props}){return <a {...props}>{children}</a>}`,
 'next/navigation':`const router={push:path=>location.assign(path),refresh:()=>{window.__refreshes=(window.__refreshes||0)+1}};export const useRouter=()=>router;export const usePathname=()=>location.pathname;`,
 '@/app/login/actions':`export async function signOut(){}`,
 '@/app/placement/actions':`export async function changePlacement(){return {error:''}}`,
};
const css='*{box-sizing:border-box}body,h1,h2,h3,p,dl,dd{margin:0}a{color:inherit;text-decoration:none}button{cursor:pointer}'+[
 'src/app/globals.css','src/app/workspace.css','src/app/placement/placement.css','src/app/placement/overview.css','src/app/placement/glass-home.css','src/app/placement/company-portal.css','src/shared/notifications/notifications.css',
].map(p=>fs.readFileSync(p,'utf8').replace('@import "tailwindcss";','')).join('\n');
(async()=>{
 let browser,server,page;
 try {
  await build({stdin:{contents:entry,resolveDir:root,loader:'tsx'},bundle:true,outfile:path.join(dir,'bundle.js'),platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'boundaries',setup(b){b.onResolve({filter:/.*/},a=>mocks[a.path]?{path:a.path,namespace:'mock'}:undefined);b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'tsx',resolveDir:root}));}}]});
  server=http.createServer((req,res)=>{
   if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(dir,'bundle.js')));return;}
   if(req.url.startsWith('/fonts/')&&/^\/fonts\/[a-z0-9.-]+\.woff2$/.test(req.url)){res.setHeader('Content-Type','font/woff2');res.end(fs.readFileSync(path.join(root,'public',req.url)));return;}
   res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`);
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
  page=await browser.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const open=async(q='',route='/placement/overview')=>{await page.goto(origin+route+q);await page.getByRole('heading',{name:route==='/placement/insights'?'Insights':'Placement overview',exact:true}).waitFor();await page.evaluate(()=>document.fonts.ready);};
  const insights=(q='')=>open(q,'/placement/insights');

  // Home on the glass surface: rate with three more numbers, activity, drives, attention, notices, status.
  for(const theme of ['light','dark']) for(const width of [1600,1440,1280,1024,768,390]){
   await page.setViewportSize({width,height:900});await open();await page.evaluate(t=>localStorage.setItem('dsu-placement-theme',t),theme);await page.reload();await page.locator('.po-'+theme).waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Overflow ${theme} ${width}`);
   assert.equal(await page.locator('.gw-root.po-glass .gw-room, .gw-room-shade').count(),0,'no background photo on Home');
   assert.equal(await page.locator('.po-glass-rate .gw-balance-value').innerText(),'0.00%');
   assert.equal(await page.locator('.po-glass-kpis li').count(),3,'rate plus three headline numbers');
   assert.equal(await page.locator('.po-overview-secondary').count(),0,'secondary metrics live in Insights');
   assert.equal(await page.locator('.po-overview-charts, .po-overview-support, .po-donut').count(),0,'analysis lives in Insights');
   assert.equal(await page.locator('.po-glass-tone-placed .gw-goal-track i').evaluate(e=>e.getBoundingClientRect().width),0,'zero placed track must not draw');
   assert.ok(await page.locator('.po-glass-activity').getByText('No placement activity yet').isVisible(),'empty activity is said, not drawn');
   assert.ok(await page.locator('.po-attention').getByText('Drive date has passed. Review recorded status.').isVisible());
   assert.ok(await page.locator('.dsu-notices').isVisible(),'notifications stay on Home');
   assert.equal(await page.locator('.po-home-status [role=progressbar]').count(),4,'placement status tracks on Home');
   for(const s of ['.po-glass-main .gw-view-heading h1','.po-glass-kpis strong','.gw-transaction-name strong','.po-glass-attention strong, .po-attention-clear','.gw-goal-top strong']){
    const size=await page.locator(s).first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize));assert.ok(size>=12,`${s} readable at ${size}px`);
   }
   if(width===1440){assert.ok((await page.locator('.po-glass-drives').boundingBox()).y<900,'upcoming drives above the fold');}
   await page.waitForTimeout(500);
   await page.screenshot({path:path.join(dir,`home-${theme}-${width}.png`),fullPage:true});
   await insights();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Insights overflow ${theme} ${width}`);
   assert.equal(await page.locator('.po-overview-primary article').count(),4);
   assert.equal(await page.locator('.po-overview-secondary article').count(),4);
   assert.equal(await page.locator('.po-arc.po-tone-placed').count(),0,'zero placed segment must not draw a slice');
   assert.equal(await page.locator('.po-metrics').count(),0,'no duplicated metric grid');
   assert.equal(await page.locator('.po-section-tabs a[aria-current=page]').innerText(),'Summary');
   await page.screenshot({path:path.join(dir,`insights-${theme}-${width}.png`),fullPage:true});
  }

  // Needs attention: pending company requests, and an honest note when they can't be checked.
  await page.setViewportSize({width:1440,height:900});
  await open('?requests=2');
  const pending=page.locator('.po-attention').getByRole('link',{name:/2 drive requests awaiting review/});
  assert.equal(await pending.getAttribute('href'),'/placement/drive-requests');
  await open('?requests=none');assert.ok(await page.getByText('Company drive requests could not be checked.').isVisible());
  // Home's batch picker scopes the page and keeps Insights links in step.
  await open();await page.getByLabel('Passing-out batch').selectOption('2026');await page.waitForURL('**batch=2026**');
  assert.equal(await page.locator('.po-glass-kpis a').first().getAttribute('href'),'/placement/insights?batch=2026');
  assert.equal(await page.locator('.po-glass-rate a.gw-account').getAttribute('href'),'/placement/insights?batch=2026');

  // Adjust glass: popover with presets and sliders, saved per browser, Escape returns focus.
  await open();
  const adjust=page.getByRole('button',{name:'Adjust glass'});
  const glass=page.locator('.gw-root.po-glass');
  const blur=()=>glass.evaluate(e=>e.style.getPropertyValue('--gw-blur'));
  assert.equal(await blur(),'22px');
  await adjust.click();assert.equal(await adjust.getAttribute('aria-expanded'),'true');
  const panel=page.getByRole('complementary',{name:'Glass appearance'});assert.ok(await panel.isVisible());
  assert.ok(await panel.getByRole('button',{name:'Close glass settings'}).evaluate(e=>e===document.activeElement),'focus moves into the panel');
  await panel.getByRole('slider',{name:'Blur'}).fill('8');assert.equal(await blur(),'8px');
  await panel.getByRole('button',{name:'Solid',exact:true}).click();
  assert.equal(await glass.evaluate(e=>e.style.getPropertyValue('--gw-opacity')),'0.86');
  const box=await panel.boundingBox(),trig=await adjust.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=1440,'panel stays on screen');assert.ok(box.y>=trig.y+trig.height,'panel opens below its button');
  await page.screenshot({path:path.join(dir,'home-adjust-glass.png')});
  await page.keyboard.press('Escape');assert.equal(await panel.count(),0);assert.ok(await adjust.evaluate(e=>e===document.activeElement),'focus returns to Adjust glass');
  await page.reload();await page.getByRole('heading',{name:'Placement overview',exact:true}).waitFor();
  assert.equal(await blur(),'32px','appearance is remembered');
  await adjust.click();await page.getByRole('button',{name:'Reset appearance'}).click();assert.equal(await blur(),'22px');
  await page.getByRole('button',{name:'Close glass settings'}).click();

  // Activity: monthly offers and placements, with period choices only when they differ.
  await open('?progress=yes');
  const activity=page.locator('.po-glass-activity');
  assert.deepEqual(await activity.getByRole('group',{name:'Activity period'}).getByRole('button').allInnerTexts(),['6 months','12 months','All']);
  assert.equal(await activity.getByRole('button',{name:'12 months'}).getAttribute('aria-pressed'),'true');
  const totals=()=>activity.locator('.gw-chart-summary strong').allInnerTexts();
  assert.deepEqual(await totals(),['102','90','12']);
  await activity.getByRole('button',{name:'6 months'}).click();assert.deepEqual(await totals(),['69','63','6']);
  await activity.getByRole('button',{name:'All'}).click();assert.deepEqual(await totals(),['105','91','13']);
  assert.match(await activity.getByRole('img').getAttribute('aria-label'),/Sep 2025 to Oct 2026: 105 offers recorded and 91 students placed/);
  await activity.screenshot({path:path.join(dir,'home-activity.png')});

  // Navigation: seven sections, FRIDAY in the top bar, tabs inside each section.
  await page.setViewportSize({width:390,height:844});await open();
  const menu=page.getByRole('button',{name:'Menu',exact:true});await menu.click();
  const dialog=page.getByRole('dialog');assert.ok(await dialog.isVisible());
  assert.equal(await dialog.locator('nav a').count(),7,'seven officer sections');
  await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),false);assert.ok(await menu.evaluate(e=>e===document.activeElement));
  await menu.click();await dialog.getByRole('link',{name:'Insights',exact:true}).click();await page.waitForURL(origin+'/placement/insights');assert.equal(await dialog.isVisible(),false);
  await page.screenshot({path:path.join(dir,'tabs-mobile.png')});
  await page.setViewportSize({width:1440,height:900});await open();
  await page.getByRole('button',{name:'Collapse sidebar'}).click();assert.ok(await page.locator('.po-collapsed').count());
  assert.equal(await page.locator('#placement-nav a').count(),7);
  await page.getByRole('button',{name:'Expand sidebar'}).click();
  const nav=page.locator('#placement-nav');
  const sections=['overview','drives','companies','students-ranking','offers','insights','imports'];
  assert.deepEqual(await nav.locator('a').evaluateAll(elements=>elements.map(e=>e.getAttribute('href'))),sections.map(route=>'/placement/'+route));
  assert.deepEqual(await nav.locator('a').allInnerTexts(),['Home','Drives','Companies','Students','Offers','Insights','Tools']);
  assert.equal(await page.locator('.po-topbar a[href="/placement/assistants/friday"]').innerText(),'F.R.I.D.A.Y.');
  await page.screenshot({path:path.join(dir,'navigation-desktop.png')});
  // Every original destination is still reachable: its section is active in
  // the sidebar and its own tab is active above the page.
  const destinations=[
   ['overview','overview',null],['companies','companies','companies'],['drives','drives','drives'],['drive-requests','drives','drive-requests'],
   ['offers','offers','offers'],['multiple-offers','offers','multiple-offers'],['departments','insights','departments'],['batch','insights','batch'],
   ['categories','students-ranking','categories'],['student-analytics','students-ranking','student-analytics'],['students-ranking','students-ranking','students-ranking'],
   ['company-reports','companies','company-reports'],['tests','students-ranking','tests'],['imports','imports','imports'],['student-tools','imports','student-tools'],
   ['insights','insights','insights'],['categories/advanced','students-ranking','categories'],['drives/drive-1','drives','drives'],['students/student-1','students-ranking','student-analytics'],
  ];
  for(const [route,section,tab] of destinations){
   await page.goto(origin+'/placement/'+route);await nav.waitFor();
   assert.equal(await nav.locator('a[aria-current=page]').getAttribute('href'),'/placement/'+section,route);
   if(tab){const current=page.locator('.po-section-tabs a[aria-current=page]');assert.equal(await current.getAttribute('href'),'/placement/'+tab,route);assert.ok(await current.isVisible());}
   else assert.equal(await page.locator('.po-section-tabs').count(),0,'Home has no tabs');
  }
  await page.goto(origin+'/placement/assistants/friday');await nav.waitFor();
  assert.equal(await nav.locator('a[aria-current=page]').count(),0);assert.equal(await page.locator('.po-section-tabs').count(),0);
  assert.equal(await page.locator('.po-topbar a[href="/placement/assistants/friday"]').getAttribute('aria-current'),'page');
  await page.goto(origin+'/placement/drives');await page.locator('.po-section-tabs').getByRole('link',{name:'Company requests',exact:true}).click();await page.waitForURL(origin+'/placement/drive-requests');
  assert.equal(await nav.evaluate(e=>getComputedStyle(e).scrollbarWidth),'none');
  assert.ok(await page.locator('.erp-sidebar .po-signout').isVisible());
  await page.goto(origin+'/placement/students-ranking?testing=true');await page.locator('.po-section-tabs').waitFor();
  assert.ok(await page.locator('.po-section-tabs').getByRole('link',{name:'Talent intelligence',exact:true}).isVisible(),'testing-only module is preserved');
  await page.goto(origin+'/placement/students-ranking');await page.locator('.po-section-tabs').waitFor();
  assert.equal(await page.locator('.po-section-tabs').getByRole('link',{name:'Talent intelligence',exact:true}).count(),0);

  // Insights carries the department chart, filters and supporting measures.
  await insights();
  const bars=page.locator('.po-department-chart');
  const eligible=bars.getByRole('button',{name:'CSE, Placement eligible: 455',exact:true});
  await eligible.hover();assert.ok(await bars.getByRole('tooltip').isVisible());
  assert.match(await bars.getByRole('tooltip').innerText(),/455.*70.0%/);
  await eligible.focus();await page.keyboard.press('Escape');assert.equal(await bars.getByRole('tooltip').count(),0);
  await bars.getByRole('button',{name:'CSE, Students placed: 0',exact:true}).focus();
  assert.match(await bars.getByRole('tooltip').innerText(),/Students placed: 0.*0.0%/);
  assert.equal(await bars.locator('.po-bar.po-tone-placed').first().evaluate(e=>e.getBoundingClientRect().width),0);
  for(const [theme,colors] of [['light',['rgb(98, 119, 138)','rgb(193, 138, 62)','rgb(40, 123, 97)']],['dark',['rgb(155, 176, 197)','rgb(224, 177, 107)','rgb(103, 191, 160)']]]){
   if(await page.locator('.po-'+theme).count()===0)await page.getByRole('button',{name:'Switch to '+theme+' theme'}).click();
   for(const [i,series] of ['total','eligible','placed'].entries()){
    const style=await bars.locator('.po-bar.po-tone-'+series).first().evaluate(e=>({color:getComputedStyle(e).backgroundColor,image:getComputedStyle(e).backgroundImage}));
    assert.equal(style.color,colors[i]);assert.equal(style.image,'none');
   }
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await bars.locator('.po-bar').first().evaluate(e=>getComputedStyle(e).animationName),'none');
  assert.equal(await bars.locator('.po-bar').first().evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await eligible.hover();
  await page.evaluate(()=>window.__updateDepartments([{department:'CSE',total:1000,eligible:675,placed:100}]));
  await bars.getByRole('button',{name:'CSE, Placement eligible: 675',exact:true}).waitFor();
  assert.match(await bars.getByRole('tooltip').innerText(),/675.*67.5%/,'tooltip uses the latest filtered data');
  assert.equal(await bars.locator('.po-bar-row').count(),1);
  await insights();
  await page.locator('.po-chart-bars').getByText('View data table',{exact:true}).click();
  assert.ok(await page.getByRole('cell',{name:'A very long department name for accessibility'}).isVisible() || await page.getByRole('rowheader',{name:'A very long department name for accessibility'}).isVisible());
  await page.getByLabel('Student name or USN').fill('matched');await page.getByLabel('Passing-out batch').selectOption('2026');await page.getByLabel('Branch',{exact:true}).selectOption('CSE');
  await page.getByRole('button',{name:'Apply filters'}).click();await page.waitForURL('**search=matched**');
  assert.equal(new URL(page.url()).pathname,'/placement/insights');
  assert.equal(new URL(page.url()).searchParams.get('batch'),'2026');assert.equal(new URL(page.url()).searchParams.get('department'),'CSE');
  await page.locator('.po-overview-primary').waitFor();assert.equal(await page.locator('.po-overview-kpi strong').first().innerText(),'1');
  assert.equal(await page.locator('.po-department-chart .po-bar-row').count(),1);
  const before=page.url();await page.getByRole('button',{name:/^Refresh/}).click();assert.equal(page.url(),before);assert.equal(await page.evaluate(()=>window.__refreshes),1);
  await page.getByRole('button',{name:'Clear',exact:true}).click();await page.waitForURL(origin+'/placement/insights');
  await insights('?search=no+match');assert.ok(await page.getByRole('heading',{name:'No students match this selection'}).isVisible());assert.equal(await page.locator('.po-overview-primary').count(),0);
  await open('?state=error');assert.ok(await page.getByText('Cohort analytics are unavailable.').isVisible());assert.equal(await page.locator('.po-glass-kpis b').nth(1).innerText(),'Not available');assert.equal(await page.locator('.po-glass-kpis b').nth(2).innerText(),'0');
  assert.ok(await page.getByRole('heading',{name:'Activity is unavailable'}).isVisible());
  assert.equal(await page.locator('.po-home-status').count(),0,'no status bar without chart data');
  await page.screenshot({path:path.join(dir,'home-partial-failure.png'),fullPage:true});
  await insights('?state=populated');assert.equal(await page.locator('.po-overview-support').getByText('No compensation data',{exact:true}).count(),0);
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'populated tables contained on mobile');
  await page.screenshot({path:path.join(dir,'insights-populated-mobile.png'),fullPage:true});
  const touchPage=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await touchPage.goto(origin+'/placement/insights');
  await touchPage.getByRole('button',{name:'CSE, Placement eligible: 455',exact:true}).tap();
  assert.match(await touchPage.getByRole('tooltip').innerText(),/455.*70.0%/);
  await touchPage.locator('.po-department-chart').screenshot({path:path.join(dir,'department-mobile.png')});
  await touchPage.close();
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,widths:[1600,1440,1280,1024,768,390],themes:['light','dark'],checks:['glass Home without a photo: rate and 3 KPIs, activity periods, drives, attention, notices, status tracks','Adjust glass popover, persistence, Escape focus return','pending and unavailable drive requests','batch picker','Insights KPIs, charts and supporting measures','zero/missing/empty states','chart values and live updates','hover, keyboard, Escape and touch tooltips','series colors and reduced motion','filters/clear/refresh','7 sections with every original route reachable through tabs','FRIDAY in the top bar','testing-only tab','mobile dialog and focus return','no browser errors'],screenshots:dir,data:'synthetic local component fixtures; no database access'}));
 } catch(e){console.error(e.stack);if(page)await page.screenshot({path:path.join(dir,'failure.png'),fullPage:true});process.exitCode=1;}
 finally{await browser?.close();await new Promise(r=>server?server.close(r):r());}
})();
