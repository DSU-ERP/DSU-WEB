import {NextRequest} from 'next/server';
import {backendApi} from '@/shared/http/backend';
import {userSession} from '@/shared/auth/session';
import {sameOrigin} from '@/features/placement/lib/request';
import {competencyTestingEnabled} from '@/features/competency/server';
import {CampusError} from '@/shared/http/errors';
const paths:Record<string,string>={catalog:'/competency/catalog',student:'/student/career-intelligence',overview:'/placement/talent-intelligence',cohort:'/placement/talent-intelligence/cohort',evidence:'/student/career-intelligence/evidence',corrections:'/student/career-intelligence/corrections',review:'/placement/talent-intelligence/review',assess:'/placement/talent-intelligence/assess',rubrics:'/placement/talent-intelligence/rubrics',templates:'/placement/talent-intelligence/templates',recalculate:'/placement/talent-intelligence/recalculate',shortlists:'/placement/talent-intelligence/shortlists','shortlists/decision':'/placement/talent-intelligence/shortlists/decision',extract:'/competency/extract'};
async function handle(req:NextRequest,{params}:{params:Promise<{path:string[]}>}){
 if(!competencyTestingEnabled())return Response.json({error:'Not found'},{status:404});
 if(req.method==='POST'&&!sameOrigin(req))return Response.json({error:'Invalid request origin.'},{status:403});
 const {path}=await params,key=path.join('/');let target=paths[key];
 if(key==='documents')target='/student/career-intelligence/documents';
 if(key==='import-platforms')target='/student/career-intelligence/import-platforms';
 if(req.method==='GET'&&path.length===2&&/^[\da-f-]{36}$/i.test(path[1])){
  if(path[0]==='profile')target='/placement/talent-intelligence/student/'+path[1];
  if(path[0]==='template')target='/competency/templates/'+path[1];
  if(path[0]==='artifact')target='/competency/artifact/'+path[1];
 }
 if(!target)return Response.json({error:'Unknown resource.'},{status:404});
 try{
  const session=await userSession();
  let body:string|undefined;
  if(req.method==='POST'){
   const reader=req.body?.getReader();if(!reader)return Response.json({error:'Request is empty.'},{status:400});
   const chunks:Uint8Array[]=[];let size=0;
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>128000){await reader.cancel();return Response.json({error:'Use a smaller work sample.'},{status:413});}chunks.push(value);}
   body=Buffer.concat(chunks).toString('utf8');JSON.parse(body);
  }
  return Response.json(await backendApi(target+(req.method==='GET'?req.nextUrl.search:''),{method:req.method as 'GET'|'POST',body,session,timeoutMs:key==='extract'?75000:45000}),{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return Response.json({error:e instanceof CampusError?e.message:'The request could not be completed.'},{status:e instanceof CampusError?e.status:400});}
}
export {handle as GET,handle as POST};
