export function competencyTestingEnabled(env:Record<string,string|undefined> = typeof process==='undefined'?{}:process.env){
 return env.COMPETENCY_TESTING==='true' && env.DSU_ENVIRONMENT==='testing'
   && env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/,'')==='https://bsiibnoqfuyxieogions.supabase.co';
}
