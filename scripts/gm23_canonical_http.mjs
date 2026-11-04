// GM23.2 producer-driven notifications with received GM21.3 history regression.
import {createServer} from 'node:http';
import {spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {writeFile,chmod,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {resolve,relative,isAbsolute} from 'node:path';
const root=process.cwd();
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

const output=resolve(process.env.GM_CANONICAL_REPORT_DIRECTORY||resolve(root,'.work/gm23-canonical'));
const outputRelative=relative(resolve(root,'.work'),output);
assert.ok(outputRelative&&!outputRelative.startsWith('..')&&!isAbsolute(outputRelative),'QA reports must stay in the ignored workspace');
await mkdir(output,{recursive:true});
await waitWorker();
sql('update gm20_canonical_private.configuration set allow_new_sessions=true where singleton');
await setActive(process.env.GM_V4_SYNTHETIC_RELEASE_ID);
const h=await guest('history-host'),m=await guest('history-member'),x=await guest('history-outsider');
const baseline='dish-session-v4/roadmap-v2/GM-07.B';
async function consent(u,scope,value,id=randomUUID()){
 const reply=await legacyRpc(u,'update_history_consent',{requestId:id,scope,consent:value});
 expectOk(reply,'account scope '+scope+'='+value);return reply;
}
async function scopes(people,personal,group){
 for(const u of people){await consent(u,'personal',personal);await consent(u,'group',group);}
}
async function room(people=[h,m]){
 const made=await create(people[0]);for(const u of people.slice(1))await join(u,made.code,'QA member');
 const s=await snapshot(people[0],made.roomId);
 expectOk(await api(people[0],'start',{requestId:requestId('start'),roomId:made.roomId,expectedVersion:s.version}),'start');
 return {id:made.roomId,people};
}
async function send(u,r,choice){
 const s=await snapshot(u,r.id),args={...versionArgs(r.id,s),requestId:requestId('submit'),votes:votesFor(s.pool,choice)};
 const reply=await api(u,'submit',args);expectOk(reply,'submit');return args;
}
async function waiting(u,r){
 const s=await snapshot(u,r.id),args={...versionArgs(r.id,s),requestId:requestId('waiting')};
 expectOk(await api(u,'waiting',args),'waiting');return args;
}
async function finish(r,mode='r1'){
 const receipts=[];
 for(const [index,u]of r.people.entries())receipts.push(await send(u,r,(_d,i)=>mode==='empty'?'NO':mode==='removed'?(index===0&&i>0?'NO':'OK'):mode==='r2'?'OK':'WANT'));
 for(const u of r.people)await waiting(u,r);
 if(mode==='r2'||mode==='removed'){
  for(const [index,u]of r.people.entries())await send(u,r,()=>mode==='removed'&&index===0?'REMOVE':'KEEP');
  for(const u of r.people)await waiting(u,r);
 }
 const s=await snapshot(r.people[0],r.id);
 assert.ok(s.result,'actual producer must finalize');
 const events=JSON.parse(sql("select json_build_object('events',count(*),'inboxes',(select count(*) from public.inbox where event_id in(select event_id from gm23_private.canonical_notifications where result_id='"+s.result.resultId+"'))) from gm23_private.canonical_notifications where result_id='"+s.result.resultId+"'"));
 pass('canonical terminal event and complete audience '+mode,{events:1,inboxes:r.people.length},events);
 const inbox=await legacyRpc(r.people[0],'list_partner_inbox',{cursor:null});
 assert.equal(inbox.status,200);const notice=inbox.body.find(i=>i.metadata?.resultId===s.result.resultId);
 assert.ok(notice);assert.equal(notice.type,'room_result');assert.equal(notice.metadata.status,s.result.status);
 assert.equal(notice.metadata.contractVersion,contractVersion);assert.equal(notice.metadata.eventVersion,1);
 assert.deepEqual(Object.keys(notice.metadata).sort(),['contractVersion','eventVersion','resultId','roomId','status']);
 pass('canonical inbox reference projection '+mode,true,true);
 return {result:s.result,receipts};
}
async function items(u,r){
 const data=expectOk(await api(u,'history'),'history');
 const forbidden=['rawBallots','votes','preferences','seed','consentId','userId','r1_accepted','member_fingerprint'];
 const inspect=value=>{if(value&&typeof value==='object')for(const [k,v]of Object.entries(value)){assert.ok(!forbidden.includes(k),'private history field');inspect(v);}};
 inspect(data);
 return r?data.items.filter(i=>i.roomId===r.id):data.items;
}
function historyCount(r,scope='group'){
 return Number(sql("select count(*) from gm06_canonical.histories where result_id='"+r.resultId+"' and scope='"+scope+"'"));
}
function receiptCount(r,scope='group'){
 return Number(sql("select count(*) from gm06_canonical.history_receipts where result_id='"+r.resultId+"' and scope='"+scope+"'"));
}
function existing(id){return sql("select exists(select 1 from gm06_canonical.histories where history_id='"+id+"')")==='t';}
function cleanupSql(r){
 return "select pg_advisory_xact_lock(170017);select set_config('dish_v4.writer','on',true);"+
 "update public.rooms set created_at=clock_timestamp()-interval '3 days',expires_at=clock_timestamp()-interval '2 days',version=version+1 where id='"+r.id+"';"+
 "select set_config('dish_v4.writer','off',true);select gm17_private.cleanup();";
}

async function prepareBruno(){
 sql('update gm20_canonical_private.configuration set allow_new_sessions=true where singleton');
 const bh=await guest('Bruno notifications host'),bm=await guest('Bruno notifications member'),bx=await guest('Bruno notifications outsider');
 const br=await room([bh,bm]),bs=await snapshot(bh,br.id);
 const nc=await room([bh,bm]),ncResult=(await finish(nc,'empty')).result;
 const invitation=expectOk(await legacyRpc(bx,'invite_partner',{requestId:randomUUID(),friend_code:null,partner_id:bh.id}),'prepare inbox-only friend invitation');
 const deviceId='gm23-bruno-'+randomUUID(),pushToken='ExponentPushToken[bruno-'+randomUUID()+']';
 const dir=resolve(root,'supabase/tests/bruno/GM-23-canonical/environments');await mkdir(dir,{recursive:true});
 const env={runId:project,baseUrl:base,anonKey:key,hostToken:bh.token,memberToken:bm.token,outsiderToken:bx.token,roomId:br.id,roomVersion:bs.version,poolVersion:bs.poolVersion,round:bs.round,noConsensusRoomId:nc.id,noConsensusResultId:ncResult.resultId,friendInviteId:invitation.id,deviceId,pushToken,registerRequestId:randomUUID(),outsiderUnregisterRequestId:randomUUID(),unregisterRequestId:randomUUID()};
 const path=resolve(dir,'Local.runtime.private.bru');await writeFile(path,'vars {\n'+Object.entries(env).map(([k,v])=>'  '+k+': '+v).join('\n')+'\n}\n',{mode:0o600});await chmod(path,0o600);
 console.log('GM23_BRUNO_READY: private environment written; no credentials printed');
}
if(process.argv.includes('--prepare-bruno')){await prepareBruno();process.exit(0);}
const senderOnly=process.argv.includes('--sender-only');
if(senderOnly){await finish(await room());await finish(await room(),'empty');}
else{
// Exercise the actual producer transaction, force deferred hooks, then roll it back.
const rolled=await room();await send(h,rolled,()=> 'WANT');await send(m,rolled,()=> 'WANT');await waiting(h,rolled);
const rollbackSnapshot=await snapshot(m,rolled.id),rollbackPayload={contractVersion,...versionArgs(rolled.id,rollbackSnapshot),requestId:requestId('rollback-waiting')};
const qlit=v=>"'"+JSON.stringify(v).replaceAll("'","''")+"'::jsonb";
const inside=sql("begin;select set_config('request.jwt.claims',"+qlit({sub:m.id,role:'authenticated'})+"::text,true);select public.dish_session('waiting',"+qlit(rollbackPayload)+");set constraints all immediate;select count(*) from public.events where room_id='"+rolled.id+"';rollback;").split('\n');
assert.equal(JSON.parse(inside[1]).ok,true,'transaction producer reply: '+inside[1]);
pass('deferred event exists inside actual terminal transaction','1',inside.at(-1));
pass('rollback leaves no terminal event or outbox',[false,'0|0|0'],[Boolean((await snapshot(h,rolled.id)).result),sql("select (select count(*) from public.events where room_id='"+rolled.id+"')||'|'||(select count(*) from gm20_canonical_private.terminal_outbox where room_ref_id='"+rolled.id+"')||'|'||(select count(*) from gm06_canonical.results where room_ref_id='"+rolled.id+"')")]);
expectOk(await api(m,'waiting',rollbackPayload),'commit after rollback');
const rollbackCommitted=(await snapshot(h,rolled.id)).result;
pass('retry after rollback creates exactly one canonical notification','1',sql("select count(*) from gm23_private.canonical_notifications where result_id='"+rollbackCommitted.resultId+"'"));
assert.deepEqual((await Promise.all([1,2].map(()=>sqlSession('gm23-dedupe-'+randomUUID(),"begin;select gm23_private.materialize_terminal('"+rollbackCommitted.resultId+"');commit;")))).map(r=>r.code),[0,0]);
pass('concurrent materializer replay keeps one event and audience','1|2',sql("select count(*)||'|'||(select count(*) from public.inbox where event_id in(select event_id from gm23_private.canonical_notifications where result_id='"+rollbackCommitted.resultId+"')) from gm23_private.canonical_notifications where result_id='"+rollbackCommitted.resultId+"'"));
const none=await room();const noneResult=(await finish(none)).result;
pass('canonical event TTL is capped by outbox and seven days','t',sql("select bool_and(e.expires_at<=o.expires_at and e.expires_at<=e.created_at+interval '7 days') from gm23_private.canonical_notifications n join public.events e on e.id=n.event_id join gm20_canonical_private.terminal_outbox o on o.result_id=n.result_id"));
pass('no consent does not create personal/group histories',[0,0],[historyCount(noneResult,'personal'),historyCount(noneResult)]);
await scopes([h,m],true,false);
const personalRoom=await room();const personalResult=(await finish(personalRoom)).result;
pass('personal-only produces two owner payloads and no group',[2,0],[historyCount(personalResult,'personal'),historyCount(personalResult)]);
pass('personal owner isolation',[1,1,0],[(await items(h,personalRoom)).length,(await items(m,personalRoom)).length,(await items(x,personalRoom)).length]);
const unauth=await legacyRpc(null,'dish_session',{command:'history',payload:{contractVersion}});
pass('canonical history requires a valid guest identity',true,[401,403].includes(unauth.status));
expectFail(await api(x,'result',{roomId:personalRoom.id}),'NOT_MEMBER',403,'outsider cannot read canonical result detail');
expectFail(await api(h,'result',{contractVersion:baseline,roomId:personalRoom.id},{requestValid:false}),'CONTRACT_MISMATCH',409,'old wire cannot reinterpret canonical authority');
const memberPersonal=(await items(m,personalRoom))[0];
expectOk(await legacyRpc(x,'delete_history',{requestId:randomUUID(),history_id:memberPersonal.historyId}),'outsider delete no-op');
pass('common delete does not erase another personal owner',true,existing(memberPersonal.historyId));
expectOk(await api(x,'deleteHistory',{requestId:requestId('other-delete'),historyId:memberPersonal.historyId}),'supplement outsider delete no-op');
pass('supplement delete also preserves other owner',true,existing(memberPersonal.historyId));

await scopes([h,m],false,true);
const groupRoom=await room();const groupResult=(await finish(groupRoom)).result;
pass('group-only scopes stay independent',[0,1],[historyCount(groupResult,'personal'),historyCount(groupResult)]);
const groupRows=await items(h,groupRoom);
pass('all-consented group returns same immutable result',groupResult,groupRows[0].result);
pass('group membership is symmetric',groupRows[0].historyId,(await items(m,groupRoom))[0].historyId);
pass('outsider cannot enumerate group history',0,(await items(x,groupRoom)).length);
await consent(m,'group',false);
pass('account revoke physically purges canonical group payload',0,historyCount(groupResult));
pass('group tombstone survives account revoke',1,receiptCount(groupResult));
await consent(m,'group',true);
pass('reenable does not resurrect group history',0,(await items(h,groupRoom)).length);
const partialPeople=[await guest('partial-host'),await guest('partial-member')];
await consent(partialPeople[0],'group',true);
const partial=await room(partialPeople);const partialResult=(await finish(partial)).result;
pass('one missing group grant never authorizes group',0,historyCount(partialResult));

await scopes([h,m],true,true);
const both=await room();const completed=await finish(both,'r2');const terminal=completed.result;
pass('real R2 result preserves cohort and score versions',[2,2,'want2-ok1-round1-v1'],[terminal.round,terminal.round1BallotCount,terminal.scoreVersion]);
const bothRows=await items(h,both);
pass('own personal and group reuse exactly one canonical projection',true,bothRows.length===2&&bothRows.every(i=>JSON.stringify(i.result)===JSON.stringify(terminal)));
pass('history summary retains typed context and omits unapproved identities',true,bothRows.every(i=>i.memberCount===2&&i.round1BallotCount===2&&i.desiredAt===null&&i.createdAt===i.finalizedAt&&!('participants'in i)));
const changed='gm21-changed-'+project+'-'+randomUUID();
sql("insert into dish_v3_private.catalogues(id,source_sha,cards,test_only,active) select '"+changed+"',encode(extensions.digest(changed.cards::text,'sha256'),'hex'),changed.cards,true,false from (select jsonb_agg(v||jsonb_build_object('name','Changed synthetic QA card') order by ord) cards from dish_v3_private.catalogues c cross join lateral jsonb_array_elements(c.cards) with ordinality t(v,ord) where c.id='"+process.env.GM_V4_SYNTHETIC_RELEASE_ID+"') changed;");
await setActive(changed);
pass('catalogue activation cannot change saved history/card/price/order',bothRows,await items(h,both));
await setActive(process.env.GM_V4_SYNTHETIC_RELEASE_ID);
const own=bothRows.find(i=>i.scope==='personal'),group=bothRows.find(i=>i.scope==='group');
const deletion={requestId:randomUUID(),history_id:own.historyId};
const deleted=await legacyRpc(h,'delete_history',deletion);expectOk(deleted,'common canonical delete');
pass('common delete removes correct canonical payload',false,existing(own.historyId));
pass('common delete retains receipt and other personal owner',[2,1],[receiptCount(terminal,'personal'),(await items(m,both)).filter(i=>i.scope==='personal').length]);
pass('common delete retries preserve stable ACK',deleted,await legacyRpc(h,'delete_history',deletion));
expectOk(await api(h,'submit',completed.receipts[0]),'old producer ACK after deletion');
pass('terminal retry cannot rewrite deleted canonical history',false,existing(own.historyId));
const badReuse=await legacyRpc(h,'delete_history',{...deletion,history_id:memberPersonal.historyId});
pass('common delete request reuse returns declared conflict',[409,'REQUEST_ID_REUSED'],[badReuse.status,badReuse.body.messageKey]);
const groupDelete={requestId:requestId('group-delete'),historyId:group.historyId};
const groupAck=await api(m,'deleteHistory',groupDelete);expectOk(groupAck,'capability group delete');
pass('capability delete removes group for every participant',[false,1],[existing(group.historyId),receiptCount(terminal)]);
pass('capability delete retry returns same ACK',groupAck,await api(m,'deleteHistory',groupDelete));
pass('deleted history never changes saved result',terminal,expectOk(await api(h,'result',{roomId:both.id}),'result'));
const wrongCursor=await api(h,'history',{cursor:randomUUID()},{requestValid:false});
expectFail(wrongCursor,'UNSUPPORTED_FIELD',400,'supplement rejects uncontracted paging fields');
const legacyPage=await legacyRpc(h,'get_history',{scope:'personal',cursor:null});
expectOk(legacyPage,'legacy cursor API remains available');
const legacyBad=await legacyRpc(h,'get_history',{scope:'personal',cursor:randomUUID()});
pass('legacy cursor validates caller and scope',[400,'INVALID_INPUT'],[legacyBad.status,legacyBad.body.messageKey]);

const noConsensus=await room();const emptyResult=(await finish(noConsensus,'empty')).result;
const emptyRows=await items(h,noConsensus);
pass('no-consensus history exists with null winner and empty podium',true,emptyRows.length===2&&emptyRows.every(i=>i.result.status==='NO_CONSENSUS'&&i.result.reasonCode==='EMPTY_INTERSECTION'&&i.result.winner===null&&i.result.topDishes.length===0&&i.result.scoreVersion===null));
pass('no-consensus result id is writer id',true,emptyRows.every(i=>i.resultId===emptyResult.resultId));
const removedRoom=await room(),removed=(await finish(removedRoom,'removed')).result;
pass('R2 all-removed history has exact terminal pairing',[2,'NO_CONSENSUS','ALL_REMOVED',null,0],
 [removed.round,removed.status,removed.reasonCode,removed.winner,removed.topDishes.length]);
pass('R2 all-removed history reads persisted null projection',true,(await items(h,removedRoom)).every(i=>JSON.stringify(i.result)===JSON.stringify(removed)));

const before=await room();await consent(m,'group',false);
const beforeResult=(await finish(before)).result;
pass('revoke before finalize suppresses only the revoked scope',[2,0],[historyCount(beforeResult,'personal'),historyCount(beforeResult)]);
await consent(m,'group',true);
const raceRoom=await room();await send(h,raceRoom,()=> 'WANT');await waiting(h,raceRoom);
await Promise.all([(async()=>{await send(m,raceRoom,()=> 'WANT');await waiting(m,raceRoom);})(),consent(m,'group',false)]);
const raced=(await snapshot(h,raceRoom.id)).result;
pass('concurrent finalize/revoke leaves one terminal and no group payload',[true,0],[raced?.status==='DECIDED',historyCount(raced)]);
pass('concurrent revoke preserves two personal scopes',2,historyCount(raced,'personal'));

// Actual held SQL sessions exercise both lock orders, not a mocked scheduler.
async function retentionPair(){
 const people=[await guest('retained-host'),await guest('retained-member')];
 const late=await room(people);
 await scopes(people,true,true);
 const retained=await room(people);const saved=(await finish(retained)).result;
 const lateResult=(await finish(late)).result;
 pass('post-start opt-in never grants earlier room',0,historyCount(lateResult)+historyCount(lateResult,'personal'));
 const page=await items(people[0],retained),g=page.find(i=>i.scope==='group'),p=page.find(i=>i.scope==='personal');
 return {people,late,lateResult,retained,saved,g,p};
}
function attemptLink(pair,id){
 return "insert into gm06_canonical.histories(history_id,result_id,scope,owner_user_id,expires_at) select '"+id+"','"+pair.lateResult.resultId+"','group',null,least(r.retain_until,min(c.expires_at)) from gm06_canonical.results r cross join gm06_canonical.history_audience a join public.consents c on c.id=a.consent_id where r.result_id='"+pair.lateResult.resultId+"' and a.history_id='"+pair.g.historyId+"' group by r.retain_until;"+
 "insert into gm06_canonical.history_audience(history_id,result_id,user_id,consent_id) select '"+id+"','"+pair.lateResult.resultId+"',a.user_id,a.consent_id from gm06_canonical.history_audience a where a.history_id='"+pair.g.historyId+"';set constraints all immediate;";
}
async function sqlSession(label,body){
 const {spawn}=await import('node:child_process');
 const child=spawn('docker',['exec','-i',container,'psql','-X','-q','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-v','VERBOSITY=sqlstate','-At'],{stdio:['pipe','pipe','pipe']});
 let error='';child.stderr.on('data',v=>{error+=v;});child.stdout.on('data',()=>{});
 child.stdin.end("set application_name='"+label+"';"+body);
 return new Promise((yes,no)=>{child.on('error',no);child.on('close',code=>yes({code,state:error.match(/ERROR:\s+([A-Z0-9]{5})/)?.[1]??null}));});
}
async function observed(label,event){
 for(let i=0;i<60;i++){
  if(sql("select exists(select 1 from pg_stat_activity where application_name='"+label+"' and "+event+")")==='t')return true;
  await new Promise(r=>setTimeout(r,50));
 }return false;
}
async function holdBarrier(key){
 const {spawn}=await import('node:child_process');
 const child=spawn('docker',['exec','-i',container,'psql','-X','-q','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{stdio:['pipe','pipe','pipe']});
 let ready,fail,seen='';const acquired=new Promise((yes,no)=>{ready=yes;fail=no;});
 const closed=new Promise((yes,no)=>{child.on('error',no);child.on('close',code=>yes(code));});
 child.stdout.on('data',v=>{seen+=v;if(seen.includes('GM23_BARRIER_READY'))ready();});
 child.stderr.on('data',()=>{});child.on('error',fail);
 child.stdin.write("begin;select pg_advisory_xact_lock("+key+");select 'GM23_BARRIER_READY';\n");
 let timer;try{await Promise.race([acquired,new Promise((_,no)=>{timer=setTimeout(()=>no(new Error('barrier did not acquire')),30000);})]);}
 catch(error){child.stdin.end('rollback;\n');await closed;throw error;}finally{clearTimeout(timer);}
 return async()=>{child.stdin.end('commit;\n');assert.equal(await closed,0,'barrier released');};
}
for(const cleanupFirst of [true,false]){
 const pair=await retentionPair(),hid=randomUUID(),tag=randomUUID().replaceAll('-','').slice(0,10);
 const clean=cleanupSql(pair.retained),link=attemptLink(pair,hid);
 const firstLabel='gm21-first-'+tag,secondLabel='gm21-second-'+tag;
 const prefix=cleanupFirst?'select pg_advisory_xact_lock(170017);':'';
 const barrierKey=1000000000+parseInt(tag.slice(0,6),16),release=await holdBarrier(barrierKey);
 let first,second;
 try{
  first=sqlSession(firstLabel,"begin;"+prefix+"update gm06_private.reference_epoch set epoch=epoch+1 where singleton;select pg_advisory_xact_lock("+barrierKey+");"+(cleanupFirst?clean:link)+"commit;");
  assert.ok(await observed(firstLabel,"wait_event_type='Lock'"),'first SQL session holds reference lock at barrier');
  second=sqlSession(secondLabel,"begin;"+(cleanupFirst?link:clean)+"commit;");
  pass('real cleanup/audience contender blocks order='+cleanupFirst,true,await observed(secondLabel,"wait_event_type='Lock'"));
 }finally{await release();}
 const [one,two]=await Promise.all([first,second]);
 const [cleaned,rejected]=cleanupFirst?[one,two]:[two,one];
 pass('cleanup commits and invalid audience rolls back order='+cleanupFirst,[0,'23514'],[cleaned.code,rejected.state]);
 pass('failed history insertion rolls back audience and receipt order='+cleanupFirst,[false,0],[existing(hid),receiptCount(pair.lateResult)]);
 pass('original retained history remains readable after cleanup order='+cleanupFirst,pair.saved,(await items(pair.people[0],pair.retained)).find(i=>i.historyId===pair.g.historyId)?.result);
 pass('room-bound grant is actually detached order='+cleanupFirst,'t',sql("select bool_and(c.room_id is null and c.retention_detached) from public.consents c join gm06_canonical.history_audience a on a.consent_id=c.id where a.history_id='"+pair.g.historyId+"'"));
 const rejectedAgain=await sqlSession('gm21-detached-'+tag,"begin;"+attemptLink(pair,randomUUID())+"commit;");
 pass('detached grant cannot be reused after cleanup order='+cleanupFirst,'23514',rejectedAgain.state);
 const bounds=JSON.parse(sql("select json_build_array(gm06_canonical.history_visible('"+pair.p.historyId+"','"+pair.people[0].id+"',h.expires_at-interval '1 microsecond'),gm06_canonical.history_visible('"+pair.p.historyId+"','"+pair.people[0].id+"',h.expires_at),gm06_canonical.history_visible('"+pair.p.historyId+"','"+pair.people[0].id+"',r.finalized_at+interval '30 days')) from gm06_canonical.histories h join gm06_canonical.results r using(result_id) where h.history_id='"+pair.p.historyId+"'"));
 pass('retention predicate enforces before/at/30day cutoff order='+cleanupFirst,[true,false,false],bounds);
 await consent(pair.people[1],'group',false);
 pass('group revoke after cleanup purges payload and retains tombstone order='+cleanupFirst,[false,1],[existing(pair.g.historyId),receiptCount(pair.saved)]);
 pass('other scope survives group revoke after cleanup order='+cleanupFirst,true,existing(pair.p.historyId));
 if(!cleanupFirst){
  expectOk(await legacyRpc(pair.people[0],'delete_history',{requestId:randomUUID(),history_id:pair.p.historyId}),'common delete after operational cleanup');
  pass('common delete after room cleanup keeps receipt and other owner',[false,2,1],
   [existing(pair.p.historyId),receiptCount(pair.saved,'personal'),(await items(pair.people[1],pair.retained)).filter(i=>i.scope==='personal').length]);
 }
 await consent(pair.people[0],'personal',false);
 pass('personal revoke after cleanup purges correct owner order='+cleanupFirst,false,existing(pair.p.historyId));
 pass('retained result/ref survive scope payload purge order='+cleanupFirst,'t',sql("select exists(select 1 from gm06_canonical.results where result_id='"+pair.saved.resultId+"') and exists(select 1 from gm17_private.result_refs where id='"+pair.saved.resultId+"')"));
}

const many=[await guest('twenty-host')];while(many.length<20)many.push(await guest('twenty-member'));
await scopes(many,false,true);
const twenty=await room(many),twentyResult=(await finish(twenty)).result;
pass('20-member actual writer stores group audience atomically',[20,1],[twentyResult.round1BallotCount,historyCount(twentyResult)]);
pass('20-member group read agrees for every member',true,(await Promise.all(many.map(u=>items(u,twenty)))).every(rows=>rows.length===1&&rows[0].memberCount===20&&JSON.stringify(rows[0].result)===JSON.stringify(twentyResult)));
pass('20-member group does not leak to outsider',0,(await items(x,twenty)).length);
await consent(many[19],'group',false);
pass('one member revoke removes group for whole locked roster',0,historyCount(twentyResult));
const expiring=await room();await consent(m,'group',true);
// The newly granted scope after this start stays opted out for this room.
const expiryResult=(await finish(expiring)).result;
const ownExpiry=(await items(h,expiring)).find(i=>i.scope==='personal');
sql("update public.consents c set expires_at=clock_timestamp()-interval '1 second',version=version+1 from gm06_canonical.history_audience a where a.consent_id=c.id and a.history_id='"+ownExpiry.historyId+"'");
pass('actual expired consent immediately purges owner payload',false,existing(ownExpiry.historyId));
pass('expiry purge leaves replay receipt',2,receiptCount(expiryResult,'personal'));

const guard=JSON.parse(sql("begin;select set_config('dish_v4.writer','off',true);select public.update_history_consent('guard-"+randomUUID()+"','personal','true');select to_jsonb(current_setting('dish_v4.writer'));rollback;").split('\n').at(-1)||'null');
pass('unauthenticated consent wrapper restores existing guard','off',guard);
for(const previous of ['off','on']){
 const restored=JSON.parse(sql("begin;select set_config('dish_v4.writer','"+previous+"',true);set local request.jwt.claims='{\"sub\":\""+h.id+"\",\"role\":\"authenticated\"}';set local role authenticated;select public.update_history_consent('guard-"+randomUUID()+"','personal','true');select to_jsonb(current_setting('dish_v4.writer'));rollback;").split('\n').at(-1));
 pass('authenticated consent wrapper restores guard '+previous,previous,restored);
}
pass('GM21 supplement ledger is installed','1',sql("select count(*) from public.schema_versions where schema_version='0.13.0' and contract_id='dish-session-v4/roadmap-v2/GM-21.3'"));
pass('private integration helpers cannot be called by any client role','t',sql("select not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join (values('anon'),('authenticated'),('service_role'),('gm06_publisher')) r(role) where n.nspname='gm21_canonical_private' and has_function_privilege(role,p.oid,'execute'))"));
for(const alias of ['delete_history_before_gm21_canonical','update_history_consent_before_gm21_canonical']){
 const args=alias.startsWith('delete')?{requestId:randomUUID(),history_id:randomUUID()}:{requestId:randomUUID(),scope:'personal',consent:false};
 pass('private alias is not exposed '+alias,403,(await legacyRpc(h,alias,args)).status);
}
sql('update gm20_canonical_private.configuration set allow_new_sessions=false where singleton');
pass('creation flag off does not orphan retained readers',true,(await items(m)).length>0);
sql(readFileSync(resolve(root,'supabase/rollback/0036_gm21_canonical_history.down.sql'),'utf8'));
pass('QA down removes only integration ledger and namespace','t',sql("select to_regnamespace('gm21_canonical_private') is null and not exists(select 1 from public.schema_versions where schema_version='0.13.0')"));
pass('QA down retains actual writer result',terminal,expectOk(await api(h,'result',{roomId:both.id}),'result after down'));
sql(readFileSync(resolve(root,'supabase/migrations/0036_gm21_canonical_history.sql'),'utf8'));
pass('forward reapply restores ledger and no deleted history','t',sql("select exists(select 1 from public.schema_versions where schema_version='0.13.0') and not exists(select 1 from gm06_canonical.histories where history_id='"+own.historyId+"')"));
}

// Friend invitations stay inbox-only, and a cursor cannot cross caller ownership.
const friendInvite=expectOk(await legacyRpc(x,'invite_partner',{requestId:randomUUID(),friend_code:null,partner_id:h.id}),'create inbox-only friend invitation');
const friendRow=(await legacyRpc(h,'list_partner_inbox',{cursor:null})).body.find(row=>row.type==='friend_invite'&&row.metadata?.invitationId===friendInvite.id);
assert.ok(friendRow,'recipient sees friend invite in inbox');
pass('friend invitation is correctly typed in inbox','friend_invite',friendRow.type);
const friendEventId=sql("select id from public.events where friend_invitation_id='"+friendInvite.id+"'");
const friendCursor=sql("select id from public.inbox where owner_user_id='"+h.id+"' and event_id='"+friendEventId+"'");
expectFail(await legacyRpc(x,'list_partner_inbox',{cursor:friendCursor}),'NOT_MEMBER',403,'inbox cursor from another caller is rejected');

// Real SQL/PostgREST sender cycle; only the provider is a local HTTP fake.
const serviceKey=status.SERVICE_ROLE_KEY;assert.ok(serviceKey,'owned QA must supply its server-only key');
const senderConfig={SUPABASE_URL:base,SUPABASE_SERVICE_ROLE_KEY:serviceKey};
globalThis.Deno={env:{get:name=>senderConfig[name]}};
const sender=await import('../supabase/functions/push-sender/index.ts');
pass('guest cannot invoke sender entrypoint',403,(await sender.handler(new Request('http://localhost/push-sender',{method:'POST',headers:{authorization:'Bearer '+h.token}}))).status);
senderConfig.PUSH_SENDER_SECRET=randomUUID();delete senderConfig.SUPABASE_SERVICE_ROLE_KEY;
const noCredentialBefore=sql('select coalesce(sum(attempts),0)::text from public.deliveries');
pass('unconfigured sender reports unavailable',503,(await sender.handler(new Request('http://localhost/push-sender',{method:'POST',headers:{'x-push-sender-secret':senderConfig.PUSH_SENDER_SECRET}}))).status);
pass('unconfigured sender consumes no attempts',noCredentialBefore,sql('select coalesce(sum(attempts),0)::text from public.deliveries'));
senderConfig.SUPABASE_SERVICE_ROLE_KEY=serviceKey;
async function trusted(name,body){const response=await fetch(base+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:serviceKey,authorization:'Bearer '+serviceKey,'content-type':'application/json'},body:JSON.stringify(body)});assert.equal(response.status,200);return response.json();}
const device='gm23-'+randomUUID(),tokenA='ExponentPushToken[qa-'+randomUUID()+']',tokenB='ExponentPushToken[qa-'+randomUUID()+']';
pass('missing JWT is denied before RPC execution',[401,'42501'],await legacyRpc(null,'register_push_device',{requestId:randomUUID(),device_id:device,token:tokenA,permission:'granted'}).then(r=>[r.status,r.body.code]));
pass('guest cannot claim sender deliveries',403,(await legacyRpc(h,'claim_push_deliveries',{batch_size:1})).status);
const deniedTokenRead=await fetch(base+'/rest/v1/devices?select=push_token',{headers:{apikey:key,authorization:'Bearer '+h.token}});
pass('guest cannot read token column',403,deniedTokenRead.status);
const registerRequestId=randomUUID(),registerPayload={requestId:registerRequestId,device_id:device,token:tokenA,permission:'granted'};
const initialRegistration=expectOk(await legacyRpc(h,'register_push_device',registerPayload),'register actual session');
const replayRegistration=expectOk(await legacyRpc(h,'register_push_device',registerPayload),'replay registration ACK');
pass('same device registration replays exact ACK',initialRegistration,replayRegistration);
expectFail(await legacyRpc(h,'register_push_device',{...registerPayload,token:tokenB}),'REQUEST_ID_REUSED',409,'registration request ID cannot change payload');
expectOk(await legacyRpc(x,'unregister_push_device',{requestId:randomUUID(),device_id:device}),'outsider unregister request remains caller-scoped');
pass('outsider cannot unregister another identity device','t',sql("select active and push_token='"+tokenA+"' from public.devices where user_id='"+h.id+"' and device_key='"+device+"'"));
pass('new device does not receive inbox-only friend invite delivery','0',sql("select count(*) from public.deliveries where event_id='"+friendEventId+"' and recipient_user_id='"+h.id+"'"));
const captured=[];let providerStatus=200,providerError=null,receiptMissing=false,providerDelayMs=0;
const fake=createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);captured.push(body);if(providerDelayMs)await new Promise(resolve=>setTimeout(resolve,providerDelayMs));res.setHeader('content-type','application/json');res.statusCode=providerStatus;if(providerStatus!==200){res.setHeader('retry-after','600');res.end('{}');return;}res.end(JSON.stringify(Array.isArray(body)?{data:[providerError?{status:'error',details:{error:providerError}}:{status:'ok',id:'ticket-'+captured.length}]}:{data:receiptMissing?{}:Object.fromEntries(body.ids.map(id=>[id,{status:'ok'}]))}));});
await new Promise(resolve=>fake.listen(0,'127.0.0.1',resolve));
const fakeFetch=(_url,init)=>fetch('http://127.0.0.1:'+fake.address().port,init);
try{
 const claimBatches=await Promise.all([trusted('claim_push_deliveries',{batch_size:8}),trusted('claim_push_deliveries',{batch_size:8})]);
 const claims=claimBatches.flat(),claimIds=claims.map(d=>d.deliveryId);assert.ok(claims.length>0);assert.equal(new Set(claimIds).size,claimIds.length,'two concurrent workers must not claim one delivery twice');
 pass('two concurrent sender workers claim disjoint deliveries',true,new Set(claimIds).size===claimIds.length);
 const canonical=claims.filter(d=>d.contractVersion===contractVersion);assert.ok(canonical.length>0);
 pass('trusted canonical claim has result and status',true,canonical.every(d=>d.resultId&&['DECIDED','NO_CONSENSUS'].includes(d.status)&&d.eventVersion===1));
 const one=canonical[0];const sent=await sender.sendBatch([one],fakeFetch);pass('real SQL completion after fake HTTP ticket',{sent:1,failed:0},sent);
 pass('payload has references only',true,Object.keys(captured[0][0].data).every(k=>['type','eventId','roomId','resultId','status','contractVersion','eventVersion'].includes(k)));
 const ticketA=sql("select ticket_id from public.deliveries where id='"+one.deliveryId+"'");
 pass('ticket alone does not mark delivery sent','pending',sql("select state from public.deliveries where id='"+one.deliveryId+"'"));
 // Re-registration must retain a live lease and retry schedule.
 const leased=canonical[1];if(leased){const before=sql("select row_to_json(m)::text from gm23_private.delivery_meta m where delivery_id='"+leased.deliveryId+"'");expectOk(await legacyRpc(h,'register_push_device',{requestId:randomUUID(),device_id:device,token:tokenA,permission:'granted'}),'same registration');pass('same registration preserves lease/backoff',before,sql("select row_to_json(m)::text from gm23_private.delivery_meta m where delivery_id='"+leased.deliveryId+"'"));}
 expectOk(await legacyRpc(h,'register_push_device',{requestId:randomUUID(),device_id:device,token:tokenB,permission:'granted'}),'token rotation');
 const rotated=await trusted('claim_push_deliveries',{batch_size:100});const replacement=rotated.find(d=>d.deliveryId===one.deliveryId);assert.ok(replacement);
 await sender.sendBatch([replacement],fakeFetch);const ticketB=sql("select ticket_id from public.deliveries where id='"+one.deliveryId+"'");assert.notEqual(ticketA,ticketB);
 const stale=await trusted('record_push_receipt',{delivery_id:one.deliveryId,receipt_id:ticketA,receipt_status:'error',reason:'DeviceNotRegistered'});
 pass('old receipt is ignored',true,stale.ignored);
 pass('old receipt preserves B registration and ticket','t',sql("select exists(select 1 from public.devices d join public.deliveries n on n.device_id=d.id where n.id='"+one.deliveryId+"' and d.active and d.push_token='"+tokenB+"' and n.ticket_id='"+ticketB+"')"));
 sql("update gm23_private.delivery_meta set provider_ticket_at=clock_timestamp()-interval '16 minutes',version=version+1 where delivery_id='"+one.deliveryId+"'");
 const receipts=await sender.pollReceipts(fakeFetch);assert.ok(receipts.recorded>=1);
 pass('receipt completes real delivery','sent',sql("select state from public.deliveries where id='"+one.deliveryId+"'"));
 // A missing receipt leaves the ticket pending for a later receipt poll.
 const missingDevice='gm23-missing-receipt-'+randomUUID(),missingToken='ExponentPushToken[missing-'+randomUUID()+']';
 expectOk(await legacyRpc(h,'register_push_device',{requestId:randomUUID(),device_id:missingDevice,token:missingToken,permission:'granted'}),'register missing-receipt device');
 const missingDeviceId=sql("select id from public.devices where user_id='"+h.id+"' and device_key='"+missingDevice+"'");
 const missingClaims=await trusted('claim_push_deliveries',{batch_size:100});
 const missingDeliveryId=sql("select id from public.deliveries where device_id='"+missingDeviceId+"' and state='pending' and ticket_id is null and attempts=1 order by id limit 1");
 const missingDelivery=missingClaims.find(d=>d.deliveryId===missingDeliveryId);assert.ok(missingDelivery,'owned fixture should have a due canonical delivery');
 await sender.sendBatch([missingDelivery],fakeFetch);
 sql("update gm23_private.delivery_meta set provider_ticket_at=clock_timestamp()-interval '16 minutes',version=version+1 where delivery_id='"+missingDelivery.deliveryId+"'");
 receiptMissing=true;const missingResult=await sender.pollReceipts(fakeFetch);receiptMissing=false;
 pass('provider missing receipt does not complete ticket',{recorded:0,state:'pending',ticket:true},{recorded:missingResult.recorded,state:sql("select state from public.deliveries where id='"+missingDelivery.deliveryId+"'"),ticket:sql("select ticket_id is not null from public.deliveries where id='"+missingDelivery.deliveryId+"'")==='t'});
 expectOk(await legacyRpc(h,'unregister_push_device',{requestId:randomUUID(),device_id:missingDevice}),'cleanup missing-receipt device');
 // Repeatable provider failures use only an owned existing QA delivery.
 const reset=()=>sql("update public.deliveries set state='pending',ticket_id=null,receipt_id=null,attempts=0,last_attempt_at=null,version=version+1 where id='"+one.deliveryId+"';update gm23_private.delivery_meta set lease_id=null,lease_until=null,next_attempt_at=clock_timestamp(),version=version+1 where delivery_id='"+one.deliveryId+"'");
 reset();let pending=(await trusted('claim_push_deliveries',{batch_size:100})).find(d=>d.deliveryId===one.deliveryId);assert.ok(pending);
 providerStatus=429;await sender.sendBatch([pending],fakeFetch);
 pass('provider Retry-After persists 600 seconds',true,Number(sql("select extract(epoch from next_attempt_at-clock_timestamp())>590 from gm23_private.delivery_meta where delivery_id='"+one.deliveryId+"'").replace('t','1'))===1);
 const backoff=sql("select row_to_json(m)::text from gm23_private.delivery_meta m where delivery_id='"+one.deliveryId+"'");
 expectOk(await legacyRpc(h,'register_push_device',{requestId:randomUUID(),device_id:device,token:tokenB,permission:'granted'}),'same token during backoff');
 pass('same registration preserves provider backoff',backoff,sql("select row_to_json(m)::text from gm23_private.delivery_meta m where delivery_id='"+one.deliveryId+"'"));
 sql("update public.deliveries set attempts=4,version=version+1 where id='"+one.deliveryId+"';update gm23_private.delivery_meta set next_attempt_at=clock_timestamp(),version=version+1 where delivery_id='"+one.deliveryId+"'");
 pending=(await trusted('claim_push_deliveries',{batch_size:100})).find(d=>d.deliveryId===one.deliveryId);providerStatus=503;await sender.sendBatch([pending],fakeFetch);
 expectOk(await legacyRpc(h,'register_push_device',{requestId:randomUUID(),device_id:device,token:tokenB,permission:'granted'}),'same exhausted registration');
 pass('retry exhaustion survives re-registration','failed|5',sql("select state||'|'||attempts from public.deliveries where id='"+one.deliveryId+"'"));
 reset();pending=(await trusted('claim_push_deliveries',{batch_size:100})).find(d=>d.deliveryId===one.deliveryId);
 providerStatus=200;providerError='DeviceNotRegistered';await sender.sendBatch([pending],fakeFetch);
 pass('real provider dead-token error revokes generation','t',sql("select not active and push_token is null from public.devices where user_id='"+h.id+"' and device_key='"+device+"'"));
 providerError=null;
 // Simulate a provider that received the request and then timed out before its ticket arrived.
 const timeoutDevice='gm23-timeout-'+randomUUID(),timeoutToken='ExponentPushToken[timeout-'+randomUUID()+']';
 expectOk(await legacyRpc(h,'register_push_device',{requestId:randomUUID(),device_id:timeoutDevice,token:timeoutToken,permission:'granted'}),'register timeout device');
 const timeoutDeviceId=sql("select id from public.devices where user_id='"+h.id+"' and device_key='"+timeoutDevice+"'");
 const timeoutClaims=await trusted('claim_push_deliveries',{batch_size:100});
 const timeoutDeliveryId=sql("select id from public.deliveries where device_id='"+timeoutDeviceId+"' and state='pending' and ticket_id is null and attempts=1 order by id limit 1");
 const timeoutDelivery=timeoutClaims.find(d=>d.deliveryId===timeoutDeliveryId);assert.ok(timeoutDelivery,'owned fixture should have a due canonical delivery');
 providerDelayMs=16_000;const timeoutResult=await sender.sendBatch([timeoutDelivery],fakeFetch);providerDelayMs=0;
 pass('provider receives request but response timeout stays retryable',{sent:0,failed:1,received:true,state:'pending',attempts:1},{...timeoutResult,received:captured.some(batch=>Array.isArray(batch)&&batch.some(message=>message.to===timeoutToken)),state:sql("select state from public.deliveries where id='"+timeoutDeliveryId+"'"),attempts:Number(sql("select attempts from public.deliveries where id='"+timeoutDeliveryId+"'"))});
 expectOk(await legacyRpc(h,'unregister_push_device',{requestId:randomUUID(),device_id:timeoutDevice}),'cleanup timeout device');
 expectOk(await legacyRpc(h,'register_push_device',{requestId:randomUUID(),device_id:device,token:'discarded',permission:'denied'}),'denied');
 pass('denied registration drops token','t',sql("select not active and push_token is null from public.devices where user_id='"+h.id+"' and device_key='"+device+"'"));
 pass('denied permission keeps own inbox',true,(await legacyRpc(h,'list_partner_inbox',{cursor:null})).body.length>0);
 const unregisterRequestId=randomUUID(),unregisterPayload={requestId:unregisterRequestId,device_id:device};
 const unregistered=expectOk(await legacyRpc(h,'unregister_push_device',unregisterPayload),'unregister');
 const unregisterReplay=expectOk(await legacyRpc(h,'unregister_push_device',unregisterPayload),'replay unregister ACK');
 pass('unregister retry returns exact ACK',unregistered,unregisterReplay);
}finally{await new Promise(resolve=>fake.close(resolve));}

