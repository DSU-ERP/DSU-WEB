import 'server-only';
import {notFound} from 'next/navigation';
import {backendApi} from '@/shared/http/backend';
import {competencyTestingEnabled} from './testing-config';
export {competencyTestingEnabled} from './testing-config';
export function requireCompetencyTesting(){if(!competencyTestingEnabled())notFound();}
export async function competencyRead<T>(path:string){requireCompetencyTesting();return (await backendApi<{data:T}>(path)).data;}
