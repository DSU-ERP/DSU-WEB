const {readFileSync,mkdirSync,writeFileSync}=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const {parseEnv}=require('node:util');
const config=parseEnv(readFileSync('.env.competency-testing','utf8'));
assert.equal(config.NEXT_PUBLIC_SUPABASE_URL,'https://bsiibnoqfuyxieogions.supabase.co');
assert.equal(config.DSU_BACKEND_URL,'http://127.0.0.1:4101');
const accounts=JSON.parse(readFileSync(path.resolve('../../DSU-Backend/.local/competency-test-accounts.json'),'utf8'));
const output=path.resolve('.qa/competency-ui');mkdirSync(output,{recursive:true});
let browser;
(async()=>{
 browser=await chromium.launch({headless:true,channel:'msedge'});
 const checks=[];
 for(const role of ['officer','student']){
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  await page.route('**/*',route=>{
   const host=new URL(route.request().url()).hostname;
   if(host==='idioblehzhaibtgotfjk.supabase.co')return route.abort();
   return route.continue();
  });
  await page.goto('http://localhost:4100/login?portal='+(role==='officer'?'placement-officer':'student'));
  await page.getByLabel('University email').fill(accounts[role].email);
  await page.getByLabel('Password',{exact:true}).fill(accounts[role].password);
  await page.getByRole('button',{name:role==='officer'?'Enter placement workspace':'Enter student workspace',exact:false}).click();
  await page.waitForURL(role==='officer'?'**/placement/overview':'**/student/onboarding',{timeout:90000});
  checks.push(role+' browser login and correct workspace destination');
  if(role==='officer'){
   await page.goto('http://localhost:4100/placement/talent-intelligence');
   await page.getByRole('heading',{name:'Talent intelligence',exact:true}).waitFor({timeout:90000});
   await page.getByLabel('Find a role',{exact:true}).fill('Software Development Engineer');
   const options=page.getByLabel('Role and assessment version');
   const simulated=await options.locator('option').evaluateAll(items=>items.find(item=>item.textContent.includes('simulated'))?.value);
   assert.ok(simulated);await options.selectOption(simulated);
   await page.getByLabel('Minimum coverage (%)',{exact:true}).fill('100');
   await page.getByRole('button',{name:'Compare cohort',exact:true}).click();
   await page.getByText(/matching students from a cohort of 100/).waitFor({timeout:60000});
   await page.screenshot({path:path.join(output,'live-officer-desktop.png'),caret:'initial'});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   checks.push('live officer Talent Intelligence screen and authorized cohort query');
  }else{
   const response=await context.request.get('http://localhost:4100/api/competency/student');
   assert.equal(response.status(),200);
   assert.equal((await response.json()).data.identity.id,accounts.student.studentId);
   await page.goto('http://localhost:4100/student/career-intelligence');
   await page.waitForURL('**/student/onboarding',{timeout:60000});
   checks.push('student owns the returned data; existing onboarding gate is preserved');
  }
  await context.close();
 }
 const report={passed:true,checks,studentPageRequiresOnboarding:true};
 writeFileSync(path.join(output,'live-logins.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(async()=>browser?.close());
