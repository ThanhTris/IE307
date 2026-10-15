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
import { runCommand, validateConfig, validateApiUrl } from './backend.mjs';
import { createOwnedRuntimeFiles } from './gm19_runtime_files.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const python = process.env.GM20_PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');
const require=createRequire(import.meta.url),ts=require(resolve(root,'mobile/node_modules/typescript'));
require.extensions['.ts']=(module,path)=>{
 const text=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 // Resolve repo TS imports explicitly; avoid probing absent .js/.json files on FileProvider drives.
 const resolved=text.replace(/require\((['"])(\.\.?\/[^'"]+)\1\)/g,(call,quote,spec)=>/\.[a-z]+$/i.test(spec)?call:`require(${quote}${spec}.ts${quote})`);
 module._compile(resolved,path);
};
const {isRoomSnapshot,isPoolDish}=require(resolve(root,'mobile/src/data/api/responseGuards.ts'));
const {createApiClient}=require(resolve(root,'mobile/src/data/api/index.ts'));
const keep = process.argv.includes('--bruno');
const reuse = process.argv.includes('--against');
const reset = process.argv.includes('--reset');
if (process.argv.some(a => a.startsWith('--') && !['--bruno','--against','--reset'].includes(a)) || (reset && !reuse)) throw Error('Reset requires --against with an owned fixture');
const saved=reuse?JSON.parse(readFileSync(resolve(root,'supabase/tests/bruno/GM-20/environments/runtime.private.json'),'utf8')):null;
const namespace = saved?.namespace ?? randomUUID(), guests = [], cases = [];
const container = 'gm20-http-' + namespace.replaceAll('-', '').slice(0, 16);
const envFile = resolve(root, 'supabase/tests/bruno/GM-20/environments/Local.runtime.private.bru');
const stateFile=resolve(root,'supabase/tests/bruno/GM-20/environments/runtime.private.json');
const runtimeFiles = createOwnedRuntimeFiles(envFile, stateFile);
const control=randomUUID();let stopResolve;
const sources = ['supabase/migrations/0023_finalize.sql','scripts/gm20_http_check.mjs','scripts/gm20_http_fixture.py','scripts/gm19_runtime_files.mjs'];
console.log('GM20 runner initialization');
function revisionFromHead() {
 // Read a locked checkout's actual HEAD without repository scanning (FileProvider).
 let gitDir=resolve(root,'.git');
 if(statSync(gitDir).isFile()){const pointer=readFileSync(gitDir,'utf8');if(!pointer.startsWith('gitdir: '))throw Error('Invalid gitdir pointer');gitDir=resolve(root,pointer.slice(8).trim());}
 const head=readFileSync(resolve(gitDir,'HEAD'),'utf8').trim();
 if(/^[0-9a-f]{40}$/.test(head))return head;
 const ref=head.replace(/^ref: /,'');if(!ref.startsWith('refs/')||ref.includes('..'))throw Error('Unexpected HEAD');
 let sha;try{sha=readFileSync(resolve(gitDir,ref),'utf8').trim();}catch(e){if(e.code!=='ENOENT')throw e;sha=readFileSync(resolve(gitDir,'packed-refs'),'utf8').split('\n').find(l=>l.endsWith(' '+ref))?.split(' ')[0];}
 if(!/^[0-9a-f]{40}$/.test(sha))throw Error('HEAD revision unavailable');return sha;
}
const report = {contract:'food-v1/roadmap-v2/GM-20.3', schemaVersion:'0.5.0',
  checkedAt:new Date().toISOString(), namespace, revision:revisionFromHead(),
  artifactHashes:Object.fromEntries(sources.map(p=>[p,createHash('sha256').update(readFileSync(resolve(root,p))).digest('hex')])),
  syntheticPositiveDataOnly:true, actualDataPromoted:false, cases, result:'Fail'};
console.log('GM20 source manifest ready');
let status, key, authBase, dbInfo, ids, base, gateway, started=false;
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
// Resolve the binding after a namespace-owned REST restart; never forward a JWT
// to a stale port that may have been reassigned to an unrelated process.
async function ownedRestBase() {
 const info=JSON.parse(await docker(['inspect',container]))[0];
 const uri=info.Config.Env.find(v=>v.startsWith('PGRST_DB_URI=')).slice(13);
 assert.equal(new URL(uri).pathname,'/gm08_check_'+namespace.replaceAll('-','').slice(0,16));
 const binding=info.NetworkSettings.Ports['3000/tcp'][0];assert.equal(binding.HostIp,'127.0.0.1');
 return 'http://127.0.0.1:'+binding.HostPort;
}
function makeGateway() {
 return createServer(async(req,res)=>{try{
    if(req.method==='POST' && req.url==='/__stop' && req.headers['x-gm20-control']===control){res.writeHead(200);res.end('{}');setTimeout(()=>stopResolve?.(),50);return;}
    if(req.method==='POST' && req.url==='/__reset' && req.headers['x-gm20-control']===control){
      const fresh=await startedRoom();res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({roomId:fresh.roomId,version:fresh.version,poolVersion:fresh.poolVersion,round:fresh.round,pool:fresh.pool}));return;
    }
    if(req.method!=='POST'||!req.url.startsWith('/rest/v1/rpc/')){res.writeHead(404);res.end('{}');return;}
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const upstream=await fetch((await ownedRestBase())+req.url.replace('/rest/v1',''),{method:'POST',headers:{'Content-Type':'application/json',
      ...(req.headers.authorization?{Authorization:req.headers.authorization}:{})},body:Buffer.concat(chunks),signal:AbortSignal.timeout(20000)});
    res.writeHead(upstream.status,{'Content-Type':'application/json'});res.end(await upstream.text());
  }catch{res.writeHead(502);res.end('{}');}});
}
async function check(name,work) {
  try {const actual=await work();cases.push({case:name,result:'Pass',...actual});console.log('Pass:',name);}
  catch(e) {cases.push({case:name,result:'Fail',diagnostic:'Assertion failed; inspect this named synthetic case locally'});throw Error(name+' ['+(e.message.match(/GM20_DB_[A-Z0-9_]+|History count [a-zA-Z]+: [0-9]+\/[0-9]+/)?.[0]??'assertion')+']');}
}
function success(r) {assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.ok,true,JSON.stringify(r.body));return r.body;}
function failure(r,status,keyValue) {assert.equal(r.status,status,JSON.stringify(r.body));assert.equal(r.body.messageKey ?? r.body.message,keyValue);return {status,messageKey:keyValue};}
const mutation=(room,v,extra={})=>({requestId:randomUUID(),room_id:room,expected_version:v,...extra});
let host,member,outsider;
function create(extra={}) {return {requestId:randomUUID(),display_name:'GM20 synthetic host',anchor_id:ids.anchorId,radius_m:1500,
  desired_at:new Date(Date.now()+1800000).toISOString(),service_mode:'dine_in',meal_slot:'dinner',time_hint:null,budget:null,avoid_recent:false,...extra};}
async function newRoom(token=host) {
  // Isolate setup budgets between scenarios; the atomic quota test below does
  // not reset counters between its requests.
  await fixture('sql',`delete from gm19_private.rate_windows where operation='create_room';`);
  return success(await request('create_room',token,create()));
}
async function snapshot(room,token=host) {const data=success(await request('get_room_snapshot',token,{room_id:room})).data;
  assert.equal(isRoomSnapshot(data),true,'GM07 snapshot DTO guard '+JSON.stringify({context:data.context,prefs:data.ownPreferences,poolValid:data.pool.map(isPoolDish),state:data.state,version:data.version}));return data;}
async function saveReport() {await mkdir(resolve(root,'docs/evidence/roadmap-v2/GM-20'),{recursive:true});
  await writeFile(resolve(root,'docs/evidence/roadmap-v2/GM-20/'+(reuse?'http-results-final.json':'http-results.json')),JSON.stringify(report,null,2)+'\n');}
async function parity() {
 await mkdir(resolve(root,'docs/evidence/roadmap-v2/GM-20'),{recursive:true});
 const vectors=[];
 for(const file of ['cases','roster-cases','seeded-cases']) {
  for(const row of JSON.parse(readFileSync(resolve(root,'tests/fixtures/decision-v2/'+file+'.json'),'utf8')).cases) {
   const input=file==='seeded-cases' && row.input && typeof row.input==='object' && !Array.isArray(row.input)?{...row.input,...(Object.hasOwn(row,'seed')?{seed:row.seed}:{})}:row.input;
   const lit=v=>"'"+JSON.stringify(v).replaceAll("'","''")+"'::jsonb";
   vectors.push(`select '${file}/${row.id}' id, ${lit(input)} input,${lit(row.expected)} expected,gm20_private.${file==='seeded-cases'?'decide':'evaluate'}(${lit(input)}) actual`);
  }
 }
 const rows=JSON.parse((await fixture('sql',`select jsonb_agg(to_jsonb(v)) from (${vectors.join(' union all ')}) v;`)).trim());
 for(const row of rows)assert.deepEqual(row.actual,row.expected,row.id);
 await writeFile(resolve(root,'docs/evidence/roadmap-v2/GM-20/parity.json'),JSON.stringify({fixtureOnly:true,algorithm:'u32-murmur3-rejection-v1',vectors:rows},null,2)+'\n');
 const sql=await fixture('sql',readFileSync(resolve(root,'supabase/tests/finalize.sql'),'utf8'));
 assert.ok(!/^not ok /m.test(sql));report.sql={result:'Pass',parityVectors:rows.length,assertions:(sql.match(/^ok \d+/gm)??[]).length};
 await writeFile(resolve(root,'docs/evidence/roadmap-v2/GM-20/sql-run.txt'),sql);
}
const participantGuests=n=>[guests[0],guests[1],...guests.slice(3)].slice(0,n);
async function startedRoom(n=2,history=false) {
 await fixture('sql','delete from gm19_private.rate_windows;delete from gm18_api_private.read_windows;');
 const people=participantGuests(n),made=await newRoom();let vv=made.version;
 for(const g of people.slice(1)) vv=success(await request('join_room',g.access_token,{requestId:randomUUID(),code:made.data.code,display_name:'GM20 simulated member'})).version;
 for(const g of people) {
  if(history) vv=success(await request('update_preferences',g.access_token,mutation(made.roomId,vv,{cuisine_ids:[],category_ids:[],history_consent:true}))).version;
  vv=success(await request('set_ready',g.access_token,mutation(made.roomId,vv,{ready:true}))).version;
 }
 const r=success(await request('start_round',host,mutation(made.roomId,vv)));assert.equal(r.state,'ROUND_1');
 return {...await snapshot(made.roomId),people};
}
const ballot=(s,vote='WANT',extra={})=>mutation(s.roomId,s.version,{round:s.round,pool_version:s.poolVersion,intent_id:'intent_'+randomUUID(),votes:s.pool.map(p=>({roundDishId:p.roundDishId,vote})),...extra});
async function submitAll(s,vote='WANT') {
 for(const g of s.people){const a=success(await request('submit_ballot',g.access_token,ballot(s,vote)));s={...s,version:a.version};}
 return {...await snapshot(s.roomId),people:s.people};
}
async function count(room) {return JSON.parse((await fixture('sql',`select jsonb_build_object('submissions',(select count(*) from public.submissions where room_id='${room}'),'votes',(select count(*) from public.votes v join public.submissions s on s.id=v.submission_id where s.room_id='${room}'),'results',(select count(*) from public.results where room_id='${room}'),'events',(select count(*) from public.events where room_id='${room}'),'history',(select count(*) from public.histories h join public.results r on r.id=h.result_id where r.room_id='${room}'),'seeds',(select count(*) from gm20_private.decision_seeds d join public.results r on r.id=d.result_id where r.room_id='${room}'));`)).trim());}
async function grant(s,scope,omit=-1,expired=-1,revoked=-1) {
 for(const [i,g] of s.people.entries()) if(i!==omit) await fixture('sql',`insert into public.consents(id,user_id,room_id,scope,enabled,granted_at,revoked_at,expires_at,version) values('${randomUUID()}','${g.user.id}','${s.roomId}','${scope}',${i!==revoked},statement_timestamp()-interval '1 hour',${i===revoked?"statement_timestamp()-interval '1 minute'":'null'},statement_timestamp()+interval '${i===expired?'-1 minute':'10 days'}',1) on conflict (user_id,room_id,scope) do update set enabled=excluded.enabled,granted_at=excluded.granted_at,revoked_at=excluded.revoked_at,expires_at=excluded.expires_at,version=public.consents.version+1;`);
}
async function tests() {
 await fixture('expand');
 await check('real GM07 client: opaque wire IDs, WAITING and unanimous persistent result',async()=>{
  let s=await startedRoom();const c=createApiClient('real',{baseUrl:base,publicKey:key,initialToken:host});
  const req=ballot(s);const a=await c.submitBallot({requestId:req.requestId,roomId:s.roomId,round:1,poolVersion:s.poolVersion,expectedVersion:s.version,intentId:req.intent_id,votes:req.votes});
  assert.equal(a.ok,true);assert.equal(a.data.receipt.requestId,a.requestId);s={...s,version:a.version};assert.equal((await snapshot(s.roomId)).result,null);
  const own=await snapshot(s.roomId);assert.equal(own.ownSubmission.intentId,req.intent_id);assert.equal(own.ownSubmission.requestId,req.requestId);
  const other=await snapshot(s.roomId,member);assert.deepEqual(other.ownVotes,{});assert.equal(other.ownSubmission,null);
  const b=success(await request('submit_ballot',member,ballot(s)));assert.equal(b.state,'DECIDED');const final=await snapshot(s.roomId);
  assert.equal(final.result.reasonCode,'UNANIMOUS_WANT');assert.equal(final.result.matchTier,'PERFECT');assert.ok(final.pool.some(p=>p.roundDishId===final.result.winnerRoundDishId));
  assert.deepEqual(success(await request('submit_ballot',host,req)).data,a.data);
  return {expected:{state:'DECIDED',results:1,seeds:1,events:1,history:0},actual:await count(s.roomId)};
 });
 await check('ACK first: exact retry, changed request payload and semantic intent replay',async()=>{
  const s=await startedRoom(),body=ballot(s,'OK');const a=success(await request('submit_ballot',host,body));
  failure(await request('submit_ballot',host,{...body,expected_version:a.version}),409,'REQUEST_ID_REUSED');
  const next={...body,requestId:'opaque_retry_'+randomUUID(),expected_version:a.version,votes:[...body.votes].reverse()};
  const replay=success(await request('submit_ballot',host,next));assert.equal(replay.requestId,next.requestId);assert.equal(replay.data.receipt.requestId,next.requestId);assert.equal(replay.version,a.version);
  failure(await request('submit_ballot',host,{...next,requestId:randomUUID(),votes:next.votes.map(v=>({...v,vote:'NO'}))}),409,'ALREADY_SUBMITTED');
  failure(await request('submit_ballot',host,{...next,requestId:randomUUID(),intent_id:'other'}),409,'ALREADY_SUBMITTED');
  assert.equal((await count(s.roomId)).submissions,1);return {expectedSubmissions:1,actual:await count(s.roomId),wireReceiptPreserved:true};
 });
 await check('expired ACK cache/public key -> same accepted intent replays without duplicate',async()=>{
  const s=await startedRoom(),body=ballot(s,'OK'),a=success(await request('submit_ballot',host,body));
  await fixture('sql',`begin;
   create temporary table gm20_age_public as select * from public.idempotency where operation='submit_ballot' and request_id=gm19_private.request_uuid('${body.requestId}');
   create temporary table gm20_age_private as select * from gm19_private.acks where idempotency_id in(select id from gm20_age_public);
   -- Age owned fixture rows by reconstruction; frozen ACK UPDATE guards stay enabled.
   delete from public.idempotency where id in(select id from gm20_age_public);
   insert into public.idempotency(id,user_id,operation,request_id,payload_hash,expected_version,response,created_at,expires_at,version)
     select id,user_id,operation,request_id,payload_hash,expected_version,response,statement_timestamp()-interval '25 hours',statement_timestamp()-interval '1 hour',version from gm20_age_public;
   insert into gm19_private.acks(id,idempotency_id,user_id,operation,request_id,payload_hash,response,room_id,server_version,created_at,expires_at)
     select id,idempotency_id,user_id,operation,request_id,payload_hash,response,room_id,server_version,statement_timestamp()-interval '25 hours',statement_timestamp()-interval '1 hour' from gm20_age_private;
   commit;`);
  assert.deepEqual(success(await request('submit_ballot',host,body)),a);assert.equal((await count(s.roomId)).submissions,1);return {expectedSubmissions:1,actual:await count(s.roomId)};
 });
 await check('reject auth/outsider, stale version-pool-round, incomplete/duplicate/UNSET/wrong enum',async()=>{
  const s=await startedRoom(),body=ballot(s);
  assert.equal((await request('submit_ballot',null,body)).status,401);
  failure(await request('submit_ballot',outsider,body),403,'NOT_MEMBER');
  for(const extra of [{expected_version:s.version-1},{pool_version:s.poolVersion+1},{round:2}])failure(await request('submit_ballot',host,{...body,...extra}),409,'VERSION_CONFLICT');
  for(const votes of [body.votes.map(v=>({...v,vote:'UNSET'})),body.votes.map(v=>({...v,vote:'KEEP'})),[body.votes[0],body.votes[0]]])failure(await request('submit_ballot',host,{...body,votes}),400,'INVALID_INPUT');
  failure(await request('submit_ballot',host,{...body,votes:[]}),400,'INCOMPLETE_BALLOT');
  failure(await request('submit_ballot',host,{...body,votes:[{roundDishId:randomUUID(),vote:'WANT'}]}),400,'INVALID_DISH');
  assert.equal((await count(s.roomId)).submissions,0);return {mutations:0};
 });
 await check('NO veto -> exact round2 pool, new rows, no default KEEP, REMOVE veto',async()=>{
  let s=await startedRoom();const original=s.pool;
  let body=ballot(s,'OK');body.votes[0].vote='NO';const a=success(await request('submit_ballot',host,body));s.version=a.version;
  success(await request('submit_ballot',member,ballot(s,'OK')));s={...await snapshot(s.roomId),people:s.people};
  assert.equal(s.state,'ROUND_2');assert.equal(s.pool.length,original.length-1);assert.equal(s.poolVersion>body.pool_version,true);
  assert.equal(s.ownSubmission,null);assert.deepEqual(s.ownVotes,{});assert.ok(s.pool.every(p=>!original.some(o=>o.roundDishId===p.roundDishId)));assert.ok(s.pool.every(p=>original.some(o=>o.choiceId===p.choiceId)));
  const r=success(await request('submit_ballot',host,ballot(s,'KEEP')));assert.equal(r.state,'ROUND_2');s.version=r.version;
  success(await request('submit_ballot',member,ballot(s,'REMOVE')));const f=await snapshot(s.roomId);
  assert.equal(f.round,2);assert.equal(f.result.reasonCode,'ALL_REMOVED');assert.equal(f.result.winnerDish,null);assert.equal(f.ownSubmission.round,2);assert.deepEqual(f.pool,s.pool);
  return {expected:'ALL_REMOVED',actual:f.result.reasonCode,round:2};
 });
 await check('round1 all NO -> EMPTY_INTERSECTION, no seed/history, one event',async()=>{
  const s=await submitAll(await startedRoom(),'NO');assert.equal(s.state,'NO_CONSENSUS');assert.equal(s.result.reasonCode,'EMPTY_INTERSECTION');const c=await count(s.roomId);assert.equal(c.results,1);assert.equal(c.seeds,0);assert.equal(c.history,0);assert.equal(c.events,1);return {actual:c};
 });
 await check('fallback all OK -> round2 KEEP -> COMPROMISE and stable locked winner',async()=>{
  let s=await submitAll(await startedRoom(),'OK');assert.equal(s.state,'ROUND_2');s=await submitAll(s,'KEEP');assert.equal(s.result.matchTier,'COMPROMISE');assert.equal(s.result.reasonCode,'ACCEPTABLE_FINAL');
  const before=s.result;await fixture('sql',`update public.dishes set name='Changed live name',version=version+1 where id='${before.winnerDish.dishId}';`);
  assert.deepEqual((await snapshot(s.roomId)).result,before);return {round:2,tier:'COMPROMISE',pinned:true};
 });
 await check('round2 score uses original WANT counts; strict majority tier and seed persisted',async()=>{
  let s=await startedRoom(3);const target=s.pool[0].choiceId;
  for(const [i,g] of s.people.entries()){const body=ballot(s,'OK');body.votes[i<2?0:1].vote='WANT';s.version=success(await request('submit_ballot',g.access_token,body)).version;}
  s={...await snapshot(s.roomId),people:s.people};assert.equal(s.state,'ROUND_2');s=await submitAll(s,'KEEP');
  assert.equal(s.result.winnerDish.choiceId,target);assert.equal(s.result.matchTier,'CONSENSUS');
  const valid=(await fixture('sql',`select (r.winner_round_dish_id=rd.id and ds.algorithm='u32-murmur3-rejection-v1' and gm20_private.select_winner(to_jsonb(r.tied_choice_ids),ds.seed)=rd.choice_id::text) from public.results r join gm20_private.decision_seeds ds on ds.result_id=r.id join public.round_dishes rd on rd.id=r.winner_round_dish_id where r.room_id='${s.roomId}';`)).trim();
  assert.equal(valid,'t');return {expectedTier:'CONSENSUS',actual:s.result.matchTier,persistedSeedMatchesWinner:true};
 });
 await check('rosters 2 through 8 wait for last and finalize exactly once',async()=>{
  for(let n=2;n<=8;n++){let s=await startedRoom(n);for(const [i,g] of s.people.entries()){const a=success(await request('submit_ballot',g.access_token,ballot(s)));assert.equal(a.state,i===n-1?'DECIDED':'ROUND_1');s.version=a.version;}const c=await count(s.roomId);assert.equal(c.submissions,n);assert.equal(c.results,1);assert.equal(c.events,1);}
  return {rosters:[2,3,4,5,6,7,8],expectedResultsPerRoom:1};
 });
 await check('concurrent identical request -> one submission and identical ACKs',async()=>{
  const s=await startedRoom(),body=ballot(s);const responses=await Promise.all(Array.from({length:8},()=>request('submit_ballot',host,body)));
  for(const r of responses)assert.deepEqual(success(r),success(responses[0]));assert.equal((await count(s.roomId)).submissions,1);return {requests:8,submissions:1};
 });
 await check('two members same version serialize; loser resubmits fresh attempt',async()=>{
  const s=await startedRoom(),bodies=[ballot(s),ballot(s)];const r=await Promise.all([request('submit_ballot',host,bodies[0]),request('submit_ballot',member,bodies[1])]);
  assert.deepEqual(r.map(x=>x.status).sort(),[200,409]);const loser=r.findIndex(x=>x.status===409);failure(r[loser],409,'VERSION_CONFLICT');
  const fresh=await snapshot(s.roomId);success(await request('submit_ballot',[host,member][loser],{...bodies[loser],requestId:randomUUID(),expected_version:fresh.version}));assert.equal((await count(s.roomId)).results,1);return {statuses:[200,409],freshRetry:'DECIDED'};
 });
 await check('terminal/expiry guards; accepted retry survives terminal and expiry',async()=>{
  let s=await startedRoom();const body=ballot(s),a=success(await request('submit_ballot',host,body));s.version=a.version;
  await fixture('sql',`update public.rooms set expires_at=clock_timestamp(),version=version+1 where id='${s.roomId}';`);
  assert.deepEqual(success(await request('submit_ballot',host,body)),a);
  const semantic={...body,requestId:randomUUID()};assert.equal(success(await request('submit_ballot',host,semantic)).data.receipt.requestId,semantic.requestId);
  failure(await request('submit_ballot',member,ballot(s)),410,'ROOM_EXPIRED');return {replay:200,newBallot:410};
 });
 await check('history requires frozen opt-in and actual scoped consent; partial/revoked/expired',async()=>{
  const scenarios=[['none',false,-1,-1,-1,0],['valid',true,-1,-1,-1,3],['partial',true,1,-1,-1,1],['expired',true,-1,1,-1,1],['revoked',true,-1,-1,1,1],['noSnapshot',false,-1,-1,-1,0]];
  for(const [name,opt,omit,expired,revoked,expected] of scenarios){const s=await startedRoom(2,opt);if(name!=='none'){await grant(s,'personal_history',omit,expired,revoked);await grant(s,'group_history',omit,expired,revoked);}const f=await submitAll(s);const c=await count(s.roomId);if(c.history!==expected)throw Error('History count '+name+': '+c.history+'/'+expected);assert.equal((await fixture('sql',`select count(*) from public.histories where result_id='${f.result.resultId}' and (expires_at>finalized_at+interval '30 days' or not gm17_private.history_valid(id));`)).trim(),'0');}
  return {expectedHistoryCounts:Object.fromEntries(scenarios.map(s=>[s[0],s[5]]))};
 });
 await check('deleted history never resurrected by retry/reconnect',async()=>{
  let s=await startedRoom(2,true);await grant(s,'personal_history');await grant(s,'group_history');const first=success(await request('submit_ballot',host,ballot(s)));s.version=first.version;const body=ballot(s);success(await request('submit_ballot',member,body));assert.equal((await count(s.roomId)).history,3);
  await fixture('sql',`delete from public.histories where result_id=(select id from public.results where room_id='${s.roomId}');`);
  success(await request('submit_ballot',member,body));await snapshot(s.roomId);assert.equal((await count(s.roomId)).history,0);return {before:3,afterDeleteRetry:0};
 });
 await check('fault after result/history creation rolls back submission/votes/version/result/event',async()=>{
  let s=await startedRoom(2,true);await grant(s,'personal_history');await grant(s,'group_history');s.version=success(await request('submit_ballot',host,ballot(s))).version;const before=await count(s.roomId),version=s.version;
  await fixture('sql',`create function public.gm20_test_fault() returns trigger language plpgsql as $$begin raise exception 'GM20 synthetic injected failure'; end$$;create trigger gm20_test_fault before insert on public.events for each row when (new.room_id='${s.roomId}') execute function public.gm20_test_fault();`);
  const body=ballot(s);failure(await request('submit_ballot',member,body),503,'UNKNOWN_ERROR');assert.deepEqual(await count(s.roomId),before);assert.equal((await snapshot(s.roomId)).version,version);
  await fixture('sql','drop trigger gm20_test_fault on public.events;drop function public.gm20_test_fault();');success(await request('submit_ballot',member,body));return {rollback:true,sameRequestRetry:200};
 });
 await check('last submit/cancel both serialized orders cannot leave mixed terminal state',async()=>{
  for(const cancelFirst of [true,false]){let s=await startedRoom();s.version=success(await request('submit_ballot',host,ballot(s))).version;const body=ballot(s);if(cancelFirst){success(await request('cancel_room',host,mutation(s.roomId,s.version,{confirm_cancel:true})));failure(await request('submit_ballot',member,{...body,expected_version:s.version+1}),409,'ROOM_TERMINAL');assert.equal((await count(s.roomId)).results,0);}else{success(await request('submit_ballot',member,body));failure(await request('cancel_room',host,mutation(s.roomId,s.version+1,{confirm_cancel:true})),409,'ROOM_TERMINAL');assert.equal((await count(s.roomId)).results,1);}}
  return {orders:['cancel then last','last then cancel'],mixedTerminal:false};
 });
 await check('concurrent last-submit/cancel produces exactly one terminal outcome',async()=>{
  let s=await startedRoom();s.version=success(await request('submit_ballot',host,ballot(s))).version;
  const responses=await Promise.all([request('submit_ballot',member,ballot(s)),request('cancel_room',host,mutation(s.roomId,s.version,{confirm_cancel:true}))]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);const final=await snapshot(s.roomId);const c=await count(s.roomId);
  assert.ok(['DECIDED','CANCELLED'].includes(final.state));assert.equal(c.results,final.state==='DECIDED'?1:0);assert.equal(c.events,c.results);return {statuses:[200,409],state:final.state,actual:c};
 });
 await check('host cannot read other raw votes/seed/ties; private functions denied',async()=>{
  const s=await startedRoom();await submitAll(s);
  const own=await fixture('sql',`begin;set local role authenticated;select set_config('request.jwt.claim.sub','${guests[0].user.id}',true);select count(*) from public.votes v join public.submissions s on s.id=v.submission_id join public.members m on m.id=s.member_id where m.user_id<>'${guests[0].user.id}';rollback;`);assert.equal(own.trim().split('\n').at(-1),'0');
  for(const sql of ['select * from gm20_private.decision_seeds;','select gm20_private.finalize(null,1);'])await assert.rejects(fixture('sql','begin;set local role authenticated;'+sql+'rollback;'));
  const publicText=JSON.stringify(await snapshot(s.roomId));for(const field of ['tied_choice_ids','candidateIds','seed','score','round1'])assert.ok(!publicText.includes('"'+field+'"'));return {otherVotes:0,privateDenied:true};
 });
 await check('response lost after commit -> exact final ACK, one result/event',async()=>{
  let s=await startedRoom();s.version=success(await request('submit_ballot',host,ballot(s))).version;
  const proxy=createServer(async(req,res)=>{const chunks=[];for await(const chunk of req)chunks.push(chunk);await fetch(base+req.url,{method:'POST',headers:{apikey:key,'Content-Type':'application/json',Authorization:'Bearer '+member},body:Buffer.concat(chunks)}).then(r=>r.text());res.destroy();});
  await new Promise(r=>proxy.listen(0,'127.0.0.1',r));const body=ballot(s);try{await assert.rejects(request('submit_ballot',member,body,'http://127.0.0.1:'+proxy.address().port));assert.equal(success(await request('submit_ballot',member,body)).state,'DECIDED');const c=await count(s.roomId);assert.equal(c.results,1);assert.equal(c.events,1);return {lostAfterCommit:true,actual:c};}finally{await new Promise(r=>proxy.close(r));}
 });
}

try {
  if (keep && !reuse) await runtimeFiles.assertAvailable();
  validateConfig(readFileSync(resolve(root,'supabase/config.toml'),'utf8'));
  if(reuse) {
    assert.equal(saved.endpoint,'http://127.0.0.1:54332');base=saved.endpoint;
    const env=Object.fromEntries([...readFileSync(envFile,'utf8').matchAll(/^  ([A-Za-z]+): (.*)$/gm)].map(m=>[m[1],m[2].trim()]));
    key=env.publicKey;assert.ok(key&&!key.startsWith('sb_secret_'));
    for(const g of saved.guests){const claims=JSON.parse(Buffer.from(g.access_token.split('.')[1],'base64url').toString());assert.equal(claims.sub,g.user.id);assert.equal(claims.user_metadata.gm20_test_namespace,namespace);}
    guests.push(...saved.guests);
    [host,member,outsider]=guests.map(g=>g.access_token);
    if(reset) {
      await ownedRestBase(); // Verify container binding before any restart.
      await fixture('rebuild'); // Marker and all tagged identities checked by helper.
      await fixture('positive');
      await docker(['restart',container]);
      report.ownedReset=true;
    }
    ids=JSON.parse((await fixture('sql',`select jsonb_build_object('anchorId','${saved.anchorId}',
      'dishId',(select id from public.dishes where review_status='published' limit 1),
      'datasetVersion',(select dataset_version from public.coverage_areas where review_status='published' limit 1));`)).trim());
    report.datasetVersion=ids.datasetVersion;report.endpoint=base;
    await parity();
    await fixture('sql','delete from gm19_private.rate_windows;delete from gm18_api_private.read_windows;');
    gateway=makeGateway();await new Promise((ok,bad)=>{gateway.once('error',bad);gateway.listen(0,'127.0.0.1',ok);});
    base='http://127.0.0.1:'+gateway.address().port;report.endpoint=base;
    await tests();report.result='Pass';await saveReport();
    await fixture('sql','delete from gm19_private.rate_windows;delete from gm18_api_private.read_windows;');
  } else {
  const cli=resolve(root,`node_modules/@supabase/cli-${process.platform}-${process.arch}/bin/supabase${process.platform==='win32'?'.exe':''}`);
  console.log('GM20 checking local status');
  status=JSON.parse(await runCommand(cli,['status','--output','json','--workdir',root],{quiet:true}));
  authBase=validateApiUrl(status.API_URL);key=status.ANON_KEY;console.log('GM20 local status ready; setup owned fixture');
  for(let i=0;i<9;i++) {const res=await fetch(authBase+'/auth/v1/signup',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},
    signal:AbortSignal.timeout(20000),body:JSON.stringify({data:{display_name:'GM20 synthetic '+i,gm18_test_namespace:namespace,gm20_test_namespace:namespace}})});
    assert.equal(res.status,200);guests.push(await res.json());}
  [host,member,outsider]=guests.map(g=>g.access_token);
  dbInfo=await fixture('create');console.log('GM20 owned DB ready');ids=await fixture('positive');report.datasetVersion=ids.datasetVersion;
  await parity();
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
  await new Promise((ok,bad)=>{gateway.once('error',bad);gateway.listen(54332,'127.0.0.1',ok);});base='http://127.0.0.1:54332';report.endpoint=base;
  try { await tests();report.result='Pass'; }
  catch(e) {report.failedCase=e.message;console.error('GM20 named scenario failed:',e.message);if(!keep)throw e;}
  await saveReport();
  if(keep){
    await fixture('sql','delete from gm19_private.rate_windows;delete from gm18_api_private.read_windows;');
    const bruno=await startedRoom(); const run=randomUUID();
    await runtimeFiles.write(envFile,'vars {\n'+Object.entries({baseUrl:base,control,publicKey:key,hostToken:host,memberToken:member,outsiderToken:outsider,anchorId:ids.anchorId,desiredAt:new Date(Date.now()+3600000).toISOString(),runId:run,roomId:bruno.roomId,roomVersion:bruno.version,poolVersion:bruno.poolVersion,votes:JSON.stringify(bruno.pool.map(p=>({roundDishId:p.roundDishId,vote:'OK'}))),hostRequestId:'host_'+run,memberRequestId:'member_'+run,hostIntentId:'intent_host_'+run,memberIntentId:'intent_member_'+run}).map(([k,v])=>'  '+k+': '+v).join('\n')+'\n}\n');
    console.log('BRUNO_READY endpoint='+base+' namespace='+namespace+' (Ctrl+C to cleanup)');
    await runtimeFiles.write(stateFile,JSON.stringify({endpoint:base,control,namespace,guests:guests.map(g=>({user:{id:g.user.id},access_token:g.access_token})),anchorId:ids.anchorId}));
    console.log('Stop safely: node scripts/gm20_http_stop.mjs');
    await new Promise(resolve=>{stopResolve=resolve;process.once('SIGINT',resolve);process.once('SIGTERM',resolve);});
  }
  }
}catch(e){report.failedCase=e.message;console.error('GM20 failed:',e.message);process.exitCode=1;}
finally {
  if(!reuse) {
  if(gateway)await new Promise(r=>gateway.close(r));
  if(started)await docker(['stop',container]).catch(()=>{report.postgrestCleanup='Fail';report.result='Fail';process.exitCode=1;});
  if(guests.length)await fixture('cleanup').then(()=>report.cleanup='owned DB and guests removed').catch(e=>{report.cleanup=e.message;report.result='Fail';process.exitCode=1;});
  await runtimeFiles.cleanup().catch(()=>{report.runtimeCleanup='Fail; changed or inaccessible files preserved';report.result='Fail';process.exitCode=1;});
  await saveReport();console.log(JSON.stringify({result:report.result,cases:cases.length,cleanup:report.cleanup}));
  } else {
    if(gateway)await new Promise(r=>gateway.close(r));
    report.cleanup='active owned fixture retained for Bruno; use gm20_http_stop.mjs';await saveReport();
    console.log(JSON.stringify({result:report.result,cases:cases.length,fixture:'retained'}));
  }
}
