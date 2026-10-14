/** Real JWTs, owned disposable database, loopback PostgREST and Bruno handoff. */
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCommand, validateConfig, validateApiUrl } from './backend.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const python = process.env.GM19_PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');
const require=createRequire(import.meta.url),ts=require(resolve(root,'mobile/node_modules/typescript'));
require.extensions['.ts']=(module,path)=>module._compile(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,path);
const {isRoomSnapshot,isPoolDish}=require(resolve(root,'mobile/src/data/api/responseGuards.ts'));
const {createApiClient}=require(resolve(root,'mobile/src/data/api/index.ts'));
const keep = process.argv.includes('--bruno');
const reuse = process.argv.includes('--against');
if (process.argv.some(a => a.startsWith('--') && !['--bruno','--against'].includes(a))) throw Error('Local-only runner');
const saved=reuse?JSON.parse(readFileSync(resolve(root,'supabase/tests/bruno/GM-19/environments/runtime.private.json'),'utf8')):null;
const namespace = saved?.namespace ?? randomUUID(), guests = [], cases = [];
const container = 'gm19-http-' + namespace.replaceAll('-', '').slice(0, 16);
const envFile = resolve(root, 'supabase/tests/bruno/GM-19/environments/Local.runtime.private.bru');
const stateFile=resolve(root,'supabase/tests/bruno/GM-19/environments/runtime.private.json');
const control=randomUUID();let stopResolve;
const sources = ['supabase/migrations/0019_room_lifecycle.sql','scripts/gm19_http_check.mjs','scripts/gm19_http_fixture.py'];
const report = {contract:'food-v1/roadmap-v2/GM-19.1', schemaVersion:'0.3.0',
  checkedAt:new Date().toISOString(), namespace, revision:await runCommand('git',['rev-parse','HEAD'],{quiet:true}),
  artifactHashes:Object.fromEntries(sources.map(p=>[p,createHash('sha256').update(readFileSync(resolve(root,p))).digest('hex')])),
  syntheticPositiveDataOnly:true, actualDataPromoted:false, cases, result:'Fail'};
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
    const child=spawn(python,[resolve(root,'scripts/gm19_http_fixture.py'),mode,namespace,...guests.map(g=>g.user.id)],
      {shell:false,env:{...process.env,PYTHONUTF8:'1'},stdio:['pipe','pipe','pipe']});
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
  catch(e) {cases.push({case:name,result:'Fail',diagnostic:String(e.message).slice(0,500)});throw Error(name);}
}
function success(r) {assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.ok,true,JSON.stringify(r.body));return r.body;}
function failure(r,status,keyValue) {assert.equal(r.status,status,JSON.stringify(r.body));assert.equal(r.body.messageKey ?? r.body.message,keyValue);return {status,messageKey:keyValue};}
const mutation=(room,v,extra={})=>({requestId:randomUUID(),room_id:room,expected_version:v,...extra});
let host,member,outsider;
function create(extra={}) {return {requestId:randomUUID(),display_name:'GM19 synthetic host',anchor_id:ids.anchorId,radius_m:1500,
  desired_at:new Date(Date.now()+1800000).toISOString(),service_mode:'dine_in',meal_slot:'dinner',time_hint:null,budget:null,avoid_recent:false,...extra};}
async function newRoom(token=host) {
  // Isolate setup budgets between scenarios; the atomic quota test below does
  // not reset counters between its requests.
  await fixture('sql',`delete from gm19_private.rate_windows where operation='create_room';`);
  return success(await request('create_room',token,create()));
}
async function snapshot(room,token=host) {const data=success(await request('get_room_snapshot',token,{room_id:room})).data;
  assert.equal(isRoomSnapshot(data),true,'GM07 snapshot DTO guard '+JSON.stringify({context:data.context,prefs:data.ownPreferences,poolValid:data.pool.map(isPoolDish),state:data.state,version:data.version}));return data;}
async function saveReport() {await mkdir(resolve(root,'docs/evidence/roadmap-v2/GM-19'),{recursive:true});
  await writeFile(resolve(root,'docs/evidence/roadmap-v2/GM-19/'+(reuse?'http-results-final.json':'http-results.json')),JSON.stringify(report,null,2)+'\n');}
