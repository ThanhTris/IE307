// GM20.4 owned synthetic QA only; no production activation.
import {createServer} from 'node:http';
import {spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {writeFile,chmod,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {resolve,relative,isAbsolute} from 'node:path';
const root=process.cwd();
const reportDirectory=resolve(process.env.GM_CANONICAL_REPORT_DIRECTORY||resolve(root,'.work/gm20-canonical'));
const reportRelative=relative(resolve(root,'.work'),reportDirectory);
assert.ok(reportRelative&&!reportRelative.startsWith('..')&&!isAbsolute(reportRelative),'Canonical reports must stay in the ignored workspace');
const gm03Signals=['GM03_QA_WORKDIR','GM03_QA_MANIFEST'].some(name=>Boolean(process.env[name]));
const ciSignals=['GM_V4_QA_WORKDIR','GM_V4_QA_PROJECT_ID','GM_V4_QA_CONTAINER'].some(name=>Boolean(process.env[name]));
assert.notEqual(gm03Signals,ciSignals,'Set exactly one QA interface: GM-03 manifest or GM_V4_QA_* CI environment');
const qaMode=gm03Signals?'gm03':'ci';
const qa=qaMode==='gm03'?process.env.GM03_QA_WORKDIR:process.env.GM_V4_QA_WORKDIR;
const manifestPath=qaMode==='gm03'?process.env.GM03_QA_MANIFEST:null;
const manifest=manifestPath?JSON.parse(readFileSync(manifestPath,'utf8')):null;
if(qaMode==='gm03')assert.ok(qa&&manifestPath&&manifest?.format==='gm03-qa-manifest-v1','GM-03 QA requires its sealed run manifest and workdir');
const project=qaMode==='gm03'?manifest.projectId:process.env.GM_V4_QA_PROJECT_ID;
const container=qaMode==='gm03'?manifest.containerName:(process.env.GM_V4_QA_CONTAINER||'supabase_db_'+project);
const expectedWorkdir=qaMode==='gm03'?manifest.workdir:qa;
const validProject=qaMode==='gm03'?/^gm03qa-[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/.test(project||''):/^ie307-dish-v4-qa-\d{8}(?:-\d+-\d+)?$/.test(project||'');
assert.ok(qa&&project&&container&&validProject,'QA setup must identify an isolated project; refusing the app database');
assert.equal(container,'supabase_db_'+project,'QA container must match the exact run project');
const statusRun=spawnSync(process.execPath,[resolve(root,'node_modules/supabase/dist/supabase.js'),'status','--output','json','--workdir',qa],{encoding:'utf8',maxBuffer:1024*1024});
assert.equal(statusRun.status,0,'QA Supabase status failed; inspect the setup report');
const status=JSON.parse(statusRun.stdout);
const base=status.API_URL||status.api?.url, key=status.ANON_KEY||status.PUBLISHABLE_KEY, contractVersion='dish-session-v4/roadmap-v2/GM-07.B-supplement';
assert.ok(base&&key,'QA Supabase status omitted the local API URL or publishable key');
assert.equal(new URL(base).hostname,'127.0.0.1','QA API must bind to loopback');
const apiPort=qaMode==='gm03'?manifest.endpoint.apiPort:54361;
assert.equal(new URL(base).port,String(apiPort),'QA API must use its explicitly owned port');
if(qaMode==='gm03')assert.equal(base,manifest.endpoint.baseUrl,'QA API origin must match the sealed manifest');
const policyVersion='dish-decision-v4/ADR-019-30PCT-MIN1', pref={cuisineIds:[],categoryIds:[],temperature:null,flavor:null,budget:null,avoidRecent:false};
const results=[];const users=[];const contractSamples=[];
function sqlRaw(q){return execFileSync('docker',['exec','-i',container,'psql','-X','-q','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At','-c',q],{encoding:'utf8'}).trim();}
function sql(q){const inspected=JSON.parse(execFileSync('docker',['inspect',container],{encoding:'utf8'}))[0];const labels=inspected.Config.Labels||{};assert.equal(inspected.Name,'/'+container);assert.equal(labels['com.supabase.cli.project'],project);assert.equal(String(labels['com.supabase.cli.workdir']||'').replaceAll('\\','/').toLowerCase(),String(expectedWorkdir).replaceAll('\\','/').toLowerCase());assert.equal(inspected.State.Running,true);const owner=qaMode==='gm03'?sqlRaw("select owner_uuid::text from gm03_qa_private.owner_manifest where run_id='"+manifest.runId.replaceAll("'","''")+"';"):sqlRaw('select namespace::text from public.gm40_qa_owner');assert.equal(owner,qaMode==='gm03'?manifest.ownerUuid:process.env.GM_V4_OWNER_NAMESPACE,'QA owner marker must match this run');return sqlRaw(q);}
async function guest(name){const r=await fetch(base+'/auth/v1/signup',{method:'POST',headers:{apikey:key,'content-type':'application/json'},body:JSON.stringify({data:{display_name:name,gm07_v4_qa:project}})});const b=await r.json();assert.equal(r.status,200,'guest signup failed '+r.status);assert.ok(b.access_token);const u={id:b.user.id,token:b.access_token,refresh:b.refresh_token};users.push(u);return u;}
async function api(u,command,args={},options={}){const payload={contractVersion,...args},request={command,payload},wire=options.serialize?options.serialize(request):JSON.stringify(request);const r=await fetch(base+'/rest/v1/rpc/dish_session',{method:'POST',headers:{apikey:key,...(u?{authorization:'Bearer '+u.token}:{}),'content-type':'application/json'},body:wire});let body;try{body=await r.json();}catch{body={};}contractSamples.push('{"request":'+wire+',"response":'+JSON.stringify(body)+(options.requestValid===false?',"requestValid":false':'')+'}');return {status:r.status,body};}
async function legacyRpc(u,name,args={}){const r=await fetch(base+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,...(u?{authorization:'Bearer '+u.token}:{}),'content-type':'application/json'},body:JSON.stringify(args)});let body;try{body=await r.json();}catch{body={};}return {status:r.status,body};}
function pass(name,expected,actual){assert.deepEqual(actual,expected,name);results.push({case:name,result:'Pass',expected,actual});console.log('PASS',name);}
function expectOk(response,name){assert.equal(response.status,200,name+' http '+response.status+' '+(response.body.error?.messageKey??response.body.message??''));assert.equal(response.body.ok,true,name+' rpc rejected '+(response.body.error?.messageKey??''));return response.body.data;}
function expectFail(response,code,status,name){assert.equal(response.status,status,name+' http '+response.status);assert.equal(response.body.ok,false,name+' unexpected success');assert.equal(response.body.error?.messageKey,code,name+' error code');results.push({case:name,result:'Pass',expected:{status,code},actual:{status:response.status,code:response.body.error.messageKey,details:response.body.error.details??{}}});console.log('PASS',name);return response.body.error;}
function requestId(prefix){return prefix+'-'+Date.now()+'-'+randomUUID().slice(0,8);}
async function waitWorker(){for(let i=0;i<30;i++){if(sql("select exists(select 1 from dish_v4_private.runtime where last_tick>clock_timestamp()-interval '15 seconds')")==='t'){results.push({case:'v4 worker heartbeat verified',result:'Pass',expected:true,actual:true});return;}await new Promise(r=>setTimeout(r,1000));}throw new Error('QA v4 worker did not become ready');}
async function create(u,count=10,meal='lunch'){return expectOk(await api(u,'create',{requestId:requestId('create'),displayName:'QA host',settings:{dishCount:count,mealSlot:meal,desiredAt:null},preferences:pref}),'create');}
async function snapshot(u,roomId){return expectOk(await api(u,'snapshot',{roomId}),'snapshot');}
async function join(u,code,name){return expectOk(await api(u,'join',{requestId:requestId('join'),code,displayName:name}),'join');}
function votesFor(pool,fn){return pool.map((d,i)=>({roundDishId:d.roundDishId,choice:fn(d,i)}));}
function versionArgs(room,s,round){return {roomId:room,expectedVersion:s.version,round:s.round,poolVersion:s.poolVersion};}
async function submit(u,room,s,votes,id){return api(u,'submit',{...versionArgs(room,s,s.round),requestId:id||requestId('submit'),votes});}
async function setActive(id){sql("update dish_v3_private.catalogues set active=false where active; update dish_v3_private.catalogues set active=true where id='"+id.replaceAll("'","''")+"';");}

await waitWorker();
const h=await guest('canonical-host'),m=await guest('canonical-member'),x=await guest('canonical-outsider');
const setEnabled=value=>sql('update gm20_canonical_private.configuration set allow_new_sessions='+value+' where singleton');
setEnabled(false);
expectFail(await api(h,'create',{requestId:requestId('disabled'),displayName:'QA',settings:{dishCount:10,mealSlot:'lunch',desiredAt:null},preferences:pref}),'UNSUPPORTED_CONTRACT_VERSION',400,'server flag blocks new supplement creation');
setEnabled(true);
const real=process.env.GM_V4_REAL_RELEASE_ID,synthetic=process.env.GM_V4_SYNTHETIC_RELEASE_ID;
await setActive(synthetic);
// Preserve numeric lexemes on the HTTP wire and in Python JSON Schema input.
// JS JSON.stringify({dishCount:10.0}) alone would send10 and miss the regression.
async function countLiteral(literal,expectedCount){
 const value=JSON.parse(literal);let rawRequest;
 const response=await api(h,'create',{requestId:requestId('count-literal'),displayName:'QA count host',settings:{dishCount:value,mealSlot:'dinner',desiredAt:null},preferences:pref},{
  requestValid:expectedCount!==null,
  serialize:request=>{
   const text=JSON.stringify(request),property='"dishCount":'+JSON.stringify(value);
   assert.equal(text.split(property).length,2,'one controlled dishCount field');
   rawRequest=text.replace(property,'"dishCount":'+literal);
   assert.deepEqual(JSON.parse(rawRequest),request,'raw numeric literal preserves request meaning');
   return rawRequest;
  }
 });
 return {response,rawRequest};
}
for(const [literal,count] of [['10',10],['10.0',10],['20',20],['20.0',20],['10.5',null],['9',null],['21',null],['"10"',null],['null',null],['true',null]]){
 const {response,rawRequest}=await countLiteral(literal,count);
 if(count===null)expectFail(response,'INVALID_INPUT',400,'raw create rejects dishCount '+literal);
 else{
  const made=expectOk(response,'raw create dishCount '+literal),s=await snapshot(h,made.roomId);
  pass('raw create accepts dishCount '+literal,{status:200,dishCount:count,poolCount:count},{status:response.status,dishCount:s.settings.dishCount,poolCount:s.pool.length});
 }
 results.at(-1).input={rawRequest};
}
// A decimal integer must still honour the existing shortage guard, not fill down.
const shortId='gm20-count-shortage-'+project;
sql("insert into dish_v3_private.catalogues(id,source_sha,cards,test_only,active) select '"+shortId+"',encode(extensions.digest(subset.cards::text,'sha256'),'hex'),subset.cards,true,false from (select jsonb_agg(card order by ord) as cards from dish_v3_private.catalogues c cross join lateral jsonb_array_elements(c.cards) with ordinality t(card,ord) where c.id='"+synthetic+"' and ord<=9) subset on conflict(id) do nothing;");
await setActive(shortId);
const shortage=await countLiteral('20.0',20);
const shortageError=expectFail(shortage.response,'INSUFFICIENT_DISHES',409,'decimal create preserves shortage');
assert.deepEqual(shortageError.details,{available:9,requested:20});results.at(-1).input={rawRequest:shortage.rawRequest};
await setActive(synthetic);

const oldB=JSON.parse(sql("select coalesce(jsonb_object_agg(id::text,projection),'{}'::jsonb) from dish_v4_private.results"));
async function room(people=[h,m],count=10){
 const made=await create(people[0],count);for(const u of people.slice(1))await join(u,made.code,'Canonical member');
 const s=await snapshot(people[0],made.roomId);
 expectOk(await api(people[0],'start',{requestId:requestId('start'),roomId:made.roomId,expectedVersion:s.version}),'start supplement');
 return {id:made.roomId,people};
}
async function send(u,r,choice,id){const s=await snapshot(u,r.id);const request={...versionArgs(r.id,s),requestId:id||requestId('submit'),votes:votesFor(s.pool,choice)};const response=await api(u,'submit',request);expectOk(response,'complete ballot');return {request,response};}
async function waiting(u,r,id){const s=await snapshot(u,r.id);const request={...versionArgs(r.id,s),requestId:id||requestId('waiting')};const response=await api(u,'waiting',request);expectOk(response,'enter waiting after ACK');return {request,response};}
async function allWait(r){for(const u of r.people)await waiting(u,r);return snapshot(r.people[0],r.id);}
async function result(u,r){return expectOk(await api(u,'result',{roomId:r.id}),'persisted canonical result');}
function authority(r,terminal){
 const counts=JSON.parse(sql("select json_build_object('canonical',(select count(*) from gm06_canonical.results where room_ref_id='"+r.id+"'),'legacy',(select count(*) from dish_v4_private.results where room_id='"+r.id+"'),'registry',(select count(*) from gm17_private.result_refs where id='"+terminal.resultId+"'),'outbox',(select count(*) from gm20_canonical_private.terminal_outbox where result_id='"+terminal.resultId+"'),'audience',(select count(*) from gm20_canonical_private.outbox_audience where result_id='"+terminal.resultId+"'))"));
 pass('single canonical authority / registry / outbox '+r.id,{canonical:1,legacy:0,registry:1,outbox:1,audience:r.people.length},counts);
 pass('seed stays private with pinned selector '+r.id,'t',sql("select algorithm='u32-murmur3-rejection-v1' and seed~'^[0-9a-f]{8}$' from gm20_canonical_private.selection_secrets where result_id='"+terminal.resultId+"'"));
 pass('new result does not create legacy event reference '+r.id,'0',sql("select count(*) from public.events where room_id='"+r.id+"' and kind='ROOM_RESULT_READY'"));
}

pass('all private candidate tables force RLS','t',sql("select count(*)=7 and bool_and(c.relrowsecurity and c.relforcerowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='gm20_canonical_private' and c.relkind='r'"));
const aliasCall=await legacyRpc(h,'dish_session_baseline_0111',{command:'history',payload:{contractVersion:'dish-session-v4/roadmap-v2/GM-07.B'}});
pass('private baseline alias cannot bypass routing',403,aliasCall.status);
// R1 winner, all ties, canonical projection and separate ACK/version namespace.
const first=await room();const sFirst=await snapshot(h,first.id);
const accepted=await send(h,first,()=> 'WANT');await send(m,first,()=> 'WANT');
let terminal=(await allWait(first)).result;
pass('R1 unanimous terminal pairing',['DECIDED',1,'UNANIMOUS_WANT',2],[terminal.status,terminal.round,terminal.reasonCode,terminal.round1BallotCount]);
pass('Top3 bounded and contains winner',true,terminal.topDishes.length===3&&terminal.topDishes.some(t=>t.isWinner&&t.dish.dishId===terminal.winner.dishId));
pass('R1 top3 points/dense rank',true,terminal.topDishes.every(t=>t.score===4&&t.rank===1));
pass('R1 final row identity retained',sFirst.pool.find(d=>d.dishId===terminal.winner.dishId).roundDishId,terminal.winner.roundDishId);
authority(first,terminal);
pass('result reads actual canonical bytes',terminal,await result(m,first));
pass('no consent means no canonical history','0',sql("select count(*) from gm06_canonical.histories where result_id='"+terminal.resultId+"'"));
pass('terminal DTO never exposes private evaluator/seed',false,['seed','eligibleIds','candidateIds','round1','round2','member_fingerprint'].some(k=>Object.hasOwn(terminal,k)));
pass('old submit receipt replays after terminal',accepted.response,await api(h,'submit',accepted.request));
expectFail(await api(h,'submit',{...accepted.request,votes:accepted.request.votes.map(v=>({...v,choice:'OK'}))}),'REQUEST_ID_REUSED',409,'same ID cannot change ballot payload');
expectFail(await api(x,'result',{roomId:first.id}),'NOT_MEMBER',403,'outsider cannot read canonical result');
expectFail(await legacyRpc(h,'dish_session',{command:'snapshot',payload:{contractVersion:'dish-session-v4/roadmap-v2/GM-07.B',roomId:first.id}}),'CONTRACT_MISMATCH',409,'B route cannot read supplement room');
const legacyMade=expectOk(await legacyRpc(h,'dish_session',{command:'create',payload:{contractVersion:'dish-session-v4/roadmap-v2/GM-07.B',requestId:requestId('legacy'),displayName:'B host',settings:{dishCount:10,mealSlot:'lunch',desiredAt:null},preferences:pref}}),'existing B creation');
expectFail(await api(h,'snapshot',{roomId:legacyMade.roomId}),'CONTRACT_MISMATCH',409,'supplement cannot reinterpret B room');
setEnabled(false);pass('disable creation retains pinned reader',terminal,await result(h,first));setEnabled(true);
await setActive(real);pass('catalogue switch cannot alter saved result',terminal,await result(m,first));await setActive(synthetic);
pass('private evaluator/seed/model inaccessible','t',sql("select not has_schema_privilege('authenticated','gm20_canonical_private','USAGE') and not has_schema_privilege('service_role','gm20_canonical_private','USAGE') and not has_schema_privilege('authenticated','gm06_canonical','USAGE')"));

// Controlled PostgreSQL failure after canonical/registry/member/history inserts.
await consent(h,'personal',true);await consent(m,'personal',true);await consent(h,'group',true);await consent(m,'group',true);
const faulted=await room();await send(h,faulted,()=> 'WANT');await send(m,faulted,()=> 'WANT');await waiting(h,faulted);
const preFault=await snapshot(m,faulted.id);const faultRequest={...versionArgs(faulted.id,preFault),requestId:requestId('fault-last-wait')};
const registryBefore=sql('select count(*) from gm17_private.result_refs');
const historyBefore=sql('select json_build_array((select count(*) from gm06_canonical.histories),(select count(*) from gm06_canonical.history_receipts),(select count(*) from gm06_canonical.history_audience))');
sql("create function gm20_canonical_private.qa_fault() returns trigger language plpgsql as $$begin if new.room_ref_id='"+faulted.id+"' then raise exception 'GM20_QA_ROLLBACK';end if;return new;end$$; create trigger gm20_qa_fault before insert on gm20_canonical_private.terminal_outbox for each row execute function gm20_canonical_private.qa_fault();");
const failed=await legacyRpc(m,'dish_session',{command:'waiting',payload:{contractVersion,...faultRequest}});
pass('controlled database failure reaches HTTP',false,failed.status===200);
pass('registry rolled back',registryBefore,sql('select count(*) from gm17_private.result_refs'));
pass('scoped history payload/receipt/audience rolled back',historyBefore,sql('select json_build_array((select count(*) from gm06_canonical.histories),(select count(*) from gm06_canonical.history_receipts),(select count(*) from gm06_canonical.history_audience))'));
pass('canonical/result/outbox rolled back','0',sql("select (select count(*) from gm06_canonical.results where room_ref_id='"+faulted.id+"')+(select count(*) from gm20_canonical_private.terminal_outbox where room_ref_id='"+faulted.id+"')"));
pass('failed request did not save ACK','0',sql("select count(*) from gm20_canonical_private.request_acks where user_id='"+m.id+"' and request_id='"+faultRequest.requestId+"'"));
pass('failed last waiting did not change room version',preFault.version,(await snapshot(m,faulted.id)).version);
sql('drop trigger gm20_qa_fault on gm20_canonical_private.terminal_outbox; drop function gm20_canonical_private.qa_fault();');
expectOk(await api(m,'waiting',faultRequest),'retry after rollback');authority(faulted,await result(h,faulted));
pass('retry writes scoped history exactly once','3',sql("select count(*) from gm06_canonical.histories h join gm06_canonical.results r using(result_id) where r.room_ref_id='"+faulted.id+"'"));
await consent(h,'personal',false);await consent(m,'personal',false);await consent(h,'group',false);await consent(m,'group',false);

// Server commits a ballot; a local proxy drops its response before client receives it.
const lost=await room();const lostSnap=await snapshot(h,lost.id);
const lostRequest={...versionArgs(lost.id,lostSnap),requestId:requestId('response-loss'),votes:votesFor(lostSnap.pool,()=> 'WANT')};
const proxy=createServer(async(req,res)=>{
 try{const parts=[];for await(const chunk of req)parts.push(chunk);
  const upstream=await fetch(base+'/rest/v1/rpc/dish_session',{method:'POST',headers:{apikey:key,authorization:'Bearer '+h.token,'content-type':'application/json'},body:Buffer.concat(parts)});
  await upstream.arrayBuffer();res.destroy();
 }catch{res.destroy();}
});
await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));
let dropped=false;
try{await fetch('http://127.0.0.1:'+proxy.address().port,{method:'POST',body:JSON.stringify({command:'submit',payload:{contractVersion,...lostRequest}})});}catch{dropped=true;}
await new Promise(resolve=>proxy.close(resolve));
pass('actual response-loss transport failed locally',true,dropped);
expectOk(await api(h,'submit',lostRequest),'retry after actual lost response');
pass('lost response retry keeps one ballot','1',sql("select count(*) from dish_v4_private.ballots where room_id='"+lost.id+"' and user_id='"+h.id+"' and round=1"));
pass('lost response retry keeps one ACK','1',sql("select count(*) from gm20_canonical_private.request_acks where user_id='"+h.id+"' and request_id='"+lostRequest.requestId+"'"));

