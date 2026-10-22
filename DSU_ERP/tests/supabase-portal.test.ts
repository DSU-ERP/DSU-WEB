import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { exportCsv, portalRequest, supabaseReadError } from "../src/features/campus/lib/portal-contract";
import type { CategoryData } from "../src/features/campus/lib/types";

test("portal paths become Supabase RPC arguments with literal filter values", () => {
  assert.deepEqual(portalRequest("/analytics?search=A%26B%25&batch=2023"), {
    request_path: "/analytics", query: { search: "A&B%", batch: "2023" },
  });
  assert.throws(() => portalRequest("//attacker.invalid/me"));
  assert.throws(() => portalRequest("https://attacker.invalid/me"));
});

test("Supabase failures preserve authorization, not-found and deployment distinctions", () => {
  assert.equal(supabaseReadError("PT403").status,403);
  assert.equal(supabaseReadError("PT404").status,404);
  assert.equal(supabaseReadError("PT429").status,429);
  assert.match(supabaseReadError("PGRST202").message,/update has not been installed/);
  assert.equal(supabaseReadError("unknown").status,503);
});

test("Supabase exports preserve exact CGPA strings and neutralize spreadsheet formulas", () => {
  const data = {category:{id:"medium",name:"Medium",conditionLabel:"6.75 to below 8.50"},
    students:[{rank:1,enrollment_no:"=FORMULA()",full_name:'A "name"',department_short_name:null,
      source_batch:"2023",cgpa:"8.499999999999999999",placement_eligible:true}]} as CategoryData;
  const result = exportCsv({data}).data;
  assert.equal(result.rows,1);
  assert.match(result.content,/'=FORMULA\(\)/);
  assert.match(result.content,/8\.499999999999999999/);
  assert.match(result.content,/A ""name""/);
  assert.match(result.content,/"Eligible"/);
});

test("campus, placement and student data use the authenticated backend boundary",()=>{
 const campus=readFileSync('src/features/campus/lib/api.ts','utf8');
 const placement=readFileSync('src/features/placement/lib/server.ts','utf8');
 const student=readFileSync('src/features/student/lib/server.ts','utf8');
 for(const source of [campus,placement,student]){assert.match(source,/backendApi/);assert.doesNotMatch(source,/\.rpc\(/);}
 const backend=readFileSync('src/shared/http/backend.ts','utf8');
 assert.match(backend,/Bearer/);assert.match(backend,/no-store/);
 assert.doesNotMatch(backend,/DATABASE_URL|SERVICE_ROLE/);
});
