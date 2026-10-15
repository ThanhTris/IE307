/** GM-18 real JWT + private disposable PostgREST. No credentials in artifacts/logs. */
import assert from 'node:assert/strict';
import { createHmac, randomUUID, createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { mkdir,writeFile } from 'node:fs/promises';
import { dirname,resolve,sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCommand,validateConfig,validateApiUrl } from './backend.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const python=process.env.GM18_PYTHON ?? 'python3';
const reportFolder=resolve(root,'docs/evidence/roadmap-v2/GM-18/integration');
if(process.argv.length>2) throw Error('Local-only runner has no remote/deploy options');
const require=createRequire(import.meta.url),ts=require(resolve(root,'mobile/node_modules/typescript'));
require.extensions['.ts']=(module,path)=> {
  if(!path.startsWith(resolve(root,'mobile/src')+sep)) throw Error('Mobile source only');
  module._compile(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,path);
};
const {createApiClient}=require(resolve(root,'mobile/src/data/api'));
const {createDiscoveryApi}=require(resolve(root,'mobile/src/data/discovery'));
const sources=['scripts/gm18_http_check.mjs','scripts/gm18_http_fixture.py','supabase/migrations/0005_gm18_discovery_rpc.sql',
  'supabase/migrations/0018_food_eligibility.sql','mobile/src/data/api/client.ts','mobile/src/data/api/responseGuards.ts',
  'mobile/src/data/discovery/index.ts'];
const hashes=()=>Object.fromEntries(sources.map(p=>[p,createHash('sha256').update(readFileSync(resolve(root,p))).digest('hex')]));
const sourceHashes=hashes(),cases=[],guests=[];const namespace=randomUUID();
const container='gm18-http-'+namespace.replaceAll('-','').slice(0,16);
let key,authBase,base,status,dbInfo,ids,containerCreated=false,gateway,stage='setup';
const report={result:'Fail',contract:'food-v1/roadmap-v2/GM-18.1',schemaVersion:'0.2.0',
  checkedAt:new Date().toISOString(),environment:'loopback GoTrue + process-owned DB/PostgREST; mobile real client',
  syntheticPositiveDataOnly:true,actualDataPromoted:false,publicationPerformed:false,cases,artifactHashes:sourceHashes};
async function docker(args,env={}) {
  return new Promise((accept,reject)=>{
    const child=spawn('docker',args,{env:{...process.env,...env},shell:false,stdio:['ignore','pipe','pipe']});
    let output='';child.stdout.on('data',c=>{output+=c;});child.stderr.on('data',()=>{});
    child.on('error',()=>reject(Error('Docker unavailable')));child.on('close',c=>c===0?accept(output):reject(Error('Docker action failed; details suppressed')));
  });
}
async function fixture(mode) {
  return JSON.parse(await runCommand(python,[resolve(root,'scripts/gm18_http_fixture.py'),mode,namespace,...guests.map(g=>g.user.id)],{quiet:true,timeoutMs:180000}));
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
function preview(overrides={}) {
  return {anchor_id:ids?.anchorId??'00000000-0000-0000-0000-000000000000',radius_m:1500,
    desired_at:new Date(Date.now()+1800000).toISOString(),service_mode:'dine_in',meal_slot:'dinner',
    time_hint:null,cuisine_ids:null,category_ids:null,budget:null,...overrides};
}
try {
  validateConfig(readFileSync(resolve(root,'supabase/config.toml'),'utf8'));
  status=JSON.parse(await runCommand(process.execPath,[resolve(root,'node_modules/supabase/dist/supabase.js'),'status','--output','json','--workdir',root],{quiet:true}));
  authBase=validateApiUrl(status.API_URL);key=status.ANON_KEY;
  const dbUrl=new URL(status.DB_URL);assert.ok(['127.0.0.1','localhost'].includes(dbUrl.hostname)&&dbUrl.port==='54322');
  for(let i=0;i<3;i++) {
    const guest=await request(authBase,'/auth/v1/signup',null,{data:{display_name:'GM18 synthetic '+i,gm18_test_namespace:namespace}});
    assert.equal(guest.status,200);assert.equal(guest.body.user.is_anonymous,true);guests.push(guest.body);
  }
  stage='create disposable DB';dbInfo=await fixture('create');report.actualBundle={sha256:dbInfo.actualBundleSha256,counts:dbInfo.actualCounts};
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
  const client=createDiscoveryApi(createApiClient('real',{baseUrl:base,publicKey:key,initialToken:host}));
  await check('actual draft discovery HTTP with real guest JWT',async()=>{
    const r=await request(base,'/rpc/get_discovery_context',host,{});
    if(r.status!==200) throw {safeCode:typeof r.body?.code==='string'?r.body.code:'HTTP_'+r.status};
    assert.equal(r.body.ok,true);return {status:200};
  });
  await check('actual draft discovery DTO through real mobile client',async()=>{
    const r=await client.getDiscoveryContext();if(!r.ok) throw {safeCode:r.error.messageKey};assert.deepEqual(r.data.anchors,[]);assert.deepEqual(r.data.coverageAreas,[]);return {anchors:0,areas:0};
  });
  await check('actual draft preview empty with version and reason',async()=>{
    const r=await request(base,'/rpc/preview_food_pool',host,preview());assert.equal(r.status,200);
    assert.equal(r.body.ok,true);assert.deepEqual(r.body.data.pool,[]);assert.equal(r.body.data.datasetVersion,'0.4.1');
    assert.deepEqual(r.body.data.reasonCodes,['OUT_OF_COVERAGE']);return {status:200,choices:0,datasetVersion:'0.4.1',reasonCodes:r.body.data.reasonCodes};
  });
  await check('actual draft empty reason through typed discovery adapter',async()=>{
    const r=await client.previewFoodPool({anchorId:preview().anchor_id,radiusM:1500,desiredAt:preview().desired_at,serviceMode:'dine_in',mealSlot:'dinner'});
    if(!r.ok) throw {safeCode:r.error.messageKey};assert.deepEqual(r.data.pool,[]);assert.deepEqual(r.data.reasonCodes,['OUT_OF_COVERAGE']);return {choices:0,reasonCodes:r.data.reasonCodes};
  });
  await check('actual draft malformed date becomes INVALID_INPUT',async()=>{
    const r=await request(base,'/rpc/preview_food_pool',host,preview({desired_at:'2026-02-30T10:00:00Z'}));assert.equal(r.status,400);assert.equal(r.body.messageKey,'INVALID_INPUT');return {status:400};
  });
  stage='synthetic positive fixture';ids=await fixture('positive');
  // Reload only the disposable PostgREST schema cache after synthetic setup.
  const resultParams={room_id:ids.roomId,result_id:ids.resultId};
  const before=await fixture('capture');
  await check('synthetic published discovery through real client/guards',async()=>{
    const r=await client.getDiscoveryContext();if(!r.ok) throw {safeCode:r.error.messageKey};assert.equal(r.data.anchors.length,1);assert.equal(r.data.coverageAreas.length,1);assert.equal(r.data.coverageAreas[0].adminAreaId,'unknown');return {anchors:1,areas:1,simulationOnly:true};
  });
  await check('positive preview DTO/offering refs through real client',async()=>{
    const r=await client.previewFoodPool({anchorId:ids.anchorId,radiusM:1500,desiredAt:preview().desired_at,serviceMode:'dine_in',mealSlot:'dinner'});
    if(!r.ok) throw {safeCode:r.error.messageKey};assert.equal(r.data.pool.length,1);assert.equal(r.data.pool[0].dishId,ids.dishId);
    assert.deepEqual([...r.data.pool[0].offeringIds].sort(),[...ids.offeringIds].sort());assert.deepEqual(r.data.reasonCodes,[]);assert.equal(r.data.policyVersion,'gm18-api-1.0.0');
    return {choices:1,offeringReferences:2,simulationOnly:true};
  });
  await check('discovery UUID filters preserve anchor-to-area relationship',async()=>{
    const r=await client.getDiscoveryContext(ids.areaId,ids.anchorId);assert.equal(r.ok,true);
    assert.equal(r.data.anchors[0].id,ids.anchorId);assert.equal(r.data.anchors[0].coverageId,r.data.coverageAreas[0].id);
    const absent=await client.getDiscoveryContext(undefined,randomUUID());assert.equal(absent.ok,true);assert.deepEqual(absent.data.anchors,[]);assert.deepEqual(absent.data.coverageAreas,[]);
    return {matchingAnchorArea:true,unknownAnchorEmpty:true};
  });
  await check('10km boundary and within7days accepted',async()=>{
    const r=await request(base,'/rpc/preview_food_pool',host,preview({radius_m:10000,desired_at:new Date(Date.now()+7*86400000-10000).toISOString()}));
    assert.equal(r.status,200);assert.equal(r.body.ok,true);assert.deepEqual(r.body.data.reasonCodes,['OUT_OF_COVERAGE']);return {status:200,maxRadiusM:10000,maxFutureSeconds:604800,staleCoverageReason:'OUT_OF_COVERAGE'};
  });
  await check('same snapshot context returns deterministic ordered pool and seed',async()=>{
    const body=preview();const a=await request(base,'/rpc/preview_food_pool',host,body),b=await request(base,'/rpc/preview_food_pool',host,body);
    assert.deepEqual(a.body.data.pool,b.body.data.pool);assert.equal(a.body.data.poolSeed,b.body.data.poolSeed);return {choices:a.body.data.pool.length};
  });
  for(const [name,overrides] of [['radius over10km',{radius_m:10001}],['zero radius',{radius_m:0}],['radius string',{radius_m:'1000'}],
    ['future beyond7days',{desired_at:new Date(Date.now()+8*86400000).toISOString()}],['negative budget',{budget:-1}],
    ['invalid meal',{meal_slot:'all'}],['category object',{category_ids:{id:ids.categoryId}}],['category wrong type',{category_ids:[1]}]]) {
    await check(name+' rejected',async()=>{const r=await request(base,'/rpc/preview_food_pool',host,preview(overrides));assert.equal(r.status,400);assert.equal(r.body.messageKey,'INVALID_INPUT');return {status:400};});
  }
  await check('past target through real client maps DESIRED_TIME_PASSED',async()=>{
    const r=await client.previewFoodPool({anchorId:ids.anchorId,radiusM:1500,desiredAt:new Date(Date.now()-60000).toISOString(),serviceMode:'dine_in',mealSlot:'dinner'});
    assert.equal(r.ok,false);assert.equal(r.error.messageKey,'DESIRED_TIME_PASSED');return {messageKey:r.error.messageKey};
  });
  for(const [name,token] of [['missing auth',null],['forged JWT','eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxNyJ9.invalid']])
    await check(name+' denied',async()=>{const r=await request(base,'/rpc/get_discovery_context',token,{});assert.equal(r.status,401);return {status:401};});
  await check('expired signed synthetic JWT denied by actual verifier',async()=>{
    const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
    const token=exp=>{const p=Buffer.from(JSON.stringify({sub:guests[0].user.id,role:'authenticated',aud:'authenticated',exp})).toString('base64url');return h+'.'+p+'.'+createHmac('sha256',status.JWT_SECRET).update(h+'.'+p).digest('base64url');};
    const valid=await request(base,'/rpc/get_discovery_context',token(Math.floor(Date.now()/1000)+60),{});assert.equal(valid.status,200);
    const r=await request(base,'/rpc/get_discovery_context',token(1),{});assert.equal(r.status,401);return {status:401,unexpiredControlStatus:200};
  });
  await check('outsider result read through real client maps NOT_MEMBER',async()=>{
    const other=createDiscoveryApi(createApiClient('real',{baseUrl:base,publicKey:key,initialToken:outsider}));
    const r=await other.getResultOfferings(ids.roomId,ids.resultId);assert.equal(r.ok,false);assert.equal(r.error.messageKey,'NOT_MEMBER');return {messageKey:r.error.messageKey};
  });
  await check('host/member result gives both venues for same immutable winner',async()=>{
    for(const token of [host,member]) {
      const c=createDiscoveryApi(createApiClient('real',{baseUrl:base,publicKey:key,initialToken:token}));const r=await c.getResultOfferings(ids.roomId,ids.resultId);
      assert.equal(r.ok,true);assert.equal(r.data.length,2);assert.ok(r.data.every(row=>row.dishId===ids.dishId&&row.roundDishId===ids.winnerId));
    }return {venues:2};
  });
  await fixture('pause');
  await check('sold-out refetch returns empty without substitute winner',async()=>{
    const r=await client.getResultOfferings(ids.roomId,ids.resultId);assert.equal(r.ok,true);assert.deepEqual(r.data,[]);return {choices:0};
  });
  await fixture('unpause');const after=await fixture('capture');
  await check('RPCs never mutate room/result/winner snapshot',async()=>{assert.equal(after.immutableDecisionSha256,before.immutableDecisionSha256);return {unchanged:true};});
  await fixture('member-left');
  await check('left member denied',async()=>{const r=await request(base,'/rpc/get_result_offerings',member,resultParams);assert.equal(r.status,403);assert.equal(r.body.messageKey,'NOT_MEMBER');return {status:403};});
  await fixture('expire');
  await check('expired member room maps ROOM_EXPIRED',async()=>{const r=await request(base,'/rpc/get_result_offerings',host,resultParams);assert.equal(r.status,410);assert.equal(r.body.messageKey,'ROOM_EXPIRED');return {status:410};});
  await check('projection has no private authors/source locators/preferences/ballots',async()=>{
    const r=await request(base,'/rpc/preview_food_pool',host,preview());const text=JSON.stringify(r.body);
    for(const field of ['enteredBy','reviewedBy','fieldSources','locator','preferencesByParticipant','recentDishIds','consentSnapshot','tiedChoiceIds','votes']) assert.ok(!text.includes('"'+field+'"'));
    return {privateFields:0};
  });
  await fixture('rate-reset');
  await check('atomic concurrent read budget:60 allowed,61st429; caller isolated',async()=>{
    const values=await Promise.all(Array.from({length:61},()=>request(base,'/rpc/get_discovery_context',host,{})));
    assert.equal(values.filter(r=>r.status===200).length,60);assert.equal(values.filter(r=>r.status===429).length,1);
    const other=await request(base,'/rpc/get_discovery_context',outsider,{});assert.equal(other.status,200);return {allowed:60,limited:1,otherCallerStatus:200};
  });
  await check('real client maps HTTP429 RATE_LIMITED',async()=>{const r=await client.getDiscoveryContext();assert.equal(r.ok,false);assert.equal(r.error.messageKey,'RATE_LIMITED');return {messageKey:r.error.messageKey};});
  assert.deepEqual(hashes(),sourceHashes);report.result='Pass';
} catch(error) {
  report.stage=stage;const diagnostic=String(error?.message??'').match(/GM18_DB_[A-Za-z0-9_]+/);if(diagnostic) report.diagnostic=diagnostic[0];
  report.failedCase=typeof error?.message==='string'&&cases.at(-1)?.result==='Fail'?cases.at(-1).case:'setup/cleanup or source revision changed';
  console.error('GM-18 HTTP integration failed; raw response/credentials suppressed');process.exitCode=1;
} finally {
  if(gateway) await new Promise(resolve=>gateway.close(resolve));
  if(containerCreated) {try {await docker(['stop',container]);report.postgrestCleanup='removed';}catch {report.postgrestCleanup='Fail';report.result='Fail';process.exitCode=1;}}
  if(guests.length) {try {await fixture('cleanup');report.databaseAndGuestCleanup='owned namespace removed';}catch {report.databaseAndGuestCleanup='Fail';report.result='Fail';process.exitCode=1;}}
  await mkdir(reportFolder,{recursive:true});await writeFile(resolve(reportFolder,'http-results.json'),JSON.stringify(report,null,2)+'\n','utf8');
  console.log(JSON.stringify({result:report.result,cases:cases.length,failedCase:report.failedCase,postgrestCleanup:report.postgrestCleanup,databaseAndGuestCleanup:report.databaseAndGuestCleanup}));
}