// Distinct attempts for the same accepted content do not append ballots.
const partial=await room();const p0=await snapshot(h,partial.id);
const votes=votesFor(p0.pool,()=> 'OK'),same={...versionArgs(partial.id,p0),requestId:requestId('content'),votes};
const dup=await Promise.all(Array.from({length:5},()=>api(h,'submit',same)));dup.forEach(r=>expectOk(r,'duplicate submit'));
pass('five submit retries same ACK',true,dup.every(r=>JSON.stringify(r)===JSON.stringify(dup[0])));
expectOk(await api(h,'submit',{...same,requestId:requestId('same-content')}),'new request same accepted content');
pass('one accepted ballot row','1',sql("select count(*) from dish_v4_private.ballots where room_id='"+partial.id+"' and round=1"));
expectFail(await api(h,'submit',{...same,requestId:requestId('changed-content'),votes:votesFor(p0.pool,()=> 'WANT')}),'ALREADY_SUBMITTED',409,'accepted intent cannot change votes');
await send(m,partial,()=> 'OK');let r2=await allWait(partial);
pass('all OK opens real R2',[2,10,3,null],[r2.round,r2.pool.length,r2.removalCap,r2.result]);
expectFail(await api(h,'submit',{...versionArgs(partial.id,r2),requestId:requestId('cap-plus-one'),votes:votesFor(r2.pool,(_,i)=>i<4?'REMOVE':'KEEP')}),'REMOVE_LIMIT',409,'actual R2 cap plus one rejected');
pass('invalid cap adds no R2 ACK/ballot','0',sql("select count(*) from dish_v4_private.ballots where room_id='"+partial.id+"' and round=2"));
await send(h,partial,(_,i)=>i<3?'REMOVE':'KEEP');await send(m,partial,()=> 'KEEP');r2=await allWait(partial);terminal=r2.result;
pass('R2 KEEP does not add points',true,terminal.topDishes.every(t=>t.score===2));
pass('R2 scoring cohort persisted',2,terminal.round1BallotCount);authority(partial,terminal);