async function tests() {
  let room,code,v,initial,createBody;
  await check('discovery published synthetic anchor and positive pool (GM-18)',async()=>{
    const d=success(await request('get_discovery_context',host,{}));assert.equal(d.data.anchors.length,1);
    const p=success(await request('preview_food_pool',host,{anchor_id:ids.anchorId,radius_m:1500,desired_at:create().desired_at,service_mode:'dine_in',meal_slot:'dinner'}));
    assert.ok(p.data.pool.length>0);return {status:200,anchors:1,choices:p.data.pool.length};});
  await check('create host member, ready false, 60 minute TTL',async()=>{
    createBody=create();initial=success(await request('create_room',host,createBody));room=initial.roomId;code=initial.data.code;v=initial.version;
    const s=await snapshot(room);assert.equal(s.members.length,1);assert.equal(s.members[0].ready,false);assert.ok(s.pool.length>0);
    assert.ok(Date.parse(s.expiresAt)-Date.now()>3590000);return {status:200,state:s.state,version:v,pool:s.pool.length};});
  await check('ACK replay before state/version, same response; payload reuse409',async()=>{
    assert.deepEqual(success(await request('create_room',host,createBody)),initial);
    return failure(await request('create_room',host,{...createBody,display_name:'changed'}),409,'REQUEST_ID_REUSED');});
  await check('one ready host cannot start without second member',async()=>{
    v=success(await request('set_ready',host,mutation(room,v,{ready:true}))).version;
    return failure(await request('start_round',host,mutation(room,v)),409,'NOT_READY');});
  await check('join member, duplicate membership and own preferences',async()=>{
    const body={requestId:randomUUID(),code,display_name:'member'};const a=success(await request('join_room',member,body));v=a.version;
    assert.deepEqual(success(await request('join_room',member,body)),a);
    const s=await snapshot(room,member);assert.equal(s.members.length,2);assert.equal(s.members.find(m=>m.userId===guests[1].user.id).ready,false);
    assert.ok(s.ownPreferences);return {status:200,members:2,version:v};});
  await check('outsider403 and member host guard403',async()=>{
    failure(await request('get_room_snapshot',outsider,{room_id:room}),403,'NOT_MEMBER');
    return failure(await request('start_round',member,mutation(room,v)),403,'NOT_HOST');});
  await check('stale version409; start requires ready',async()=>{
    failure(await request('set_ready',member,mutation(room,v-1,{ready:true})),409,'VERSION_CONFLICT');
    return failure(await request('start_round',host,mutation(room,v)),409,'NOT_READY');});
  await check('preferences update own only and reset own ready',async()=>{
    v=success(await request('set_ready',member,mutation(room,v,{ready:true}))).version;
    v=success(await request('update_preferences',member,mutation(room,v,{cuisine_ids:[],category_ids:[],temperature:'cold',flavor:null,history_consent:false}))).version;
    const a=await snapshot(room,member),b=await snapshot(room);assert.equal(a.ownPreferences.temperature,'cold');assert.equal(b.ownPreferences.temperature ?? null,null);
    assert.equal(a.members.find(m=>m.userId===guests[1].user.id).ready,false);return {status:200,version:v,privateProjection:true};});
  await check('context updates shared pool/version and reset all ready',async()=>{
    v=success(await request('set_ready',member,mutation(room,v,{ready:true}))).version;
    const c=create();delete c.display_name;v=success(await request('update_context',host,{...c,room_id:room,expected_version:v,radius_m:1600})).version;
    const s=await snapshot(room);assert.ok(s.members.every(m=>!m.ready));assert.equal(s.context.radiusM,1600);return {status:200,version:v};});
  await check('ready both then start ROUND_1, replay after start',async()=>{
    v=success(await request('set_ready',host,mutation(room,v,{ready:true}))).version;
    v=success(await request('set_ready',member,mutation(room,v,{ready:true}))).version;
    const body=mutation(room,v),a=success(await request('start_round',host,body));v=a.version;assert.equal(a.state,'ROUND_1');
    assert.deepEqual(success(await request('start_round',host,body)),a);const s=await snapshot(room);assert.equal(s.state,'ROUND_1');return {status:200,state:s.state,version:v};});
  await check('started snapshot immutable after catalogue/anchor change',async()=>{
    const before=await snapshot(room);
    await fixture('sql',`update public.dishes set name='GM19 changed catalogue',version=version+1 where id='${ids.dishId}';
      update public.public_anchors set name='GM19 changed anchor',version=version+1 where anchor_id='${ids.anchorId}';`);
    const after=await snapshot(room);assert.deepEqual(after.pool,before.pool);assert.deepEqual(after.context,before.context);
    await fixture('sql',`update public.dishes set name='GM18 synthetic dish',version=version+1 where id='${ids.dishId}';`);
    return {status:200,immutable:true};});
  await check('started leave/join locked; member cancel requires confirmation',async()=>{
    failure(await request('leave_room',member,mutation(room,v)),409,'ROOM_LOCKED');
    failure(await request('join_room',outsider,{requestId:randomUUID(),code,display_name:'outsider'}),409,'ROOM_LOCKED');
    failure(await request('cancel_room',member,mutation(room,v,{confirm_cancel:false})),400,'INVALID_INPUT');
    const a=success(await request('cancel_room',member,mutation(room,v,{confirm_cancel:true})));assert.equal(a.state,'CANCELLED');return {status:200,state:a.state};});
  await check('lobby leave/rejoin; host leave cancels',async()=>{
    const a=await newRoom();let vv=success(await request('join_room',member,{requestId:randomUUID(),code:a.data.code,display_name:'member'})).version;
    vv=success(await request('leave_room',member,mutation(a.roomId,vv))).version;assert.equal((await snapshot(a.roomId)).members.length,1);
    failure(await request('get_room_snapshot',member,{room_id:a.roomId}),403,'NOT_MEMBER');
    vv=success(await request('join_room',member,{requestId:randomUUID(),code:a.data.code,display_name:'rejoined'})).version;
    const s=success(await request('leave_room',host,mutation(a.roomId,vv)));assert.equal(s.state,'CANCELLED');return {status:200,state:s.state};});
  await check('invalid input400 and missing/forged JWT401',async()=>{
    failure(await request('join_room',host,{requestId:randomUUID(),code:'bad',display_name:'x'}),400,'INVALID_INPUT');
    assert.equal((await request('get_room_snapshot',null,{room_id:room})).status,401);
    assert.equal((await request('get_room_snapshot','invalid.token',{room_id:room})).status,401);return {invalid:400,missing:401,forged:401};});
  async function readyRoom() {
    const a=await newRoom();let vv=success(await request('join_room',member,{requestId:randomUUID(),code:a.data.code,display_name:'member'})).version;
    vv=success(await request('set_ready',host,mutation(a.roomId,vv,{ready:true}))).version;
    vv=success(await request('set_ready',member,mutation(a.roomId,vv,{ready:true}))).version;
    return {...a,version:vv};
  }
  await check('two concurrent retries produce same ACK and one mutation',async()=>{
    const a=await newRoom(),payload=mutation(a.roomId,a.version,{ready:true});
    const values=await Promise.all([request('set_ready',host,payload),request('set_ready',host,payload)]);
    assert.deepEqual(success(values[0]),success(values[1]));assert.equal((await snapshot(a.roomId)).version,a.version+1);
    return {statuses:values.map(r=>r.status),mutations:1};});
  await check('two real guests race final seat: one200 one409 capacity8',async()=>{
    const a=await newRoom(),fake=Array.from({length:6},()=>randomUUID());
    await fixture('sql',`begin;set constraints all deferred;
      ${fake.map(id=>`insert into auth.users(id,is_anonymous) values('${id}',true);
        insert into public.members(id,room_id,user_id,nickname,ready,history_consent,joined_at,left_at,version)
        values(gen_random_uuid(),'${a.roomId}','${id}','synthetic seat',false,false,statement_timestamp(),null,1);`).join('\n')}
      update public.rooms set roster_user_ids=roster_user_ids||array[${fake.map(id=>`'${id}'::uuid`).join(',')}],version=version+1 where id='${a.roomId}';commit;`);
    const values=await Promise.all([member,outsider].map(t=>request('join_room',t,{requestId:randomUUID(),code:a.data.code,display_name:'last seat'})));
    assert.deepEqual(values.map(r=>r.status).sort(),[200,409]);assert.equal(values.find(r=>r.status===409).body.messageKey,'ROOM_FULL');
    assert.equal((await snapshot(a.roomId)).members.length,8);return {statuses:[200,409],members:8};});
  await check('start/cancel race has one200 and one409, stable terminal',async()=>{
    const a=await readyRoom();const values=await Promise.all([request('start_round',host,mutation(a.roomId,a.version)),
      request('cancel_room',host,mutation(a.roomId,a.version,{confirm_cancel:true}))]);
    assert.deepEqual(values.map(r=>r.status).sort(),[200,409]);return {statuses:[200,409],state:(await snapshot(a.roomId)).state};});
  await check('join/start race cannot admit guest into locked roster',async()=>{
    const a=await readyRoom();const values=await Promise.all([request('start_round',host,mutation(a.roomId,a.version)),
      request('join_room',outsider,{requestId:randomUUID(),code:a.data.code,display_name:'racing guest'})]);
    assert.deepEqual(values.map(r=>r.status).sort(),[200,409]);const s=await snapshot(a.roomId);
    assert.equal(s.members.length,s.state==='ROUND_1'?2:3);return {statuses:[200,409],state:s.state,members:s.members.length};});
  await check('context/ready race has no lost update',async()=>{
    const a=await readyRoom(),c=create();delete c.display_name;
    const values=await Promise.all([request('update_context',host,{...c,room_id:a.roomId,expected_version:a.version,radius_m:1700}),
      request('set_ready',member,mutation(a.roomId,a.version,{ready:false}))]);
    assert.deepEqual(values.map(r=>r.status).sort(),[200,409]);assert.equal((await snapshot(a.roomId)).version,a.version+1);
    return {statuses:[200,409],mutations:1};});
  await check('changed catalogue projection forces CONTEXT_CHANGED and reset ready',async()=>{
    const a=await readyRoom();await fixture('sql',`update public.dishes set name='GM19 revalidation',version=version+1 where id='${ids.dishId}';`);
    failure(await request('start_round',host,mutation(a.roomId,a.version)),409,'CONTEXT_CHANGED');
    const s=await snapshot(a.roomId);assert.ok(s.members.every(m=>!m.ready));assert.equal(s.version,a.version+1);
    await fixture('sql',`update public.dishes set name='GM18 synthetic dish',version=version+1 where id='${ids.dishId}';`);
    return {status:409,messageKey:'CONTEXT_CHANGED',readyReset:true};});
  await check('past desiredAt resets ready and returns DESIRED_TIME_PASSED',async()=>{
    const a=await readyRoom();await fixture('sql',`update public.rooms set desired_at=statement_timestamp()-interval '1 second',version=version+1 where id='${a.roomId}';`);
    failure(await request('start_round',host,mutation(a.roomId,a.version+1)),400,'DESIRED_TIME_PASSED');
    assert.ok((await snapshot(a.roomId)).members.every(m=>!m.ready));return {status:400,readyReset:true};});
  await check('stale/empty offering pool cannot start',async()=>{
    const a=await readyRoom();await fixture('sql',"update public.venue_dishes set valid_until=statement_timestamp()+interval '5 minutes',version=version+1 where review_status='published';");
    failure(await request('start_round',host,mutation(a.roomId,a.version)),409,'NO_ELIGIBLE_FOOD');
    assert.equal((await snapshot(a.roomId)).state,'LOBBY');
    await fixture('sql',"update public.venue_dishes set valid_until=statement_timestamp()+interval '6 days',version=version+1 where review_status='published';");
    return {status:409,messageKey:'NO_ELIGIBLE_FOOD',state:'LOBBY'};});
  await check('expired room410 at database cutoff',async()=>{
    const a=await newRoom();await fixture('sql',`update public.rooms set expires_at=statement_timestamp(),version=version+1 where id='${a.roomId}';`);
    return failure(await request('get_room_snapshot',host,{room_id:a.roomId}),410,'ROOM_EXPIRED');});
  await check('atomic create budget10/min then429 with retry; ACK survives budget',async()=>{
    await fixture('sql',`delete from gm19_private.rate_windows where user_id='${guests[0].user.id}' and operation='create_room';`);
    const values=await Promise.all(Array.from({length:11},()=>request('create_room',host,create({anchor_id:randomUUID()}))));
    assert.equal(values.filter(r=>r.status===400).length,10);assert.equal(values.filter(r=>r.status===429).length,1);
    assert.equal(values.find(r=>r.status===429).body.retryAfterSeconds,60);
    assert.deepEqual(success(await request('create_room',host,createBody)),initial);
    return {allowed:10,limited:1,replay:200};});
  await check('snapshot budget60/min then429 isolated by identity',async()=>{
    await fixture('sql',`delete from gm19_private.rate_windows where operation='get_room_snapshot';`);
    const values=await Promise.all(Array.from({length:61},()=>request('get_room_snapshot',host,{room_id:room})));
    assert.equal(values.filter(r=>r.status===200).length,60);assert.equal(values.filter(r=>r.status===429).length,1);
    assert.equal((await request('get_room_snapshot',member,{room_id:room})).status,200);return {allowed:60,limited:1,otherIdentity:200};});
  await check('ACK private payload cascades with public idempotency retention',async()=>{
    const count=await fixture('sql',`select count(*) from gm19_private.acks where idempotency_id not in(select id from public.idempotency);`);assert.equal(count.trim(),'0');
    await fixture('sql',`delete from public.idempotency where operation='create_room' and request_id='${createBody.requestId}';`);
    assert.equal((await fixture('sql',`select count(*) from gm19_private.acks where request_id='${createBody.requestId}';`)).trim(),'0');return {dangling:0,cascade:true};});
  await check('real GM-07 client consumes room lifecycle responses and typed errors',async()=>{
    await fixture('sql','delete from gm19_private.rate_windows;');
    const c=createApiClient('real',{baseUrl:base,publicKey:key,initialToken:host});
    const context={anchorId:ids.anchorId,radiusM:1500,desiredAt:new Date(Date.now()+1800000).toISOString(),serviceMode:'dine_in',mealSlot:'dinner',avoidRecent:false};
    const made=await c.createRoom({displayName:'GM19 typed client',context});assert.equal(made.ok,true,JSON.stringify(made));
    assert.ok(made.requestId.startsWith('req_'));assert.deepEqual(await c.createRoom({displayName:'GM19 typed client',context,requestId:made.requestId}),made);
    const got=await c.getRoomSnapshot(made.data.roomId);assert.equal(got.ok,true,JSON.stringify(got));
    const denied=await createApiClient('real',{baseUrl:base,publicKey:key,initialToken:outsider}).getRoomSnapshot(made.data.roomId);
    assert.equal(denied.ok,false);assert.equal(denied.error.messageKey,'NOT_MEMBER');
    const m=createApiClient('real',{baseUrl:base,publicKey:key,initialToken:member});
    const joined=await m.joinRoom({code:made.data.code,displayName:'GM19 typed member'});assert.equal(joined.ok,true,JSON.stringify(joined));let vv=joined.version;
    const pref=await m.updatePreferences({roomId:made.data.roomId,expectedVersion:vv,preferences:{cuisineIds:[],categoryIds:[],historyConsent:false}});assert.equal(pref.ok,true,JSON.stringify(pref));vv=pref.version;
    const changed=await c.updateContext({roomId:made.data.roomId,expectedVersion:vv,context});assert.equal(changed.ok,true,JSON.stringify(changed));vv=changed.version;
    const rh=await c.setReady({roomId:made.data.roomId,expectedVersion:vv,ready:true});assert.equal(rh.ok,true,JSON.stringify(rh));vv=rh.version;
    const rm=await m.setReady({roomId:made.data.roomId,expectedVersion:vv,ready:true});assert.equal(rm.ok,true,JSON.stringify(rm));vv=rm.version;
    const started=await c.startRound({roomId:made.data.roomId,expectedVersion:vv});assert.equal(started.ok,true,JSON.stringify(started));vv=started.version;
    const locked=await m.leaveRoom({roomId:made.data.roomId,expectedVersion:vv});assert.equal(locked.ok,false);assert.equal(locked.error.messageKey,'ROOM_LOCKED');
    const cancelled=await m.cancelRoom({roomId:made.data.roomId,expectedVersion:vv,confirmCancel:true});assert.equal(cancelled.ok,true,JSON.stringify(cancelled));
    return {rpcCount:9,opaqueRequestIdReplay:true,typedErrors:['NOT_MEMBER','ROOM_LOCKED']};});
  await check('multi-choice own preferences rerank shared pool and reset all ready',async()=>{
    await fixture('expand');const a=await readyRoom();const before=await snapshot(a.roomId);
    assert.equal(before.pool.length,2);const target=before.pool[1];
    const r=success(await request('update_preferences',member,mutation(a.roomId,a.version,{cuisine_ids:[],category_ids:[target.categoryIds[0]],temperature:null,flavor:null,history_consent:false})));
    const after=await snapshot(a.roomId);assert.equal(after.pool[0].dishId,target.dishId);assert.ok(after.members.every(m=>!m.ready));assert.ok(after.poolVersion>before.poolVersion);
    assert.deepEqual(after.ownPreferences.categoryIds,[]);
    const repeated=success(await request('update_preferences',member,mutation(a.roomId,r.version,{cuisine_ids:[],category_ids:[target.categoryIds[0]],temperature:null,flavor:null,history_consent:false})));
    const again=await snapshot(a.roomId);assert.deepEqual(again.pool,after.pool);assert.equal(again.poolVersion,after.poolVersion);
    return {choices:2,private:true,readyReset:true,stableRepeatedInput:true,version:repeated.version};});
  await check('dataset version change resets ready once; next confirmed start succeeds',async()=>{
    const a=await readyRoom(),changed=await fixture('dataset-next');
    failure(await request('start_round',host,mutation(a.roomId,a.version)),409,'CONTEXT_CHANGED');
    const s=await snapshot(a.roomId);assert.equal(s.datasetVersion,changed.datasetVersion);assert.ok(s.members.every(m=>!m.ready));
    let vv=success(await request('set_ready',host,mutation(a.roomId,s.version,{ready:true}))).version;
    vv=success(await request('set_ready',member,mutation(a.roomId,vv,{ready:true}))).version;
    const started=success(await request('start_round',host,mutation(a.roomId,vv)));assert.equal(started.state,'ROUND_1');
    report.datasetVersion=changed.datasetVersion;
    return {changedStatus:409,reconfirmedStatus:200,datasetVersion:changed.datasetVersion};});
  await check('response lost after database commit replays ACK without new mutation',async()=>{
    await fixture('sql',"delete from gm19_private.rate_windows where operation='create_room';");
    let drop=true;const proxy=createServer(async(req,res)=>{try{
      const chunks=[];for await(const chunk of req)chunks.push(chunk);
      const r=await fetch(base+req.url,{method:'POST',headers:{apikey:key,'Content-Type':'application/json',Authorization:'Bearer '+host},body:Buffer.concat(chunks)});
      const body=await r.text();if(drop){drop=false;res.destroy();return;}res.writeHead(r.status,{'Content-Type':'application/json'});res.end(body);
    }catch{res.destroy();}});
    await new Promise(r=>proxy.listen(0,'127.0.0.1',r));const body=create({requestId:'req_after_commit_'+randomUUID()});
    try{await assert.rejects(request('create_room',host,body,'http://127.0.0.1:'+proxy.address().port));
      const replay=success(await request('create_room',host,body));assert.equal(replay.requestId,body.requestId);
      assert.equal((await fixture('sql',`select count(*) from public.idempotency where request_id=gm19_private.request_uuid('${body.requestId}') and user_id='${guests[0].user.id}';`)).trim(),'1');
      return {droppedAfterCommit:true,retryStatus:200,mutations:1};
    }finally{await new Promise(r=>proxy.close(r));}});
}
try {
  validateConfig(readFileSync(resolve(root,'supabase/config.toml'),'utf8'));
  status=JSON.parse(await runCommand(process.execPath,[resolve(root,'node_modules/supabase/dist/supabase.js'),'status','--output','json','--workdir',root],{quiet:true}));
  authBase=validateApiUrl(status.API_URL);key=status.ANON_KEY;
  if(reuse) {
    assert.equal(saved.endpoint,'http://127.0.0.1:54331');base=saved.endpoint;
    const text=readFileSync(envFile,'utf8'),env=Object.fromEntries([...text.matchAll(/^  ([A-Za-z]+): (.*)$/gm)].map(m=>[m[1],m[2].trim()]));
    for(const role of ['hostToken','memberToken','outsiderToken']) {
      const payload=JSON.parse(Buffer.from(env[role].split('.')[1],'base64url').toString());
      assert.equal(payload.user_metadata.gm19_test_namespace,namespace);guests.push({user:{id:payload.sub},access_token:env[role]});
    }
    [host,member,outsider]=guests.map(g=>g.access_token);
    ids=JSON.parse((await fixture('sql',`select jsonb_build_object('anchorId','${env.anchorId}',
      'dishId',(select id from public.dishes where review_status='published' limit 1),
      'datasetVersion',(select dataset_version from public.coverage_areas where review_status='published' limit 1));`)).trim());
    report.datasetVersion=ids.datasetVersion;report.endpoint=base;
    const sql=await fixture('sql',readFileSync(resolve(root,'supabase/tests/database/GM-19_room_lifecycle.test.sql'),'utf8'));
    assert.ok(!/^not ok /m.test(sql));assert.equal((sql.match(/^ok \d+ /gm)??[]).length,13);report.sql={result:'Pass',assertions:13};
    await writeFile(resolve(root,'docs/evidence/roadmap-v2/GM-19/sql-run.txt'),sql);
    await fixture('sql','delete from gm19_private.rate_windows;delete from gm18_api_private.read_windows;');
    await tests();report.result='Pass';await saveReport();
    await fixture('sql','delete from gm19_private.rate_windows;delete from gm18_api_private.read_windows;');
  } else {
  for(let i=0;i<3;i++) {const res=await fetch(authBase+'/auth/v1/signup',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},
    body:JSON.stringify({data:{display_name:'GM19 synthetic '+i,gm18_test_namespace:namespace,gm19_test_namespace:namespace}})});
    assert.equal(res.status,200);guests.push(await res.json());}
  [host,member,outsider]=guests.map(g=>g.access_token);
  dbInfo=await fixture('create');ids=await fixture('positive');report.datasetVersion=ids.datasetVersion;
  const sql=await fixture('sql',readFileSync(resolve(root,'supabase/tests/database/GM-19_room_lifecycle.test.sql'),'utf8'));
  await writeFile(resolve(root,'docs/evidence/roadmap-v2/GM-19/sql-run.txt'),sql);
  assert.ok(!/^not ok /m.test(sql));assert.equal((sql.match(/^ok \d+ /gm)??[]).length,13);report.sql={result:'Pass',assertions:13};
  const restInfo=JSON.parse(await docker(['inspect','supabase_rest_gi-cung-duoc-local']))[0];
  const dbUrl=new URL(status.DB_URL);assert.ok(['localhost','127.0.0.1'].includes(dbUrl.hostname));
  dbUrl.hostname='supabase_db_gi-cung-duoc-local';dbUrl.port='5432';dbUrl.pathname='/'+dbInfo.database;
  await docker(['run','--rm','--pull','never','-d','--name',container,'--network',Object.keys(restInfo.NetworkSettings.Networks)[0],'-p','127.0.0.1::3000',
    '-e','PGRST_DB_URI','-e','PGRST_JWT_SECRET','-e','PGRST_DB_ANON_ROLE=anon','-e','PGRST_DB_SCHEMAS=public',restInfo.Config.Image],
    {PGRST_DB_URI:dbUrl.toString(),PGRST_JWT_SECRET:restInfo.Config.Env.find(v=>v.startsWith('PGRST_JWT_SECRET=')).slice(17)});started=true;
  const binding=JSON.parse(await docker(['inspect',container]))[0].NetworkSettings.Ports['3000/tcp'][0];
  const restBase='http://127.0.0.1:'+binding.HostPort;
  for(let i=0;i<40;i++){try{if((await fetch(restBase+'/')).ok)break;}catch{}if(i===39)throw Error('REST startup failed');await new Promise(r=>setTimeout(r,250));}
  gateway=createServer(async(req,res)=>{try{
    if(req.method==='POST' && req.url==='/__stop' && req.headers['x-gm19-control']===control){res.writeHead(200);res.end('{}');setTimeout(()=>stopResolve?.(),50);return;}
    if(req.method==='POST' && req.url==='/__reset' && req.headers['x-gm19-control']===control){
      await fixture('sql','delete from gm19_private.rate_windows;delete from gm18_api_private.read_windows;');res.writeHead(200);res.end('{}');return;
    }
    if(req.method!=='POST'||!req.url.startsWith('/rest/v1/rpc/')){res.writeHead(404);res.end('{}');return;}
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const upstream=await fetch(restBase+req.url.replace('/rest/v1',''),{method:'POST',headers:{'Content-Type':'application/json',
      ...(req.headers.authorization?{Authorization:req.headers.authorization}:{})},body:Buffer.concat(chunks),signal:AbortSignal.timeout(20000)});
    res.writeHead(upstream.status,{'Content-Type':'application/json'});res.end(await upstream.text());
  }catch{res.writeHead(502);res.end('{}');}});
  await new Promise((ok,bad)=>{gateway.once('error',bad);gateway.listen(54331,'127.0.0.1',ok);});base='http://127.0.0.1:54331';report.endpoint=base;
  try { await tests();report.result='Pass'; }
  catch(e) {report.failedCase=e.message;console.error('GM19 case failed:',e.message);if(!keep)throw e;}
  await saveReport();
  if(keep){
    await fixture('sql','delete from gm19_private.rate_windows;delete from gm18_api_private.read_windows;');
    const run=randomUUID();await writeFile(envFile,'vars {\n'+Object.entries({baseUrl:base,publicKey:key,hostToken:host,memberToken:member,outsiderToken:outsider,
      anchorId:ids.anchorId,desiredAt:new Date(Date.now()+3600000).toISOString(),runId:run,roomId:'',roomCode:'',roomVersion:''}).map(([k,v])=>'  '+k+': '+v).join('\n')+'\n}\n');
    console.log('BRUNO_READY endpoint='+base+' namespace='+namespace+' (Ctrl+C to cleanup)');
    await writeFile(stateFile,JSON.stringify({endpoint:base,control,namespace}));
    console.log('Stop safely: node scripts/gm19_http_stop.mjs');
    await new Promise(resolve=>{stopResolve=resolve;process.once('SIGINT',resolve);process.once('SIGTERM',resolve);});
  }
  }
}catch(e){report.failedCase=e.message;console.error('GM19 failed:',e.message);process.exitCode=1;}
finally {
  if(!reuse) {
  if(gateway)await new Promise(r=>gateway.close(r));
  if(started)await docker(['stop',container]).catch(()=>{report.postgrestCleanup='Fail';report.result='Fail';});
  if(guests.length)await fixture('cleanup').then(()=>report.cleanup='owned DB and guests removed').catch(e=>{report.cleanup=e.message;report.result='Fail';});
  await rm(envFile,{force:true});await saveReport();console.log(JSON.stringify({result:report.result,cases:cases.length,cleanup:report.cleanup}));
  await rm(stateFile,{force:true});
  } else {
    report.cleanup='active owned fixture retained for Bruno; use gm19_http_stop.mjs';await saveReport();
    console.log(JSON.stringify({result:report.result,cases:cases.length,fixture:'retained'}));
  }
}