// Atomic per-identity/endpoint quotas and ACK-before-quota behavior.
{
 const registrationUser=await guest('registration-quota');
 const quotaDevice='gm23-quota-'+randomUUID(),firstId=randomUUID();
 const firstBody={requestId:firstId,device_id:quotaDevice,token:null,permission:'unknown'};
 const firstReply=expectOk(await legacyRpc(registrationUser,'register_push_device',firstBody),'first registration quota request');
 for(let n=1;n<30;n++)expectOk(await legacyRpc(registrationUser,'register_push_device',{...firstBody,requestId:randomUUID()}),'registration quota request '+(n+1));
 pass('register quota allows exactly 30 calls before limit',true,true);
 pass('registration ACK replay does not consume quota',firstReply,expectOk(await legacyRpc(registrationUser,'register_push_device',firstBody),'registration replay after quota boundary'));
 expectFail(await legacyRpc(registrationUser,'register_push_device',{...firstBody,requestId:randomUUID()}),'RATE_LIMITED',429,'31st registration in one minute is limited');
}
{
 const unregisterUser=await guest('unregistration-quota');
 const quotaDevice='gm23-quota-'+randomUUID();let firstBody,firstReply;
 for(let n=0;n<30;n++){
  const body={requestId:randomUUID(),device_id:quotaDevice};
  const reply=expectOk(await legacyRpc(unregisterUser,'unregister_push_device',body),'unregister quota request '+(n+1));
  if(n===0){firstBody=body;firstReply=reply;}
 }
 pass('unregister quota allows exactly 30 calls before limit',true,true);
 pass('unregister ACK replay does not consume quota',firstReply,expectOk(await legacyRpc(unregisterUser,'unregister_push_device',firstBody),'unregister replay after quota boundary'));
 expectFail(await legacyRpc(unregisterUser,'unregister_push_device',{requestId:randomUUID(),device_id:quotaDevice}),'RATE_LIMITED',429,'31st unregister in one minute is limited');
}
{
 const inboxUser=await guest('inbox-quota');
 for(let n=1;n<=60;n++){
  const reply=await legacyRpc(inboxUser,'list_partner_inbox',{cursor:null});
  assert.equal(reply.status,200,'inbox quota request '+n);assert.deepEqual(reply.body,[],'empty synthetic inbox '+n);
 }
 pass('inbox quota allows exactly 60 reads before limit',true,true);
 expectFail(await legacyRpc(inboxUser,'list_partner_inbox',{cursor:null}),'RATE_LIMITED',429,'61st inbox read in one minute is limited');
}