async function singleton(remove){
 const r=await room();let before=await snapshot(h,r.id);const retained=before.pool[0].dishId;
 await send(h,r,d=>d.dishId===retained?'OK':'NO');await send(m,r,()=> 'OK');let second=await allWait(r);
 pass('singleton opens real R2 '+remove,[2,1,1,null],[second.round,second.pool.length,second.removalCap,second.result]);
 pass('singleton R2 gets new row ID '+remove,false,before.pool.some(d=>d.roundDishId===second.pool[0].roundDishId));
 pass('no implicit R2 ballots '+remove,'0',sql("select count(*) from dish_v4_private.ballots where room_id='"+r.id+"' and round=2"));
 await send(h,r,()=>remove?'REMOVE':'KEEP');await send(m,r,()=> 'KEEP');terminal=(await allWait(r)).result;
 pass('singleton terminal pairing '+remove,remove?['NO_CONSENSUS','ALL_REMOVED',0]:['DECIDED','ACCEPTABLE_FINAL',1],[terminal.status,terminal.reasonCode,terminal.topDishes.length]);
 if(!remove)pass('singleton winner uses final-round row',second.pool[0].roundDishId,terminal.winner.roundDishId);
 else pass('all removed has no fabricated winner',null,terminal.winner);
 authority(r,terminal);return {r,terminal};
}
await singleton(true);await singleton(false);
const empty=await room();await send(h,empty,()=> 'NO');await send(m,empty,()=> 'OK');terminal=(await allWait(empty)).result;
pass('empty R1 persists no-consensus',[1,'EMPTY_INTERSECTION',null,[],null,null],[terminal.round,terminal.reasonCode,terminal.winner,terminal.topDishes,terminal.scoreVersion,terminal.rankingVersion]);authority(empty,terminal);

