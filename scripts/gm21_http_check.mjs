/** GM-21 real JWT + private disposable PostgREST. No credentials in artifacts/logs. */
import assert from 'node:assert/strict';
import { createHmac, randomUUID, createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { mkdir,writeFile } from 'node:fs/promises';
import { dirname,resolve,sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCommand,cliArgs,validateConfig,validateApiUrl } from './backend.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const python=process.env.GM21_PYTHON ?? (process.platform==='win32'?'python':'python3');
const reportFolder=resolve(root,'docs/evidence/roadmap-v2/GM-21/gm20-integration');
if(process.argv.length>2) throw Error('Local-only runner has no remote/deploy options');
const require=createRequire(import.meta.url),ts=require(resolve(root,'mobile/node_modules/typescript'));
require.extensions['.ts']=(module,path)=> {
  if(!path.startsWith(resolve(root,'mobile/src')+sep)) throw Error('Mobile source only');
  module._compile(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,path);
};
const {createApiClient}=require(resolve(root,'mobile/src/data/api'));
const sources=['scripts/gm21_http_check.mjs','scripts/gm21_http_fixture.py','scripts/gm21_history_check.py',
  'supabase/migrations/0021_history.sql','supabase/migrations/0024_history_integration.sql','supabase/migrations/0004_access_policies.sql',
  'mobile/src/data/api/client.ts','mobile/src/data/api/contracts.ts','mobile/src/data/api/responseGuards.ts'];
const hashes=()=>Object.fromEntries(sources.map(p=>[p,createHash('sha256').update(readFileSync(resolve(root,p))).digest('hex')]));
const sourceHashes=hashes(),cases=[],guests=[];const namespace=randomUUID();
const container='gm21-http-'+namespace.replaceAll('-','').slice(0,16);
let key,authBase,base,status,dbInfo,ids,containerCreated=false,gateway,stage='setup';
const report={result:'Fail',contract:'food-v1/roadmap-v2/GM-21.2',schemaVersion:'0.6.0',
  checkedAt:new Date().toISOString(),environment:'loopback GoTrue + process-owned DB/PostgREST; mobile real client',
  fixtureOnly:true,finalizeIntegration:'Separate lifecycle runner; this suite covers independent APIs',publicationPerformed:false,cases,artifactHashes:sourceHashes};
async function docker(args,env={}) {
  return new Promise((accept,reject)=>{
    const child=spawn('docker',args,{env:{...process.env,...env},shell:false,stdio:['ignore','pipe','pipe']});
    let output='';child.stdout.on('data',c=>{output+=c;});child.stderr.on('data',()=>{});
    child.on('error',()=>reject(Error('Docker unavailable')));child.on('close',c=>c===0?accept(output):reject(Error('Docker action failed; details suppressed')));
  });
}
async function fixture(mode) {
  return JSON.parse(await runCommand(python,[resolve(root,'scripts/gm21_http_fixture.py'),mode,namespace,...guests.map(g=>g.user.id)],{quiet:true,timeoutMs:180000}));
}
async function request(url,path,token,body) {
  const response=await fetch(url+path,{method:'POST',headers:{apikey:key,...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},
    body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(20000)});
  return {status:response.status,body:await response.json()};
}
async function check(name,work) {
  try { const actual=await work();cases.push({case:name,result:'Pass',...actual});console.log('Pass:',name); }
  catch(error) { cases.push({case:name,result:'Fail',...(error?.safeCode?{errorCode:error.safeCode}:{})});throw Error(name); }
}
try {
  validateConfig(readFileSync(resolve(root,'supabase/config.toml'),'utf8'));
  status=JSON.parse(await runCommand(process.execPath,cliArgs('status'),{quiet:true}));
  authBase=validateApiUrl(status.API_URL);key=status.ANON_KEY;
  const dbUrl=new URL(status.DB_URL);assert.ok(['127.0.0.1','localhost'].includes(dbUrl.hostname)&&dbUrl.port==='54322');
  for(let i=0;i<3;i++) {
    const guest=await request(authBase,'/auth/v1/signup',null,{data:{display_name:'GM21 synthetic '+i,gm21_test_namespace:namespace}});
    assert.equal(guest.status,200);assert.equal(guest.body.user.is_anonymous,true);guests.push(guest.body);
  }
  stage='create disposable DB';dbInfo=await fixture('create');ids=dbInfo;
  const restInfo=JSON.parse(await docker(['inspect','supabase_rest_gi-cung-duoc-local']));
  const network=Object.keys(restInfo[0].NetworkSettings.Networks)[0];
  assert.ok(network.includes('gi-cung-duoc-local'));assert.ok(restInfo[0].Config.Image.includes('postgrest'));
  dbUrl.hostname='supabase_db_gi-cung-duoc-local';dbUrl.port='5432';dbUrl.pathname='/'+dbInfo.database;
  await docker(['run','--rm','--pull','never','-d','--name',container,'--network',network,'-p','127.0.0.1::3000',
    '-e','PGRST_DB_URI','-e','PGRST_JWT_SECRET','-e','PGRST_DB_ANON_ROLE=anon','-e','PGRST_DB_SCHEMAS=public',restInfo[0].Config.Image],
    {PGRST_DB_URI:dbUrl.toString(),PGRST_JWT_SECRET:restInfo[0].Config.Env.find(v=>v.startsWith('PGRST_JWT_SECRET=')).slice('PGRST_JWT_SECRET='.length)});containerCreated=true;
  const binding=JSON.parse(await docker(['inspect',container]))[0].NetworkSettings.Ports['3000/tcp'][0];
  assert.equal(binding.HostIp,'127.0.0.1');base='http://127.0.0.1:'+binding.HostPort;
  for(let i=0;i<40;i++) {
    try {const r=await fetch(base+'/',{signal:AbortSignal.timeout(1000)});if(r.ok) break;}catch {}
    if(i===39) throw Error('PostgREST did not start');await new Promise(r=>setTimeout(r,250));
  }
  const restBase=base;
  // Real loopback HTTP gateway supplies the same /rest/v1 prefix as Kong.
  // Only URL routing changes; request/auth/response and the actual client stay real.
  gateway=createServer(async(req,res)=>{
    try {
      const chunks=[];for await(const chunk of req) chunks.push(chunk);
      const path=req.url.replace(/^\/rest\/v1(?=\/)/,'');
      const response=await fetch(restBase+path,{method:req.method,headers:{
        'Content-Type':'application/json',...(req.headers.authorization?{Authorization:req.headers.authorization}:{})},
        body:req.method==='GET'?undefined:Buffer.concat(chunks),redirect:'error',signal:AbortSignal.timeout(20000)});
      res.writeHead(response.status,{'Content-Type':'application/json'});res.end(await response.text());
    }catch {res.writeHead(502);res.end('{}');}
  });
  await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));
  base='http://127.0.0.1:'+gateway.address().port;
  const [host,member,outsider]=guests.map(g=>g.access_token);
  const client=createApiClient('real',{baseUrl:base,publicKey:key,initialToken:host});
  const peer=createApiClient('real',{baseUrl:base,publicKey:key,initialToken:member});
  const other=createApiClient('real',{baseUrl:base,publicKey:key,initialToken:outsider});
  const before=await fixture('capture');
  await check('real mobile client reads own personal history DTO',async()=>{const r=await client.getHistory('personal');assert.equal(r.ok,true);assert.equal(r.data.length,1);assert.equal(r.data[0].id,ids.personalId);return {rows:1};});
  await check('group members read the same group summary',async()=>{const a=await client.getHistory('group'),b=await peer.getHistory('group');assert.equal(a.ok,true);assert.deepEqual(a,b);assert.equal(a.data.length,1);return {rows:1};});
  await check('outsider cannot read other group summaries',async()=>{const r=await other.getHistory('group');assert.equal(r.ok,true);assert.deepEqual(r.data,[]);return {rows:0};});
  await check('forged cursor cannot select other users history',async()=>{const r=await other.getHistory('group',ids.groupId);assert.equal(r.ok,false);assert.equal(r.error.messageKey,'INVALID_INPUT');return {messageKey:r.error.messageKey};});
  await check('wrong scope rejected with400',async()=>{const r=await request(base,'/rpc/get_history',host,{scope:'other',cursor:null});assert.equal(r.status,400);assert.equal(r.body.messageKey,'INVALID_INPUT');return {status:400};});
  for(const [name,token] of [['missing JWT',null],['forged JWT','eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxNyJ9.invalid']])
    await check(name+' denied',async()=>{const r=await request(base,'/rpc/get_history',token,{scope:'personal'});assert.equal(r.status,401);return {status:401};});
  await check('real client default opaque requestId accepted',async()=>{const r=await client.updateHistoryConsent({scope:'personal',consent:true});assert.equal(r.ok,true);assert.ok(r.requestId.startsWith('req_'));return {defaultRequestIdAccepted:true};});
  const req='req_gm21_concurrent';
  await check('concurrent identical writes apply once and replay same ACK',async()=>{
    const first=await fixture('stats');const rows=await Promise.all(Array.from({length:8},()=>client.updateHistoryConsent({scope:'personal',consent:true,requestId:req})));
    assert.ok(rows.every(r=>r.ok));for(const row of rows) assert.deepEqual(row,rows[0]);const last=await fixture('stats');assert.equal(last.personalSettingVersion,first.personalSettingVersion+1);return {concurrentRequests:8,mutations:1};
  });
  await check('same requestId changed payload maps REQUEST_ID_REUSED',async()=>{const r=await client.updateHistoryConsent({scope:'personal',consent:false,requestId:req});assert.equal(r.ok,false);assert.equal(r.error.messageKey,'REQUEST_ID_REUSED');return {messageKey:r.error.messageKey};});
  await check('boolean string input rejected',async()=>{const r=await request(base,'/rpc/update_history_consent',host,{requestId:'req_bad_bool',scope:'group',consent:'true'});assert.equal(r.status,400);return {status:400};});
  await check('other-owner and missing-ID deletion are indistinguishable no-ops',async()=>{
    const a=await other.deleteHistory(ids.personalId,'req_foreign'),b=await other.deleteHistory(randomUUID(),'req_missing');assert.equal(a.ok,true);assert.equal(b.ok,true);const own=await client.getHistory('personal');assert.equal(own.ok,true);assert.equal(own.data.length,1);return {ownerRowsUnchanged:1};
  });
  const retained=await fixture('retention');
  await check('authentic summary remains readable after operational room cleanup',async()=>{const r=await client.getHistory('group');assert.equal(r.ok,true);assert.ok(r.data.some(row=>row.roomId===retained.roomId&&row.roomCode.length===6));return {operationalRoomDeleted:true,summaryReadable:true};});
  await check('history projection has no raw consent/roster/groupKey/location/ballot',async()=>{const r=await request(base,'/rpc/get_history',host,{scope:'group',cursor:null});const body=JSON.stringify(r.body);for(const field of ['groupKey','memberUserIds','consentIds','votes','anchorId','GPS','mood','lat','lng'])assert.ok(!body.includes('"'+field+'"'));return {privateFields:0};});
  await check('personal delete preserves peers personal history',async()=>{const r=await client.deleteHistory(ids.personalId,'req_delete_own');assert.equal(r.ok,true);const theirs=await peer.getHistory('personal');assert.equal(theirs.ok,true);assert.ok(theirs.data.some(row=>row.id===ids.otherPersonalId));return {peerSummaryPreserved:true};});
  await check('group withdrawal removes group summary for all members',async()=>{const r=await peer.updateHistoryConsent({scope:'group',consent:false});assert.equal(r.ok,true);const a=await client.getHistory('group'),b=await peer.getHistory('group');assert.equal(a.ok,true);assert.deepEqual(a.data,[]);assert.deepEqual(a,b);return {groupRows:0};});
  await check('reopt-in does not resurrect deleted group summaries',async()=>{const r=await peer.updateHistoryConsent({scope:'group',consent:true});assert.equal(r.ok,true);const a=await client.getHistory('group');assert.equal(a.ok,true);assert.deepEqual(a.data,[]);return {groupRows:0};});
  await check('personal withdrawal leaves peers history untouched',async()=>{const r=await client.updateHistoryConsent({scope:'personal',consent:false});assert.equal(r.ok,true);const mine=await client.getHistory('personal'),theirs=await peer.getHistory('personal');assert.equal(mine.ok,true);assert.deepEqual(mine.data,[]);assert.equal(theirs.ok,true);assert.ok(theirs.data.some(row=>row.id===ids.otherPersonalId));return {ownRows:0,peerPreserved:true};});
  const after=await fixture('capture');
  await check('history reads/writes never alter decided room or winner',async()=>{assert.deepEqual(before,after);return {unchanged:true};});
  await fixture('rate-reset');
  await check('concurrent rate budget is per caller and endpoint',async()=>{const rows=await Promise.all(Array.from({length:61},()=>request(base,'/rpc/get_history',host,{scope:'personal'})));assert.equal(rows.filter(r=>r.status===200).length,60);assert.equal(rows.filter(r=>r.status===429).length,1);const peerRead=await peer.getHistory('personal');assert.equal(peerRead.ok,true);return {allowed:60,limited:1,otherCallerAllowed:true};});
  await check('real client maps RATE_LIMITED from HTTP429',async()=>{const r=await client.getHistory('personal');assert.equal(r.ok,false);assert.equal(r.error.messageKey,'RATE_LIMITED');return {messageKey:r.error.messageKey};});
  assert.deepEqual(hashes(),sourceHashes);report.result='Pass';
} catch(error) {
  report.stage=stage;const diagnostic=String(error?.message??'').match(/GM21_SQL_[A-Za-z0-9_]+/);if(diagnostic)report.diagnostic=diagnostic[0];
  report.failedCase=cases.at(-1)?.result==='Fail'?cases.at(-1).case:'setup/cleanup or source revision changed';
  console.error('GM21 HTTP failed; raw response/credentials suppressed');process.exitCode=1;
} finally {
  if(gateway)await new Promise(resolve=>gateway.close(resolve));
  if(containerCreated){try{await docker(['stop',container]);report.postgrestCleanup='removed';}catch{report.result='Fail';report.postgrestCleanup='Fail';process.exitCode=1;}}
  if(guests.length){try{await fixture('cleanup');report.databaseAndGuestCleanup='owned namespace removed';}catch{report.result='Fail';report.databaseAndGuestCleanup='Fail';process.exitCode=1;}}
  await mkdir(reportFolder,{recursive:true});await writeFile(resolve(reportFolder,'http-results.json'),JSON.stringify(report,null,2)+'\n','utf8');
  console.log(JSON.stringify({result:report.result,cases:cases.length,failedCase:report.failedCase,postgrestCleanup:report.postgrestCleanup,databaseAndGuestCleanup:report.databaseAndGuestCleanup}));
}
