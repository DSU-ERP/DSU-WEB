import 'server-only';
import {cache} from 'react';
import {backendApi} from '@/shared/http/backend';
import {signInAgain} from '@/shared/auth/session';
import {CampusError} from '@/shared/http/errors';
import {exportCsv} from './portal-contract';
import type {CategoryData} from './types';
export {CampusError} from '@/shared/http/errors';
export {userSession as campusSession} from '@/shared/auth/session';
export async function campusApi<T>(path:string,options:{method?:'GET'|'POST';body?:string}={}):Promise<T>{
 try{
   if(options.method==='POST') return await backendApi<T>(path,{...options,contentType:'text/csv'});
   const result=await backendApi<T>('/portal/read?'+new URLSearchParams({path}));
   if(/^\/student-categories\/[^/]+\/export(?:\?|$)/.test(path)) return exportCsv(result as {data:CategoryData}) as T;
   return result;
 }catch(error){if(error instanceof CampusError&&error.status===401)signInAgain(error);throw error;}
}
export type Membership={id:string;role:'admin'|'staff'|'student';studentId:string|null};
export const membership=cache(async()=>(await campusApi<{data:Membership}>('/me')).data);