// Host quorum uses current round denominator; timeout uses min1, not majority.
const u3=await guest('third'),u4=await guest('fourth');const q=await room([h,m,u3,u4]);
await send(h,q,()=> 'OK');await waiting(h,q);await send(m,q,()=> 'OK');let qs=await snapshot(h,q.id);
expectFail(await api(h,'finalize',{requestId:requestId('half'),roomId:q.id,expectedVersion:qs.version}),'NOT_READY',409,'exactly half cannot end waiting');
await send(u3,q,()=> 'OK');qs=await snapshot(h,q.id);
expectOk(await api(h,'finalize',{requestId:requestId('majority'),roomId:q.id,expectedVersion:qs.version}),'host current-round majority');
qs=await snapshot(h,q.id);pass('majority R1 advances with zero R2 ACK',[2,0,null],[qs.round,qs.submittedCount,qs.waitingStartedAt]);
expectFail(await api(h,'finalize',{requestId:requestId('r2-no-ack'),roomId:q.id,expectedVersion:qs.version}),'NOT_READY',409,'R1 majority cannot finalize empty R2');
await send(u4,q,()=> 'KEEP');await waiting(u4,q);qs=await snapshot(h,q.id);
expectFail(await api(h,'finalize',{requestId:requestId('r2-minority'),roomId:q.id,expectedVersion:qs.version}),'NOT_READY',409,'one R2 ballot not host majority');
sql("update dish_v4_private.sessions set waiting_started_at=clock_timestamp()-interval '61 seconds' where room_id='"+q.id+"';");
for(let i=0;i<30;i++){qs=await snapshot(h,q.id);if(qs.result)break;await new Promise(r=>setTimeout(r,1000));}
pass('real worker timeout accepts minority cohort','DECIDED',qs.result?.status);
pass('R1 score cohort differs from R2 submittedCount',[3,1],[qs.result.round1BallotCount,qs.submittedCount]);
pass('timeout R2 points use only R1',true,qs.result.topDishes.every(t=>t.score===3));authority(q,qs.result);

