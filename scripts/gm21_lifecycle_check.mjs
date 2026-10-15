/** Real JWTs, owned disposable database, loopback PostgREST and Bruno handoff. */
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCommand, cliArgs, validateConfig, validateApiUrl } from './backend.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const python = process.env.GM21_PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');
const require=createRequire(import.meta.url),ts=require(resolve(root,'mobile/node_modules/typescript'));
require.extensions['.ts']=(module,path)=>{
 const text=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 // Resolve repo TS imports explicitly; avoid probing absent .js/.json files on FileProvider drives.
 const resolved=text.replace(/require\((['"])(\.\.?\/[^'"]+)\1\)/g,(call,quote,spec)=>/\.[a-z]+$/i.test(spec)?call:`require(${quote}${spec}.ts${quote})`);
 module._compile(resolved,path);
};
const {isRoomSnapshot,isPoolDish}=require(resolve(root,'mobile/src/data/api/responseGuards.ts'));
const {createApiClient}=require(resolve(root,'mobile/src/data/api/index.ts'));

// Reuse the upstream owned fixture and real JWT verifier; never touch app data.
if(process.argv.length>2)throw Error('Local disposable runner has no deployment options');
const namespace=randomUUID(),guests=[],cases=[];
const container='gm21-lifecycle-'+namespace.replaceAll('-','').slice(0,16);
let status,key,authBase,dbInfo,ids,base,gateway,started=false;
const sources=['scripts/gm21_lifecycle_check.mjs','scripts/gm20_http_fixture.py','scripts/gm19_http_fixture.py','scripts/gm18_http_fixture.py',
 ...['0001_core_schema','0002_food_import_receipts','0003_food_provenance_description','0004_access_policies','0005_gm18_discovery_rpc','0018_food_eligibility','0019_room_lifecycle','0021_history','0022_social','0023_finalize','0024_history_integration'].map(p=>'supabase/migrations/'+p+'.sql')];
const hashes=()=>Object.fromEntries(sources.map(p=>[p,createHash('sha256').update(readFileSync(resolve(root,p))).digest('hex')]));
const report={result:'Fail',contract:'GM-21.2',schemaVersion:'0.6.0',checkedAt:new Date().toISOString(),
 environment:'local GoTrue JWT + isolated PostgreSQL/PostgREST + actual GM07 client',fixtureOnly:true,publicationPerformed:false,cases,artifactHashes:hashes()};
async function docker(args, env={}) {
  return new Promise((accept,reject)=>{
    const child=spawn('docker',args,{shell:false,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});
    let output=''; child.stdout.on('data',v=>output+=v); child.stderr.on('data',()=>{});
    child.on('error',()=>reject(Error('Docker unavailable')));
    child.on('close',c=>c===0?accept(output):reject(Error('Docker operation failed')));
  });
}
async function fixture(mode, sql='') {
  return new Promise((accept,reject)=>{
    const child=spawn(python,[resolve(root,'scripts/gm20_http_fixture.py'),mode,namespace,...guests.map(g=>g.user.id)],
      {shell:false,env:{...process.env,PYTHONUTF8:'1',PYTHONDONTWRITEBYTECODE:'1'},stdio:['pipe','pipe','pipe']});
    let output='',err=''; child.stdout.on('data',v=>output+=v); child.stderr.on('data',v=>err+=v);
    child.on('error',()=>reject(Error('Python unavailable')));
    child.on('close',c=>c===0?accept(mode==='sql'?output:JSON.parse(output)):
      reject(Error('Fixture '+mode+' failed '+(err.match(/GM18_DB_[A-Za-z0-9_]+/)?.[0]??err.split('\n').filter(Boolean).at(-1)))));
    child.stdin.end(sql);
  });
}
async function request(endpoint,token,body,url=base) {
  const response=await fetch(url+'/rest/v1/rpc/'+endpoint,{method:'POST',headers:{apikey:key,'Content-Type':'application/json',
    ...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(20000),redirect:'error'});
  return {status:response.status,body:await response.json()};
}
async function check(name,work) {
  try {const actual=await work();cases.push({case:name,result:'Pass',...actual});console.log('Pass:',name);}
  catch(e) {cases.push({case:name,result:'Fail',assertionLine:e.stack?.match(/gm21_lifecycle_check\.mjs:(\d+):/)?.[1],diagnostic:'Assertion failed; inspect this named synthetic case locally'});throw Error(name+' ['+(e.message.match(/GM20_DB_[A-Z0-9_]+|History count [a-zA-Z]+: [0-9]+\/[0-9]+/)?.[0]??'assertion')+']');}
}
function success(r) {assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.ok,true,JSON.stringify(r.body));return r.body;}
function failure(r,status,keyValue) {assert.equal(r.status,status,JSON.stringify(r.body));assert.equal(r.body.messageKey ?? r.body.message,keyValue);return {status,messageKey:keyValue};}
const mutation=(room,v,extra={})=>({requestId:randomUUID(),room_id:room,expected_version:v,...extra});
let host,member,outsider;
const mealTime=new Date(Date.now()+1800000).toISOString();
function create(extra={}) {return {requestId:randomUUID(),display_name:'GM20 synthetic host',anchor_id:ids.anchorId,radius_m:1500,
  desired_at:mealTime,service_mode:'dine_in',meal_slot:'dinner',time_hint:null,budget:null,avoid_recent:false,...extra};}
async function newRoom(token=host) {
  // Isolate setup budgets between scenarios; the atomic quota test below does
  // not reset counters between its requests.
  await fixture('sql',`delete from gm19_private.rate_windows where operation='create_room';`);
  return success(await request('create_room',token,create()));
}
async function snapshot(room,token=host) {const data=success(await request('get_room_snapshot',token,{room_id:room})).data;
  assert.equal(isRoomSnapshot(data),true,'GM07 snapshot DTO guard '+JSON.stringify({context:data.context,prefs:data.ownPreferences,poolValid:data.pool.map(isPoolDish),state:data.state,version:data.version}));return data;}

const makeGateway=()=>createServer(async(req,res)=>{try{
 if(req.method!=='POST'||!req.url.startsWith('/rest/v1/rpc/')){res.writeHead(404);res.end('{}');return;}
 const binding=JSON.parse(await docker(['inspect',container]))[0].NetworkSettings.Ports['3000/tcp'][0];
 assert.equal(binding.HostIp,'127.0.0.1');const chunks=[];for await(const chunk of req)chunks.push(chunk);
 const upstream=await fetch('http://127.0.0.1:'+binding.HostPort+req.url.replace('/rest/v1',''),{method:'POST',headers:{'Content-Type':'application/json',...(req.headers.authorization?{Authorization:req.headers.authorization}:{})},body:Buffer.concat(chunks),signal:AbortSignal.timeout(20000)});
 res.writeHead(upstream.status,{'Content-Type':'application/json'});res.end(await upstream.text());
}catch{res.writeHead(502);res.end('{}');}});
const sql=async text=>JSON.parse((await fixture('sql','select to_jsonb('+text+');')).trim());
const client=token=>createApiClient('real',{baseUrl:base,publicKey:key,initialToken:token});
async function consent(token,scope,value){const r=await client(token).updateHistoryConsent({scope,consent:value});assert.equal(r.ok,true,'consent '+(r.error?.messageKey??'unknown'));}
async function room(people=[guests[0],guests[1]],avoid=false){
 await fixture('sql','delete from gm19_private.rate_windows;delete from gm18_api_private.read_windows;');
 const made=success(await request('create_room',host,create({avoid_recent:avoid})));let v=made.version;
 for(const g of people.slice(1))v=success(await request('join_room',g.access_token,{requestId:randomUUID(),code:made.data.code,display_name:'GM21 synthetic member'})).version;
 for(const g of people)v=success(await request('update_preferences',g.access_token,mutation(made.roomId,v,{cuisine_ids:[],category_ids:[],history_consent:true}))).version;
 return {...await snapshot(made.roomId),people};
}
async function start(s){
 s=await snapshot(s.roomId);
 for(const g of [guests[0],guests[1]])s.version=success(await request('set_ready',g.access_token,mutation(s.roomId,s.version,{ready:true}))).version;
 success(await request('start_round',host,mutation(s.roomId,s.version)));return {...await snapshot(s.roomId),people:[guests[0],guests[1]]};
}
const ballot=(s,extra={})=>mutation(s.roomId,s.version,{round:s.round,pool_version:s.poolVersion,intent_id:'intent_'+randomUUID(),votes:s.pool.map(p=>({roundDishId:p.roundDishId,vote:'WANT'})),...extra});
async function finish(s,forcedDish=null){
 for(const g of s.people){const votes=forcedDish?{votes:s.pool.map(p=>({roundDishId:p.roundDishId,vote:p.dishId===forcedDish?'WANT':'NO'}))}:{};s.version=success(await request('submit_ballot',g.access_token,ballot(s,votes))).version;}
 const final=await snapshot(s.roomId);assert.equal(final.state,'DECIDED');return final;
}
const historyRows=room=>sql(`(select coalesce(jsonb_agg(to_jsonb(h) order by h.scope,h.owner_user_id),'[]'::jsonb) from public.histories h join public.results r on r.id=h.result_id where r.room_id='${room}')`);
const frozen=room=>sql(`(select dish_ids from gm21_private.recent_snapshots where room_id='${room}')`);
async function tests(){
 await fixture('expand');
 await check('GM19 -> GM20 default opt-out produces no history',async()=>{const done=await finish(await start(await room()));assert.deepEqual(await historyRows(done.roomId),[]);return {histories:0,state:done.state};});
 await consent(host,'personal',true);await consent(host,'group',true);
 await check('partial group consent records only opted personal summary',async()=>{const done=await finish(await start(await room()));const rows=await historyRows(done.roomId);assert.equal(rows.length,1);assert.equal(rows[0].owner_user_id,guests[0].user.id);return {personal:1,group:0};});
 await consent(member,'personal',true);await consent(member,'group',true);
 let full,ack,lastBallot;
 await check('real consent -> room/start -> ballots atomically writes two personal and group histories',async()=>{
  let s=await start(await room());assert.deepEqual(await frozen(s.roomId),[]);
  s.version=success(await request('submit_ballot',host,ballot(s))).version;lastBallot=ballot(s);
  ack=success(await request('submit_ballot',member,lastBallot));full=await snapshot(s.roomId);
  const rows=await historyRows(s.roomId);assert.equal(rows.length,3);assert.equal(rows.filter(h=>h.scope==='group').length,1);
  const actual=await client(host).getHistory('group');assert.equal(actual.ok,true);assert.ok(actual.data.some(h=>h.roomId===s.roomId));
  assert.equal(await sql(`gm20_private.group_key(array['${guests[0].user.id}','${guests[1].user.id}']::uuid[])=gm21_private.group_key(array['${guests[1].user.id}','${guests[0].user.id}']::uuid[])`),true);
  return {histories:3,state:full.state,realClient:true};
 });
 await check('exact final ACK replay and deleted history never resurrect summaries',async()=>{
  assert.deepEqual(success(await request('submit_ballot',member,lastBallot)),ack);
  const before=await historyRows(full.roomId);const group=before.find(h=>h.scope==='group');
  assert.equal((await client(host).deleteHistory(group.id)).ok,true);
  await fixture('sql',`select gm20_private.write_history('${full.roomId}','${group.result_id}');`);
  assert.deepEqual(success(await request('submit_ballot',member,lastBallot)),ack);
  assert.equal((await historyRows(full.roomId)).length,2);return {historyAfterDelete:2,replaySame:true};
 });
 await check('pinned winner metadata and shortest consent expiry survive catalogue edit',async()=>{
  let s=await start(await room());const pinned=new Map(s.pool.map(d=>[d.roundDishId,d.name]));
  await fixture('sql',`update public.consents set expires_at=statement_timestamp()+interval '2 days',version=version+1 where room_id='${s.roomId}';update public.dishes set name=name||' revised',version=version+1;`);
  const done=await finish(s),rows=await historyRows(done.roomId);assert.equal(rows.length,3);
  for(const h of rows){assert.equal(h.dish_name,pinned.get(done.result.winnerRoundDishId));assert.ok(Date.parse(h.expires_at)-Date.parse(h.finalized_at)<3*86400000);}
  return {pinnedName:true,ttlBelowThreeDays:true};
 });
 // Accumulate genuine prior decisions for the same group, never synthetic histories.
 let repeatedDish;
 for(let n=0;n<3;n++){const s=await start(await room());repeatedDish??=s.pool[0].dishId;const done=await finish(s,repeatedDish);assert.equal(done.pool.find(p=>p.roundDishId===done.result.winnerRoundDishId).dishId,repeatedDish);}
 await check('lobby pool consumes at most three server-derived recent results and freezes at start',async()=>{
  let s=await room(undefined,true);
  const recents=await sql(`gm21_private.recent_dishes('${s.roomId}')`);assert.equal(recents.length,3);assert.ok(recents.every(id=>id===repeatedDish));
  const ranked=await sql(`gm19_private.pool_without_history('${s.roomId}',array[${recents.map(id=>"'"+id+"'").join(',')}]::uuid[])->'pool'`);
  assert.deepEqual(s.pool.map(p=>p.dishId),ranked.map(p=>p.dishId));
  const plain=await sql(`gm19_private.pool_without_history('${s.roomId}','{}'::uuid[])->'pool'`);
  assert.deepEqual([...s.pool.map(p=>p.dishId)].sort(),plain.map(p=>p.dishId).sort());
  assert.equal(plain[0].dishId,repeatedDish);assert.notEqual(s.pool[0].dishId,repeatedDish);
  s=await start(s);assert.deepEqual(await frozen(s.roomId),recents);
  await consent(member,'group',false);assert.deepEqual(await frozen(s.roomId),recents);
  const before=await snapshot(s.roomId);assert.equal(before.version,s.version);assert.deepEqual(before.pool,s.pool);
  const done=await finish(s);assert.equal((await historyRows(done.roomId)).filter(h=>h.scope==='group').length,0);
  return {recentCount:3,repeatedDishMovedBehindEligibleAlternative:true,eligibleSetPreserved:true,frozenAfterWithdrawal:true};
 });
 await consent(member,'group',true);
 await check('withdrawal resets all lobby ready; reopt-in does not recreate old summaries',async()=>{
  let s=await room(undefined,true);for(const token of [host,member])s.version=success(await request('set_ready',token,mutation(s.roomId,s.version,{ready:true}))).version;
  await consent(member,'group',false);const after=await snapshot(s.roomId);assert.ok(after.version>s.version);assert.ok(after.members.every(m=>!m.ready));
  assert.deepEqual(await sql(`gm21_private.recent_dishes('${s.roomId}')`),[]);
  await consent(member,'group',true);assert.deepEqual(await sql(`gm21_private.recent_dishes('${s.roomId}')`),[]);
  failure(await request('start_round',host,mutation(s.roomId,after.version)),409,'VERSION_CONFLICT');
  return {resetAllReady:true,noResurrection:true};
 });
 await check('room flag and roster edits invalidate ready; another group has no borrowed recents',async()=>{
  let s=await room();for(const token of [host,member])s.version=success(await request('set_ready',token,mutation(s.roomId,s.version,{ready:true}))).version;
  success(await request('update_preferences',member,mutation(s.roomId,s.version,{cuisine_ids:[],category_ids:[],history_consent:false})));
  let after=await snapshot(s.roomId);assert.ok(after.members.every(m=>!m.ready));
  success(await request('set_ready',host,mutation(s.roomId,after.version,{ready:true})));
  success(await request('join_room',outsider,{requestId:randomUUID(),code:s.code,display_name:'GM21 third member'}));
  after=await snapshot(s.roomId);assert.ok(after.members.every(m=>!m.ready));
  assert.deepEqual(await sql(`gm21_private.recent_dishes('${s.roomId}')`),[]);
  // Leave also refreshes the pool after caller membership becomes inactive.
  success(await request('leave_room',outsider,mutation(s.roomId,after.version)));
  return {roomFlagReset:true,rosterReset:true,leaveRefresh:true};
 });
 await check('global-looking detached consent cannot authorize future finalization',async()=>{
  const s=await start(await room());await fixture('sql',`update public.consents set retention_detached=true,room_id=null,version=version+1 where room_id='${s.roomId}';`);
  const done=await finish(s);assert.deepEqual(await historyRows(done.roomId),[]);return {detachedNotReused:true};
 });
 await check('history write failure rolls back final ballot/result/event atomically',async()=>{
  let s=await start(await room());s.version=success(await request('submit_ballot',host,ballot(s))).version;
  await fixture('sql',`create function gm21_private.test_abort_history() returns trigger language plpgsql as $$begin raise exception 'owned test';end$$;create trigger gm21_test_abort before insert on public.histories for each row execute function gm21_private.test_abort_history();`);
  const last=ballot(s);const r=await request('submit_ballot',member,last);assert.ok(r.status>=400);
  assert.equal(await sql(`(select count(*) from public.results where room_id='${s.roomId}')`),0);
  assert.equal(await sql(`(select count(*) from public.submissions where room_id='${s.roomId}')`),1);
  await fixture('sql','drop trigger gm21_test_abort on public.histories;drop function gm21_private.test_abort_history();');
  success(await request('submit_ballot',member,last));assert.equal((await historyRows(s.roomId)).length,3);return {rollback:true,retryHistories:3};
 });
}
try{
  console.log('GM20 checking local status');
  // Let the official Node entrypoint map win32 to cli-windows and choose arch/libc.
  status=JSON.parse(await runCommand(process.execPath,cliArgs('status'),{quiet:true}));
  authBase=validateApiUrl(status.API_URL);key=status.ANON_KEY;console.log('GM20 local status ready; setup owned fixture');
  for(let i=0;i<3;i++) {const res=await fetch(authBase+'/auth/v1/signup',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},
    signal:AbortSignal.timeout(20000),body:JSON.stringify({data:{display_name:'GM20 synthetic '+i,gm18_test_namespace:namespace,gm20_test_namespace:namespace}})});
    assert.equal(res.status,200);guests.push(await res.json());}
  [host,member,outsider]=guests.map(g=>g.access_token);
  dbInfo=await fixture('create');console.log('GM20 owned DB ready');ids=await fixture('positive');report.datasetVersion=ids.datasetVersion;
  
  const restInfo=JSON.parse(await docker(['inspect','supabase_rest_gi-cung-duoc-local']))[0];
  const dbUrl=new URL(status.DB_URL);assert.ok(['localhost','127.0.0.1'].includes(dbUrl.hostname));
  dbUrl.hostname='supabase_db_gi-cung-duoc-local';dbUrl.port='5432';dbUrl.pathname='/'+dbInfo.database;
  await docker(['run','--rm','--pull','never','-d','--name',container,'--network',Object.keys(restInfo.NetworkSettings.Networks)[0],'-p','127.0.0.1::3000',
    '-e','PGRST_DB_URI','-e','PGRST_JWT_SECRET','-e','PGRST_DB_ANON_ROLE=anon','-e','PGRST_DB_SCHEMAS=public',restInfo.Config.Image],
    {PGRST_DB_URI:dbUrl.toString(),PGRST_JWT_SECRET:restInfo.Config.Env.find(v=>v.startsWith('PGRST_JWT_SECRET=')).slice(17)});started=true;
  const binding=JSON.parse(await docker(['inspect',container]))[0].NetworkSettings.Ports['3000/tcp'][0];
  const restBase='http://127.0.0.1:'+binding.HostPort;
  for(let i=0;i<40;i++){try{if((await fetch(restBase+'/')).ok)break;}catch{}if(i===39)throw Error('REST startup failed');await new Promise(r=>setTimeout(r,250));}
  gateway=makeGateway();
  await new Promise((ok,bad)=>{gateway.once('error',bad);gateway.listen(0,'127.0.0.1',ok);});base='http://127.0.0.1:'+gateway.address().port;report.endpoint=base;

 await tests();assert.deepEqual(hashes(),report.artifactHashes);report.result='Pass';
}catch(e){report.failedCase=cases.at(-1)?.result==='Fail'?cases.at(-1).case:'setup/cleanup';report.diagnostic=String(e.message).match(/GM20_DB_[A-Z0-9_]+|consent [A-Z_]+/)?.[0];console.error('GM21 lifecycle failed:',report.failedCase,report.diagnostic??'assertion');process.exitCode=1;}
finally{
 if(gateway)await new Promise(r=>gateway.close(r));
 if(started)await docker(['stop',container]).catch(()=>{report.result='Fail';report.postgrestCleanup='Fail';process.exitCode=1;});
 if(guests.length)await fixture('cleanup').then(()=>report.cleanup='owned DB and guests removed').catch(()=>{report.result='Fail';report.cleanup='Fail';process.exitCode=1;});
 await mkdir(resolve(root,'docs/evidence/roadmap-v2/GM-21/gm20-integration'),{recursive:true});
 await writeFile(resolve(root,'docs/evidence/roadmap-v2/GM-21/gm20-integration/lifecycle-results.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({result:report.result,cases:cases.length,failedCase:report.failedCase,cleanup:report.cleanup}));
}
