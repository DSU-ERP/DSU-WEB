import {spawn} from 'node:child_process';
if(process.env.COMPETENCY_TESTING!=='true'||process.env.DSU_ENVIRONMENT!=='testing'||process.env.NEXT_PUBLIC_SUPABASE_URL!=='https://bsiibnoqfuyxieogions.supabase.co')throw new Error('Use the dedicated competency testing environment.');
if(process.env.DSU_BACKEND_URL!=='http://127.0.0.1:4101')throw new Error('Testing must use the dedicated local backend on port 4101.');
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','-p','4100'],{stdio:'inherit',windowsHide:true,env:{...process.env,DSU_NEXT_DIST_DIR:'.next-competency-testing'}});
child.on('exit',code=>{process.exitCode=code??1;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