// Boundary denominators beyond the four-person timeout case above.
const quorumPeople=[h,m,u3,u4];while(quorumPeople.length<20)quorumPeople.push(await guest('quorum-'+quorumPeople.length));
for(const size of [2,3,5,20]){
 if(size===20)for(const person of quorumPeople){await consent(person,'personal',true);await consent(person,'group',true);}
 const qr=await room(quorumPeople.slice(0,size));const half=Math.floor(size/2);
 for(const person of qr.people.slice(0,half))await send(person,qr,()=> 'OK');
 await waiting(h,qr);let before=await snapshot(h,qr.id);
 expectFail(await api(h,'finalize',{requestId:requestId('boundary-half'),roomId:qr.id,expectedVersion:before.version}),'NOT_READY',409,'host half rejected M='+size);
 await send(qr.people[half],qr,()=> 'OK');before=await snapshot(h,qr.id);
 expectOk(await api(h,'finalize',{requestId:requestId('boundary-majority'),roomId:qr.id,expectedVersion:before.version}),'host majority M='+size);
 const after=await snapshot(h,qr.id);
 pass('host majority locks denominator M='+size,[size,2,0],[after.memberCount,after.round,after.submittedCount]);
 if(size===20){
  await send(h,qr,()=> 'KEEP');await waiting(h,qr);
  sql("update dish_v4_private.sessions set waiting_started_at=clock_timestamp()-interval '61 seconds' where room_id='"+qr.id+"';");
  let finished;for(let i=0;i<30;i++){finished=await snapshot(h,qr.id);if(finished.result)break;await new Promise(r=>setTimeout(r,1000));}
  pass('20-member actual terminal keeps R1 cohort',[20,11,1],[finished.memberCount,finished.result?.round1BallotCount,finished.submittedCount]);
  authority(qr,finished.result);
  pass('20-member group consent audience persists atomically','20',sql("select count(*) from gm06_canonical.history_audience a join gm06_canonical.histories h using(history_id,result_id) where h.result_id='"+finished.result.resultId+"' and h.scope='group'"));
 }

}