if(process.env.GM23_BRUNO==='1')await prepareBruno();
const validated=spawnSync(process.env.GM_V4_PYTHON||'python',['scripts/validate_dish_v4_schema.py','--schema','docs/architecture/schemas/dish-session-v4b-supplement.schema.json','--stdin'],{cwd:root,encoding:'utf8',input:'['+contractSamples.join(',')+']',maxBuffer:2*1024*1024});
assert.equal(validated.status,0,'received GM07 schema mismatch: '+validated.stderr.slice(0,1000));
const paths=['scripts/gm23_canonical_http.mjs','scripts/gm23_canonical_check.py','supabase/tests/notifications_canonical.sql','supabase/functions/push-sender/payload.mjs','supabase/functions/push-sender/index.ts','scripts/gm23_sender_worker.mjs','scripts/gm21_canonical_http.mjs','scripts/gm21_canonical_check.py','scripts/gm20_canonical_check.py','scripts/dish_policy_worker.py','supabase/rollback/0036_gm21_canonical_history.down.sql','docs/architecture/schemas/dish-session-v4b-supplement.schema.json',...readdirSync(resolve(root,'supabase/migrations')).filter(n=>n.endsWith('.sql')).map(n=>'supabase/migrations/'+n)];
const report={result:'Pass',scope:senderOnly?'GM23.2 sender HTTP transport subset':'GM23.2 canonical notification integration plus received GM21 regression',caseCount:results.length,cases:results,
 schema:JSON.parse(validated.stdout),contractVersion,schemaVersion:'0.15.0',applicationDatabaseChanged:false,credentialsInEvidence:false,
 sourceHashes:Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]))};
await writeFile(resolve(output,senderOnly?'sender-results.json':'http-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({result:'Pass',cases:results.length,envelopes:report.schema.envelopesValidated}));
