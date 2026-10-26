import 'server-only';
import {competencyTestingEnabled} from './testing-config';
import {backendApi} from '@/shared/http/backend';
import type {Catalog,Profile,Cohort} from './types';
export const COMPETENCY_TOOLS=competencyTestingEnabled()?[
 {type:'function' as const,function:{name:'competency_catalog',description:'Read the testing competency and career role catalogs. Distinguish draft and simulated configurations.',parameters:{type:'object',properties:{},additionalProperties:false}}},
 {type:'function' as const,function:{name:'competency_requirements',description:'Read versioned assessment requirements for a template returned by competency_catalog.',parameters:{type:'object',properties:{templateId:{type:'string'}},required:['templateId'],additionalProperties:false}}},
 {type:'function' as const,function:{name:'competency_profile',description:'Read authorized competency assessments, evidence provenance, role coverage and development gaps for a student found in this turn. Do not infer proficiency from CGPA or platform counts.',parameters:{type:'object',properties:{studentId:{type:'string'}},required:['studentId'],additionalProperties:false}}},
 {type:'function' as const,function:{name:'competency_comparison',description:'Read deterministic comparable cohort rankings. Always state simulation status, coverage and limitations. Never recommend a real shortlist from simulation. No hiring decisions.',parameters:{type:'object',properties:{templateId:{type:'string'},batch:{type:'string'},department:{type:'string'}},required:['templateId'],additionalProperties:false}}},
]:[];
export async function runCompetencyTool(name:string,args:Record<string,unknown>,knownStudents:Set<string>){
 if(!competencyTestingEnabled())throw new Error('Competency testing is unavailable.');
 const get=async<T,>(path:string)=>(await backendApi<{data:T}>(path)).data;
 const uuid=(value:unknown)=>{if(typeof value!=='string'||! /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value))throw new Error('Use an identifier returned by a lookup.');return value;};
 if(name==='competency_catalog')return get<Catalog>('/competency/catalog');
 if(name==='competency_requirements')return get('/competency/templates/'+uuid(args.templateId));
 if(name==='competency_profile'){
  const id=uuid(args.studentId);if(!knownStudents.has(id.toLowerCase()))throw new Error('Find this student first.');
  const p=await get<Profile>('/placement/talent-intelligence/student/'+id);
  return {notice:p.notice,competencies:p.competencies.filter(c=>c.assessments.length).map(c=>({code:c.code,name:c.name,assessments:c.assessments.map(a=>({level:a.level,status:a.status,evidenceValid:a.evidenceValid,standard:a.assessmentSet,sources:a.sources}))})),roles:p.roles.map(r=>({role:r.role_name,alignment:r.result.alignment,coverage:r.result.coverage,minimumCoverage:r.result.minimumCoverage,simulated:r.result.simulated,stale:r.stale,gaps:r.result.gaps}))};
 }
 if(name==='competency_comparison'){
  const query=new URLSearchParams({templateId:uuid(args.templateId),pageSize:'25'});
  if(args.batch!==undefined){if(typeof args.batch!=='string'||!/^20\d{2}$/.test(args.batch))throw new Error('Invalid batch');query.set('batch',args.batch);}
  if(args.department!==undefined){if(typeof args.department!=='string'||args.department.length>100)throw new Error('Invalid department');query.set('department',args.department);}
  const c=await get<Cohort>('/placement/talent-intelligence/cohort?'+query);
  for(const r of c.rows)knownStudents.add(r.studentId.toLowerCase());
  return {total:c.total,cohortTotal:c.cohortTotal,limitations:c.limitations,role:c.template.name,status:c.template.status,rows:c.rows.map(r=>({student:r.student,rank:r.rank,alignment:r.result.alignment,coverage:r.result.coverage,comparison:r.comparison,simulated:r.result.simulated}))};
 }
 throw new Error('Unknown competency tool');
}