// Actual last-submit / host / worker race at the current deadline boundary.
const raced=await room([h,m,u3]);await send(h,raced,()=> 'WANT');await send(m,raced,()=> 'WANT');await waiting(h,raced);
const raceSnap=await snapshot(h,raced.id);
sql("update dish_v4_private.sessions set waiting_started_at=clock_timestamp()-interval '59.95 seconds' where room_id='"+raced.id+"';");
const raceReplies=await Promise.all([
 api(u3,'submit',{...versionArgs(raced.id,raceSnap),requestId:requestId('race-last-submit'),votes:votesFor(raceSnap.pool,()=> 'WANT')}),
 api(h,'finalize',{requestId:requestId('race-host'),roomId:raced.id,expectedVersion:raceSnap.version})]);
pass('race replies are ACK or explicit conflict/closed',true,raceReplies.every(r=>r.body.ok||['VERSION_CONFLICT','INVALID_ROOM_STATE','ROUND_CLOSED','NOT_READY'].includes(r.body.error?.messageKey)));
let raceFinal;for(let i=0;i<30;i++){raceFinal=await snapshot(h,raced.id);if(raceFinal.result)break;await new Promise(r=>setTimeout(r,1000));}
pass('host-submit-timeout race reaches terminal','DECIDED',raceFinal.result?.status);authority(raced,raceFinal.result);
pass('race scores use committed R1 cohort',true,raceFinal.result.topDishes.every(t=>t.score===2*raceFinal.result.round1BallotCount));
pass('race terminal cohort matches stored ACK count',Number(sql("select count(*) from dish_v4_private.ballots where room_id='"+raced.id+"' and round=1")),raceFinal.result.round1BallotCount);
expectFail(await api(h,'finalize',{requestId:requestId('choose-winner'),roomId:raced.id,expectedVersion:raceFinal.version,winner:raceFinal.result.winner.dishId},{requestValid:false}),'UNSUPPORTED_FIELD',400,'host cannot supply winner');

