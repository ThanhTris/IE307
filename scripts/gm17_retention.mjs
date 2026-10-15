/** Local GM-17 worker. No keys, remote connection, or client clock arguments. */
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runCommand, validateConfig } from './backend.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)), '..');
export async function cleanupLocal(database='postgres') {
  if (database!=='postgres' && !/^gm17_check_[0-9a-f]{16}$/.test(database)) throw new Error('Only the local app DB or disposable GM-17 DB is allowed');
  validateConfig(await readFile(resolve(root,'supabase/config.toml'),'utf8'));
  const endpoint=process.env.DOCKER_HOST ?? JSON.parse((await runCommand('docker',['context','inspect','--format','{{json .Endpoints.docker.Host}}'],{quiet:true})).trim());
  if (!endpoint.startsWith('npipe://') && !endpoint.startsWith('unix://')) throw new Error('Local Docker socket required');
  const info=JSON.parse(await runCommand('docker',['inspect','--format','{{json .}}','supabase_db_gi-cung-duoc-local'],{quiet:true}));
  if (!info.State.Running || !/^(public\.ecr\.aws\/supabase\/|ghcr\.io\/supabase\/|supabase\/)postgres:17/.test(info.Config.Image)) throw new Error('Local Supabase PostgreSQL17 required');
  return await new Promise((accept,reject)=>{
    const child=spawn('docker',['exec','-i','supabase_db_gi-cung-duoc-local','psql','-X','-U','postgres','-d',database,'-At','-v','ON_ERROR_STOP=1'],{windowsHide:true,stdio:['pipe','pipe','pipe']});
    let output=''; const timer=setTimeout(()=>child.kill(),30000);
    child.stdout.on('data',chunk=>output+=chunk);
    child.stderr.on('data',()=>{});
    child.stdin.on('error',()=>{});
    child.once('error',()=>{clearTimeout(timer);reject(new Error('Local cleanup unavailable'));});
    child.once('close',code=>{
      clearTimeout(timer);
      if(code!==0) { reject(new Error('Local cleanup failed; no raw database output emitted')); return; }
      try { accept(JSON.parse(output.trim())); } catch { reject(new Error('Unexpected cleanup result')); }
    });
    child.stdin.end('select gm17_private.cleanup();\n');
  });
}
export async function main(args=process.argv.slice(2)) {
  const once=args.length===1 && args[0]==='--once';
  const match=args.length===1 && /^--cycles=([1-9]\d?)$/.exec(args[0]);
  if(args.length && !once && !match) throw new Error('Usage: gm17_retention.mjs [--once|--cycles=1..99]');
  let stopped=false; let wake;
  const stop=()=>{stopped=true;wake?.();};
  process.once('SIGINT',stop);process.once('SIGTERM',stop);
  const max=once?1:match?Number(match[1]):Infinity;
  try {
    for(let cycle=1;cycle<=max&&!stopped;cycle++) {
      const result=await cleanupLocal();
      console.log(JSON.stringify({cycle,checkedAt:new Date().toISOString(),intervalSeconds:60,result}));
      if(cycle<max&&!stopped) await new Promise(accept=>{
        const timer=setTimeout(accept,60000);wake=()=>{clearTimeout(timer);accept();};
      });
    }
  } finally {process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
  main().catch(()=>{console.error('GM-17 worker failed; local setup/migration must be verified');process.exitCode=1;});
