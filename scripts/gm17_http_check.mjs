/** GM-17 real JWT/PostgREST tests; raw responses/credentials never printed. */
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCommand,validateConfig,validateApiUrl } from './backend.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const flags=process.argv.slice(2);
if(flags.some(x=>!['--bruno-setup'].includes(x))) throw new Error('Only --bruno-setup is supported');
const python=process.env.GM17_PYTHON ?? 'python';
const cases=[];let key,base,status,namespace,fixtureIds,lastErrorCode,brunoPrepared=false;const guests=[];
async function request(path,token,method='GET',body) {
  const res=await fetch(base+path,{method,headers:{apikey:key,...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(15000)});
  const data=await res.json();lastErrorCode=typeof data?.code==='string'&&/^[A-Z0-9]+$/.test(data.code)?data.code:undefined;
  return {status:res.status,body:data};
}
async function check(name,work) { try { const actual=await work();cases.push({case:name,result:'Pass',...actual}); } catch(error) {cases.push({case:name,result:'Fail',errorCode:lastErrorCode,...(typeof error.actual==='number'?{actual:error.actual,expected:error.expected}:{})});throw new Error(name);}}
async function fixture(mode) { return runCommand(python,[resolve(root,'scripts/gm17_http_fixture.py'),mode,namespace,...guests.map(g=>g.user.id)],{quiet:true,timeoutMs:60000}); }
try {
  if(flags.includes('--bruno-setup')) {
    let existing=false;
    try {await access(resolve(root,'.work/gm17-bruno-state.json'));existing=true;} catch {}
    if(existing) throw new Error('Clean up the previous Bruno namespace first');
  }
  validateConfig(await readFile(resolve(root,'supabase/config.toml'),'utf8'));
  status=JSON.parse(await runCommand(process.execPath,[resolve(root,'node_modules/supabase/dist/supabase.js'),'status','--output','json','--workdir',root],{quiet:true}));
  base=validateApiUrl(status.API_URL); key=status.ANON_KEY;
  assert.equal(JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role,'anon');
  namespace=randomUUID();
  for(let i=0;i<3;i++) {
    const result=await request('/auth/v1/signup',null,'POST',{data:{display_name:'GM17 synthetic '+i,gm17_test_namespace:namespace,userId:'17000000-0000-4000-8000-000000000099'}});
    assert.equal(result.status,200);assert.equal(result.body.user.is_anonymous,true);guests.push(result.body);
  }
  fixtureIds=JSON.parse(await fixture('prepare'));
  assert.match(fixtureIds.roomId,/^[0-9a-f-]{36}$/);
  assert.match(fixtureIds.dishId,/^[0-9a-f-]{36}$/);
  const [a,b,o]=guests.map(g=>g.access_token);
  for(const [name,token,want] of [['host',a,1],['member',b,1],['outsider',o,0]]) {
    await check(name+' room projection',async()=>{const r=await request('/rest/v1/rooms?select=id,state,version',token);assert.equal(r.status,200);assert.equal(r.body.length,want);return {status:r.status,rows:r.body.length};});
    await check(name+' own ballot',async()=>{const r=await request('/rest/v1/votes?select=id,value',token);assert.equal(r.status,200);assert.equal(r.body.length,want);return {status:r.status,rows:r.body.length};});
  }
  await check('host cannot read member submission',async()=>{
    const room=(await request('/rest/v1/submissions?select=member_id',b)).body[0].member_id;
    const r=await request('/rest/v1/submissions?select=id&member_id=eq.'+room,a);assert.equal(r.status,200);assert.deepEqual(r.body,[]);return {status:200,rows:0};
  });
  for(const path of ['rooms?select=consent_snapshot','results?select=tied_choice_ids','devices?select=push_token','submissions?select=payload_hash','idempotency?select=response','events?select=id'])
    await check('private column/table denied: '+path.split('?')[0]+':'+path.split('=')[1],async()=>{const r=await request('/rest/v1/'+path,a);assert.equal(r.status,403);assert.equal(r.body.code,'42501');return {status:r.status,sqlstate:r.body.code};});
  await check('room direct update denied',async()=>{const id=(await request('/rest/v1/rooms?select=id',a)).body[0].id;const r=await request('/rest/v1/rooms?id=eq.'+id,a,'PATCH',{state:'CANCELLED'});assert.equal(r.status,403);assert.equal(r.body.code,'42501');return {status:r.status};});
  await check('dataset direct update denied',async()=>{const r=await request('/rest/v1/dishes?id=eq.17000000-0000-4000-8000-000000000099',a,'PATCH',{name:'forged'});assert.equal(r.status,403);assert.equal(r.body.code,'42501');return {status:r.status};});
  await check('anonymous private read denied',async()=>{const r=await request('/rest/v1/rooms?select=id',null);assert.equal(r.status,401);return {status:r.status};});
  await check('forged JWT denied',async()=>{const r=await request('/rest/v1/rooms?select=id','eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxNyJ9.invalid');assert.equal(r.status,401);return {status:r.status};});
  // A correctly locally signed expired synthetic token tests the real verifier;
  // this is not evidence of waiting for a GoTrue session to naturally expire.
  await check('expired synthetic signed JWT denied',async()=>{
    const header=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
    const payload=Buffer.from(JSON.stringify({sub:guests[0].user.id,role:'authenticated',aud:'authenticated',exp:1})).toString('base64url');
    const signature=createHmac('sha256',status.JWT_SECRET).update(header+'.'+payload).digest('base64url');
    const r=await request('/rest/v1/rooms?select=id',header+'.'+payload+'.'+signature);assert.equal(r.status,401);return {status:r.status};
  });
  await check('host own plus group history',async()=>{const r=await request('/rest/v1/histories?select=id,scope',a);assert.equal(r.status,200);assert.equal(r.body.length,2);return {status:200,rows:2};});
  await check('member group history only',async()=>{const r=await request('/rest/v1/histories?select=id,scope',b);assert.equal(r.status,200);assert.equal(r.body.length,1);assert.equal(r.body[0].scope,'group');return {status:200,rows:1};});
  await check('outsider history hidden',async()=>{const r=await request('/rest/v1/histories?select=id',o);assert.equal(r.status,200);assert.deepEqual(r.body,[]);return {status:200,rows:0};});
  await check('draft synthetic catalogue hidden',async()=>{
    const r=await request('/rest/v1/dishes?select=id,name',a);assert.equal(r.status,200);
    // The current local verified manifest is empty; no production seed created.
    assert.deepEqual(r.body,[]);return {status:200,rows:0};
  });
  if(flags.includes('--bruno-setup')) {
    const folder=resolve(root,'supabase/tests/bruno/GM-17/environments');await mkdir(folder,{recursive:true});await mkdir(resolve(root,'.work'),{recursive:true});
    await writeFile(resolve(folder,'Local.private.bru'),`vars {\n  baseUrl: ${base}\n  publicKey: ${key}\n}\nvars:secret [\n  hostToken,\n  memberToken,\n  outsiderToken\n]\n`,'utf8');
    // Tokens remain in an ignored local file only, never in tracked reports.
    await writeFile(resolve(folder,'Local.runtime.private.bru'),`vars {\n  baseUrl: ${base}\n  publicKey: ${key}\n  hostToken: ${a}\n  memberToken: ${b}\n  outsiderToken: ${o}\n  roomId: ${fixtureIds.roomId}\n  dishId: ${fixtureIds.dishId}\n}\n`,'utf8');
    await writeFile(resolve(root,'.work/gm17-bruno-state.json'),JSON.stringify({namespace,users:guests.map(g=>g.user.id)}),'utf8');
    brunoPrepared=true;
  }
} catch {console.error('GM-17 HTTP verification failed; credentials/raw response suppressed');process.exitCode=1;}
finally {
  if(namespace && guests.length===3 && (!brunoPrepared || process.exitCode)) {
    try {await fixture('cleanup');cases.push({case:'namespace cleanup',result:'Pass'});} catch {cases.push({case:'namespace cleanup',result:'Fail'});process.exitCode=1;}
  }
  const report={contract:'food-v1/roadmap-v2/GM-17.1',schema:'0.2.0',checkedAt:new Date().toISOString(),environment:'loopback:54321 real GoTrue JWT and PostgREST',cases,result:process.exitCode?'Fail':'Pass'};
  await mkdir(resolve(root,'docs/evidence/roadmap-v2/GM-17'),{recursive:true});
  await writeFile(resolve(root,'docs/evidence/roadmap-v2/GM-17/HTTP_CHECK.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