// Expired WAITING is rejected even before the worker's next tick; exact old ACK
// remains a historical receipt and does not re-open or mutate the room.
const expired=await room();const expReceipt=await send(h,expired,()=> 'OK');await waiting(h,expired);const expSnap=await snapshot(m,expired.id);
sql("begin;select set_config('dish_v4.writer','on',true);update public.rooms set created_at=clock_timestamp()-interval '2 hours',expires_at=clock_timestamp()-interval '1 hour',version=version+1 where id='"+expired.id+"';commit;");
expectFail(await api(m,'submit',{...versionArgs(expired.id,expSnap),requestId:requestId('expired-submit'),votes:votesFor(expSnap.pool,()=> 'OK')}),'ROOM_EXPIRED',410,'expired WAITING rejects new ballot');
pass('expired WAITING adds no ballot','1',sql("select count(*) from dish_v4_private.ballots where room_id='"+expired.id+"'"));
pass('old receipt after expiry replays without resurrection',expReceipt.response,await api(h,'submit',expReceipt.request));
pass('expired state remains terminal','EXPIRED',sql("select state from public.rooms where id='"+expired.id+"'"));

// Scoped consent is copied at start and checked live before/after finalization.
async function consent(u,scope,value){expectOk(await legacyRpc(u,'update_history_consent',{requestId:randomUUID(),scope,consent:value}),'scoped consent');}
await consent(h,'personal',true);await consent(m,'personal',true);await consent(h,'group',true);await consent(m,'group',true);
const noHistoryWinner=await room();await send(h,noHistoryWinner,()=> 'NO');await send(m,noHistoryWinner,()=> 'OK');
const noHistoryResult=(await allWait(noHistoryWinner)).result;
pass('no-consensus history retains null winner and empty podium',true,expectOk(await api(h,'history'),'no-consensus history').items.filter(i=>i.roomId===noHistoryWinner.id).every(i=>i.result.status==='NO_CONSENSUS'&&i.result.winner===null&&i.result.topDishes.length===0));
pass('no-consensus scoped histories really persisted','3',sql("select count(*) from gm06_canonical.histories where result_id='"+noHistoryResult.resultId+"'"));
const revokedBefore=await room();await consent(m,'personal',false);await send(h,revokedBefore,()=> 'WANT');await send(m,revokedBefore,()=> 'WANT');
const revokedResult=(await allWait(revokedBefore)).result;
pass('revoked before finalize prevents personal write','0',sql("select count(*) from gm06_canonical.histories where result_id='"+revokedResult.resultId+"' and scope='personal' and owner_user_id='"+m.id+"'"));
pass('personal revoke does not suppress valid group consent','1',sql("select count(*) from gm06_canonical.histories where result_id='"+revokedResult.resultId+"' and scope='group'"));
await consent(m,'personal',true);
const historyRoom=await room();await send(h,historyRoom,()=> 'WANT');await send(m,historyRoom,()=> 'WANT');const hr=(await allWait(historyRoom)).result;
const page=expectOk(await api(h,'history'),'canonical history');const items=page.items.filter(i=>i.roomId===historyRoom.id);
pass('personal and group writer share canonical result',2,items.length);pass('history reads writer projection exactly',true,items.every(i=>JSON.stringify(i.result)===JSON.stringify(hr)));
const personal=items.find(i=>i.scope==='personal'),group=items.find(i=>i.scope==='group');
expectOk(await api(h,'deleteHistory',{requestId:requestId('delete-personal'),historyId:personal.historyId}),'delete personal payload');
pass('deleted payload receipt survives','1',sql("select count(*) from gm06_canonical.history_receipts where result_id='"+hr.resultId+"' and scope='personal' and owner_user_id='"+h.id+"'"));
pass('reconnect does not recreate history',false,expectOk(await api(h,'history'),'history after delete').items.some(i=>i.historyId===personal.historyId));
pass('deleted history does not affect terminal',hr,await result(h,historyRoom));
await consent(m,'group',false);
pass('group revoke hides history live',false,expectOk(await api(h,'history'),'history after revoke').items.some(i=>i.historyId===group.historyId));
// Operational room cleanup leaves retained canonical projection available via history.
const memberPersonal=expectOk(await api(m,'history'),'member personal history').items.find(i=>i.roomId===historyRoom.id&&i.scope==='personal');
sql("begin;select set_config('dish_v4.writer','on',true);update public.rooms set created_at=clock_timestamp()-interval '3 days',expires_at=clock_timestamp()-interval '2 days',version=version+1 where id='"+historyRoom.id+"';select set_config('dish_v4.writer','off',true);select gm17_private.cleanup();commit;");
const retained=expectOk(await api(m,'history'),'retained history after room cleanup').items.find(i=>i.historyId===memberPersonal.historyId);
pass('history after room cleanup keeps exact projection',hr,retained?.result);
pass('canonical card mapping retained without operational room','t',sql("select exists(select 1 from gm20_canonical_private.result_round_rows where result_id='"+hr.resultId+"') and not exists(select 1 from public.rooms where id='"+historyRoom.id+"')"));

