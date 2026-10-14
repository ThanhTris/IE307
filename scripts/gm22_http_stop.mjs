import { readFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=new URL('..',import.meta.url);const state=JSON.parse(await readFile(new URL('supabase/tests/bruno/GM-22/environments/runtime.private.json',root),'utf8'));
let response;
try { response=await fetch(state.endpoint+'/__stop',{method:'POST',headers:{'x-gm22-control':state.control},signal:AbortSignal.timeout(90000)}); }
catch(error){throw new Error('STOP_FAILED: gateway did not acknowledge stop');}
let body={};try{body=await response.json();}catch{}
if(!response.ok||body.stopped!==true) throw new Error('STOP_FAILED: '+(body.error??'gateway rejected stop'));
const python=process.platform==='win32'?'python':'python3';
if(!Array.isArray(state.guestIds)||state.guestIds.length===0) throw new Error('CLEANUP_FAILED: runtime is missing owned guest IDs');
await new Promise((resolve,reject)=>{const child=spawn(python,[fileURLToPath(new URL('scripts/gm19_http_fixture.py',root)), 'cleanup', state.namespace, ...state.guestIds],{cwd:fileURLToPath(root),stdio:['ignore','ignore','pipe']});let error='';child.stderr.on('data',chunk=>error+=chunk);child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error('CLEANUP_FAILED: '+error.trim())));});
for(const p of ['supabase/tests/bruno/GM-22/environments/Local.runtime.private.bru','supabase/tests/bruno/GM-22/environments/runtime.private.json']) await rm(new URL(p,root),{force:true});
console.log(JSON.stringify({stopped:true,cleaned:true,namespace:state.namespace}));
