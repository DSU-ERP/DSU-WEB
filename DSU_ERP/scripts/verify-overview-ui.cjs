// Real dashboard and navigation with clearly synthetic, local-only fixtures.
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
import {Workspace} from '@/features/placement/components/Workspace';
const data=${JSON.stringify(report)},charts=${JSON.stringify(chart)};
const query=Object.fromEntries(new URLSearchParams(location.search));
if(query.search==='no match'){data.summary.students=0;charts.kpis.totalStudents=0;charts.status=[];charts.departments=[];}
if(query.search==='matched'){data.summary.students=1;charts.kpis.totalStudents=1;charts.kpis.eligible=1;charts.status=[{key:'eligible_not_placed',label:'Eligible, not placed',count:1}];charts.departments=[{department:'CSE',total:1,eligible:1,placed:0}];}
if(query.state==='populated'){data.recent=[{id:'offer-1',student_id:'student-1',name:'Fixture Student',usn:'TEST001',company:'Fixture Recruiting Company',title:'Graduate engineer',package_lpa:8,status:'accepted',department:'CSE',batch:'2026',category:'regular',active:true}];data.companies=[{name:'Fixture Recruiting Company',offers:1,hired:1,accepted:1,average:8}];data.summary.average=8;data.summary.highest=8;data.summary.median=8;}
function Fixture(){const [liveCharts,setCharts]=React.useState(charts);window.__updateDepartments=rows=>setCharts(previous=>({...previous,departments:rows}));return <Workspace competencyTesting={query.testing==='true'}><PlacementOverview data={data} charts={query.state==='error'?null:liveCharts} query={query} today='2026-10-26' environment='Visual QA · synthetic fixtures'/></Workspace>}
createRoot(document.getElementById('root')).render(<Fixture/>);`;
const mocks={
 'next/link':`import React from 'react';export default function Link({children,prefetch,scroll,...props}){return <a {...props}>{children}</a>}`,
 'next/navigation':`const router={push:path=>location.assign(path),refresh:()=>{window.__refreshes=(window.__refreshes||0)+1}};export const useRouter=()=>router;export const usePathname=()=>location.pathname;`,
 '@/app/login/actions':`export async function signOut(){}`,
 '@/app/placement/actions':`export async function changePlacement(){return {error:''}}`,
};
const css='*{box-sizing:border-box}body,h1,h2,h3,p,dl,dd{margin:0}a{color:inherit;text-decoration:none}button{cursor:pointer}'+[
 'src/app/globals.css','src/app/workspace.css','src/app/placement/placement.css','src/app/placement/overview.css',
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
  const open=async(q='')=>{await page.goto(origin+'/placement/overview'+q);await page.getByRole('heading',{name:'Placement overview',exact:true}).waitFor();await page.evaluate(()=>document.fonts.ready);};
  for(const theme of ['light','dark']) for(const width of [1600,1440,1280,1024,768,390]){
   await page.setViewportSize({width,height:900});await open();await page.evaluate(t=>localStorage.setItem('dsu-placement-theme',t),theme);await page.reload();await page.locator('.po-'+theme).waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Overflow ${theme} ${width}`);
   assert.equal(await page.locator('.po-overview-primary article').count(),4);
   assert.equal(await page.locator('.po-overview-secondary article').count(),4);
   assert.equal(await page.locator('.po-arc.po-tone-placed').count(),0,'zero placed segment must not draw a slice');
   assert.ok(await page.getByText('Drive date has passed. Review recorded status.').isVisible());
   assert.equal(await page.locator('.po-metrics').count(),0,'no duplicated metric grid');
   if(width===1440){assert.ok((await page.locator('.po-overview-charts').boundingBox()).y<750,'analytics above fold');}
   await page.screenshot({path:path.join(dir,`overview-${theme}-${width}.png`),fullPage:true});
   if([1440,390].includes(width))await page.screenshot({path:path.join(dir,`overview-${theme}-${width}-viewport.png`)});
  }
  await page.setViewportSize({width:390,height:844});await open();
  const menu=page.getByRole('button',{name:'Menu',exact:true});await menu.click();
  const dialog=page.getByRole('dialog');assert.ok(await dialog.isVisible());
  assert.equal(await dialog.locator('nav a').count(),15,'all normal-runtime officer routes are preserved');
  await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),false);assert.ok(await menu.evaluate(e=>e===document.activeElement));
  await menu.click();await dialog.getByRole('link',{name:'Placement overview',exact:true}).click();await page.locator('.po-overview').waitFor();assert.equal(await dialog.isVisible(),false);
  await page.setViewportSize({width:1440,height:900});await open();
  await page.getByRole('button',{name:'Collapse sidebar'}).click();assert.ok(await page.locator('.po-collapsed').count());
  assert.equal(await page.locator('#placement-nav a').count(),15);
  await page.getByRole('button',{name:'Expand sidebar'}).click();
  await page.screenshot({path:path.join(dir,'navigation-offers-expanded.png')});
  const routes=['assistants/friday','overview','companies','drives','offers','multiple-offers','departments','batch','categories','student-analytics','students-ranking','company-reports','tests','imports','student-tools'];
  const nav=page.locator('#placement-nav');
  assert.deepEqual(await nav.locator('a').evaluateAll(elements=>elements.map(e=>e.getAttribute('href'))),routes.map(route=>'/placement/'+route));
  assert.equal(await nav.locator('a').first().innerText(),'F.R.I.D.A.Y.');
  for(const name of ['Offers & Placements','Department Intelligence']){
   const toggle=nav.getByRole('button',{name,exact:true});
   assert.equal(await toggle.getAttribute('aria-expanded'),'false');
   await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
   const children=page.locator('#'+await toggle.getAttribute('aria-controls'));
   assert.ok(await children.isVisible());
   await toggle.click();assert.equal(await children.isVisible(),false);
   assert.equal(await children.getByRole('link').count(),0,'collapsed children are removed from the accessibility tree');
  }
  // Every original destination remains in the shell and reveals its active group on a direct visit.
  // The fixture renders the real shell at each URL, not the authenticated route loader.
  for(const route of routes){
   await page.goto(origin+'/placement/'+route);await page.locator('#placement-nav').waitFor();
   const current=page.locator('#placement-nav a[aria-current=page]');
   assert.equal(await current.getAttribute('href'),'/placement/'+route);assert.ok(await current.isVisible());
   await current.click();await page.waitForURL(origin+'/placement/'+route);
  }
  await page.goto(origin+'/placement/categories/advanced');await page.locator('#placement-nav').waitFor();
  assert.equal(await page.locator('#placement-nav').getByRole('button',{name:'Department Intelligence',exact:true}).getAttribute('aria-expanded'),'true');
  await open();
  await page.getByRole('button',{name:'Collapse sidebar'}).click();
  await nav.getByRole('button',{name:'Offers & Placements',exact:true}).click();
  assert.ok(await nav.getByRole('link',{name:'Multiple-offer tracking',exact:true}).isVisible());
  await page.getByRole('button',{name:'Expand sidebar'}).click();
  await page.setViewportSize({width:1024,height:500});
  await nav.getByRole('button',{name:'Department Intelligence',exact:true}).click();
  await page.screenshot({path:path.join(dir,'navigation-short-viewport.png')});
  assert.equal(await nav.evaluate(e=>getComputedStyle(e).scrollbarWidth),'none');
  assert.ok(await nav.evaluate(e=>e.scrollHeight>e.clientHeight));
  await nav.hover();await page.mouse.wheel(0,600);await page.waitForTimeout(200);
  assert.ok(await nav.evaluate(e=>e.scrollTop>0),'wheel scrolling preserved');
  await nav.getByRole('link',{name:'F.R.I.D.A.Y.',exact:true}).focus();
  assert.equal(await nav.evaluate(e=>e.scrollTop),0,'keyboard focus scrolls hidden links into view');
  assert.ok(await page.locator('.erp-sidebar .po-signout').isVisible());
  await page.setViewportSize({width:1440,height:900});await open();
  const bars=page.locator('.po-department-chart');
  const eligible=bars.getByRole('button',{name:'CSE, Placement eligible: 455',exact:true});
  await eligible.hover();assert.ok(await bars.getByRole('tooltip').isVisible());
  assert.match(await bars.getByRole('tooltip').innerText(),/455.*70.0%/);
  await eligible.focus();await page.keyboard.press('Escape');assert.equal(await bars.getByRole('tooltip').count(),0);
  await bars.getByRole('button',{name:'CSE, Students placed: 0',exact:true}).focus();
  assert.match(await bars.getByRole('tooltip').innerText(),/Students placed: 0.*0.0%/);
  assert.equal(await bars.locator('.po-bar.po-tone-placed').first().evaluate(e=>e.getBoundingClientRect().width),0);
  for(const [theme,colors] of [['light',['rgb(98, 119, 138)','rgb(193, 138, 62)','rgb(40, 123, 97)']],['dark',['rgb(155, 176, 197)','rgb(224, 177, 107)','rgb(103, 191, 160)']]]){
   if(await page.locator('.po-'+theme).count()===0)await page.getByRole('button',{name:'Use '+theme+' theme'}).click();
   for(const [i,series] of ['total','eligible','placed'].entries()){
    const style=await bars.locator('.po-bar.po-tone-'+series).first().evaluate(e=>({color:getComputedStyle(e).backgroundColor,image:getComputedStyle(e).backgroundImage}));
    assert.equal(style.color,colors[i]);assert.equal(style.image,'none');
   }
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await bars.locator('.po-bar').first().evaluate(e=>getComputedStyle(e).animationName),'none');
  assert.equal(await bars.locator('.po-bar').first().evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await eligible.hover();await page.screenshot({path:path.join(dir,'department-tooltip-desktop.png'),fullPage:true});
  await page.evaluate(()=>window.__updateDepartments([{department:'CSE',total:1000,eligible:675,placed:100}]));
  await bars.getByRole('button',{name:'CSE, Placement eligible: 675',exact:true}).waitFor();
  assert.match(await bars.getByRole('tooltip').innerText(),/675.*67.5%/,'tooltip uses the latest filtered data');
  assert.equal(await bars.locator('.po-bar-row').count(),1);
  await open();
  await page.locator('.po-chart-bars').getByText('View data table',{exact:true}).click();
  assert.ok(await page.getByRole('cell',{name:'A very long department name for accessibility'}).isVisible() || await page.getByRole('rowheader',{name:'A very long department name for accessibility'}).isVisible());
  await page.getByLabel('Student name or USN').fill('matched');await page.getByLabel('Passing-out batch').selectOption('2026');await page.getByLabel('Branch',{exact:true}).selectOption('CSE');
  await page.getByRole('button',{name:'Apply filters'}).click();await page.waitForURL('**search=matched**');
  assert.equal(new URL(page.url()).searchParams.get('batch'),'2026');assert.equal(new URL(page.url()).searchParams.get('department'),'CSE');
  await page.locator('.po-overview-primary').waitFor();assert.equal(await page.locator('.po-overview-kpi strong').first().innerText(),'1');
  assert.equal(await page.locator('.po-department-chart .po-bar-row').count(),1);
  await page.locator('.po-department-chart').getByRole('button',{name:'CSE, Placement eligible: 1',exact:true}).focus();
  assert.match(await page.getByRole('tooltip').innerText(),/100.0%/);
  const before=page.url();await page.getByRole('button',{name:/^Refresh/}).click();assert.equal(page.url(),before);assert.equal(await page.evaluate(()=>window.__refreshes),1);
  await page.getByRole('button',{name:'Clear',exact:true}).click();await page.waitForURL(origin+'/placement/overview');
  await open('?search=no+match');assert.ok(await page.getByRole('heading',{name:'No students match this selection'}).isVisible());assert.equal(await page.locator('.po-overview-primary').count(),0);
  await open('?state=error');assert.ok(await page.getByText('Cohort analytics are unavailable.').isVisible());assert.equal(await page.locator('.po-overview-kpi strong').nth(1).innerText(),'Not available');assert.equal(await page.locator('.po-overview-kpi strong').nth(2).innerText(),'0');
  await page.screenshot({path:path.join(dir,'overview-partial-failure.png'),fullPage:true});
  await open('?state=populated');assert.ok(await page.getByRole('link',{name:/TEST001/}).isVisible());assert.equal(await page.locator('.po-overview-support').getByText('No compensation data',{exact:true}).count(),0);
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'populated tables contained on mobile');
  await page.screenshot({path:path.join(dir,'overview-populated-mobile.png'),fullPage:true});
  await open('?testing=true');await page.getByRole('button',{name:'Menu',exact:true}).click();
  assert.equal(await page.locator('#placement-mobile-nav a').count(),16,'testing-only module is preserved');
  await page.locator('#placement-mobile-nav').getByRole('button',{name:'Department Intelligence',exact:true}).click();
  assert.ok(await page.getByRole('dialog').getByRole('link',{name:'Student analytics',exact:true}).isVisible());
  await page.screenshot({path:path.join(dir,'navigation-mobile-expanded.png')});
  await page.getByRole('button',{name:'Close menu'}).click();
  const touchPage=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await touchPage.goto(origin+'/placement/overview');
  await touchPage.getByRole('button',{name:'CSE, Placement eligible: 455',exact:true}).tap();
  assert.match(await touchPage.getByRole('tooltip').innerText(),/455.*70.0%/);
  await touchPage.locator('.po-department-chart').screenshot({path:path.join(dir,'department-mobile.png')});
  await touchPage.close();
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,widths:[1600,1440,1280,1024,768,390],themes:['light','dark'],checks:['KPI hierarchy','zero/missing/empty states','chart values and live updates','hover, keyboard, Escape and touch tooltips','series colors and reduced motion','past drive warning','filters/clear/refresh','15 preserved routes and testing-only link','collapsible groups and active nested routes','hidden scrollbar with wheel and keyboard scrolling','mobile dialog and focus return','populated tables','no browser errors'],screenshots:dir,data:'synthetic local component fixtures; no database access'}));
 } catch(e){console.error(e.stack);if(page)await page.screenshot({path:path.join(dir,'failure.png'),fullPage:true});process.exitCode=1;}
 finally{await browser?.close();await new Promise(r=>server?server.close(r):r());}
})();