const afterB=JSON.parse(sql("select coalesce(jsonb_object_agg(id::text,projection),'{}'::jsonb) from dish_v4_private.results"));
pass('pre-existing B result projections retain exact IDs/bytes',true,Object.entries(oldB).every(([id,projection])=>JSON.stringify(projection)===JSON.stringify(afterB[id])));

const schema=spawnSync(process.env.GM_V4_PYTHON||'python',['scripts/validate_dish_v4_schema.py','--schema','docs/architecture/schemas/dish-session-v4b-supplement.schema.json','--stdin'],{cwd:root,encoding:'utf8',input:'['+contractSamples.join(',')+']',maxBuffer:2*1024*1024});
assert.equal(schema.status,0,'B-supplement schema validation: '+schema.stderr.slice(0,1500));const validated=JSON.parse(schema.stdout);
if(process.env.GM20_CANONICAL_BRUNO==='1'){
 const bh=await guest('Bruno canonical host'),bm=await guest('Bruno canonical member'),bx=await guest('Bruno canonical outsider');
 const br=await room([bh,bm]);const bs=await snapshot(bh,br.id);
 const dir=resolve(root,'supabase/tests/bruno/GM-20-canonical/environments');await mkdir(dir,{recursive:true});
 const env={runId:project,baseUrl:base,anonKey:key,hostToken:bh.token,memberToken:bm.token,outsiderToken:bx.token,roomId:br.id,roomVersion:bs.version,poolVersion:bs.poolVersion,round:bs.round};
 assert.ok(Object.values(env).every(v=>!/[\r\n]/.test(String(v))));
 const path=resolve(dir,'Local.runtime.private.bru');
 await writeFile(path,'vars {\n'+Object.entries(env).map(([k,v])=>'  '+k+': '+v).join('\n')+'\n}\n',{mode:0o600});await chmod(path,0o600);
 console.log('BRUNO_READY: select ignored Local.runtime.private; credentials not printed');
}
const paths=['supabase/migrations/0035_gm20_canonical_writer.sql','scripts/gm20_canonical_http.mjs','scripts/gm20_canonical_check.py','scripts/dish_policy_worker.py','tests/fixtures/decision-v4/cases.json'];
const report={fixtureOnly:true,result:'Pass',scope:'owned synthetic Auth/REST QA; no real votes or production',caseCount:results.length,cases:results,schema:validated,
 contractVersion,policyVersion,schemaVersion:'0.12.0',applicationDatabaseChanged:false,privateBrunoEnvironmentWritten:process.env.GM20_CANONICAL_BRUNO==='1',credentialsInEvidence:false,
 sourceHashes:Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]))};
await mkdir(reportDirectory,{recursive:true});
await writeFile(resolve(reportDirectory,'http-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({result:'Pass',cases:results.length,envelopes:validated.envelopesValidated}));
