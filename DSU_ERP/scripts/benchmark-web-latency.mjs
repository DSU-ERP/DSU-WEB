// An isolated production smoke/latency check. No login or student data is used;
// API timings measure only anonymous rejection, not authenticated database work.
import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
const dist = process.argv.find(v => v.startsWith('--dist='))?.slice(7);
if (!dist) throw Error('Pass --dist=<existing isolated production build directory>.');
const root = process.cwd(), target = path.resolve(root, dist);
if (!target.startsWith(root + path.sep)) throw Error('Build directory must be inside this workspace.');
await access(path.join(target, 'BUILD_ID'));
const port = 3012, origin = `http://127.0.0.1:${port}`;
try { await fetch(origin, {signal: AbortSignal.timeout(500)});throw Error('Port 3012 is already in use.'); }
catch(error) { if(error.message === 'Port 3012 is already in use.')throw error; }
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
  cwd: root, env: {...process.env, DSU_NEXT_DIST_DIR: dist}, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
});
let failed = false;
child.on('exit', code => { if(code)failed = true; });
child.stderr.on('data', chunk => { process.stderr.write(chunk); });
try {
  let ready = false;
  for(let i=0;i<60;i++) {
    if(failed)throw Error('Isolated production server exited before readiness.');
    try { const response=await fetch(origin+'/login',{signal:AbortSignal.timeout(1000)});await response.body?.cancel();if(response.ok){ready=true;break;} }catch{}
    await new Promise(r=>setTimeout(r,250));
  }
  if(!ready)throw Error('Isolated production server did not become ready.');
  for(let sample=0;sample<3;sample++)for(const resource of ['/login','/student/api/conversations']) {
    const started=performance.now();
    const response=await fetch(origin+resource,{redirect:'manual',signal:AbortSignal.timeout(15000)});
    const headersMs=Math.round(performance.now()-started);await response.text();
    const expected=resource==='/login'?200:401;
    if(response.status!==expected)throw Error(`Unexpected ${resource} status ${response.status}`);
    console.log(JSON.stringify({sample,path:resource,status:response.status,headersMs,totalMs:Math.round(performance.now()-started)}));
  }
} finally {
  if(child.exitCode===null){const closed=new Promise(r=>child.once('exit',r));child.kill();await closed;}
}
