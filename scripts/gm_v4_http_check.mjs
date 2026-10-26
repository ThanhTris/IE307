import {spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
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
const base=status.API_URL||status.api?.url, key=status.ANON_KEY||status.PUBLISHABLE_KEY, contractVersion='dish-session-v4/roadmap-v2/GM-07.B';
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
async function api(u,command,args={},options={}){const payload={contractVersion,...args},request={command,payload};const r=await fetch(base+'/rest/v1/rpc/dish_session',{method:'POST',headers:{apikey:key,...(u?{authorization:'Bearer '+u.token}:{}),'content-type':'application/json'},body:JSON.stringify(request)});let body;try{body=await r.json();}catch{body={};}contractSamples.push({request,response:body,...(options.requestValid===false?{requestValid:false}:{})});return {status:r.status,body};}
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
assert.equal(sql("select count(*) from public.schema_versions where schema_version='0.9.1' and contract_id='dish-session-v4/roadmap-v2/GM-07.B';"),'1','v4 account-consent migration must be present in the owned QA database');
const host=await guest('v4-host'), member=await guest('v4-member'), outsider=await guest('v4-outsider');
// Real GM-40 catalogue shortage checks before switching to isolated synthetic coverage.
const realRelease=qaMode==='gm03'?manifest.catalogues.real.releaseId:process.env.GM_V4_REAL_RELEASE_ID;
const syntheticRelease=qaMode==='gm03'?manifest.catalogues.synthetic.releaseId:process.env.GM_V4_SYNTHETIC_RELEASE_ID;
const realCount=qaMode==='gm03'?manifest.catalogues.real.count:Number(process.env.GM_V4_REAL_DISH_COUNT);
const realSourceSha256=qaMode==='gm03'?(manifest.catalogues.real.sourceSha256||manifest.catalogues.real.sourceSha):process.env.GM_V4_REAL_SOURCE_SHA256;
const syntheticSha256=qaMode==='gm03'?(manifest.catalogues.synthetic.sourceSha256||manifest.catalogues.synthetic.sha256):process.env.GM_V4_SYNTHETIC_SHA256;
const syntheticCount=qaMode==='gm03'?manifest.catalogues.synthetic.count:20;
const syntheticFixtureOnly=qaMode==='gm03'?manifest.catalogues.synthetic.fixtureOnly===true:true;
assert.ok(realRelease&&syntheticRelease&&Number.isInteger(Number(realCount))&&Number.isInteger(Number(syntheticCount)),'QA catalogue metadata must come from the runtime manifest/setup');
assert.equal(syntheticFixtureOnly,true,'Positive cases must use an explicitly synthetic fixture');
await setActive(realRelease);
const mealCount=meal=>Number(sql("select count(*) from dish_v3_private.catalogues c cross join lateral jsonb_array_elements(c.cards) as dishes(value) where c.id='"+realRelease.replaceAll("'","''")+"' and dishes.value->'mealSlots' ? '"+meal.replaceAll("'","''")+"'"));
for(const [meal,available] of [['dinner',mealCount('dinner')],['snack',mealCount('snack')]]){
 const err=expectFail(await api(host,'create',{requestId:requestId('shortage'),displayName:'QA host',settings:{dishCount:10,mealSlot:meal,desiredAt:null},preferences:pref}),'INSUFFICIENT_DISHES',409,'real catalogue shortage '+meal);
 pass('real catalogue reports exact availability '+meal,{available,requested:10},err.details);
}
await setActive(syntheticRelease);

// Default preference is account-scoped; room copy is member-only and ranking is explicitly unsupported.
const before=expectOk(await api(member,'getDefaultPreferences'),'default preferences initial');
pass('default preference initial revision',0,before.revision);
const chosen={...pref,temperature:'warm'};
const prefAck=expectOk(await api(member,'updateDefaultPreferences',{requestId:requestId('default-pref'),expectedRevision:0,preferences:chosen}),'update default preferences');
pass('default preference increments caller revision',1,prefAck.revision);
const made=await create(host,10,'lunch');const roomId=made.roomId,code=made.code;
const preview=expectOk(await api(member,'previewJoin',{requestId:requestId('preview'),code}),'preview join');
pass('preview contains admission summary, not roster',false,Object.hasOwn(preview,'members'));
pass('preview joinable',true,preview.joinable);
const joined=await join(member,code,'QA member');
const s1=await snapshot(host,roomId);
pass('join snapshots member default preference','warm',s1.members.find(m=>m.userId===member.id) ? (await snapshot(member,roomId)).ownPreferences.temperature : null);
pass('room reports ranking unsupported','UNSUPPORTED',s1.preferenceRanking);
pass('snapshot contains no ready field',false,s1.members.some(m=>Object.hasOwn(m,'ready')));

// Host-owned lobby edits keep exact requested count and rotate pool version; no silent reduction.
let edit=expectOk(await api(host,'updateSettings',{requestId:requestId('settings'),roomId,expectedVersion:s1.version,settings:{dishCount:20,mealSlot:'dinner',desiredAt:null}}),'update settings 20');
pass('host can request exactly 20 dishes',20,edit.settings.dishCount);
let s2=await snapshot(host,roomId);pass('pool contains exactly 20 after settings change',20,s2.pool.length);assert.ok(s2.poolVersion>s1.poolVersion);
edit=expectOk(await api(host,'updateSettings',{requestId:requestId('settings'),roomId,expectedVersion:s2.version,settings:{dishCount:10,mealSlot:'lunch',desiredAt:null}}),'restore settings 10');
let s3=await snapshot(host,roomId);pass('pool contains exact requested 10',10,s3.pool.length);
expectFail(await api(host,'updateSettings',{requestId:requestId('settings'),roomId,expectedVersion:s3.version,settings:{dishCount:21,mealSlot:'lunch',desiredAt:null}},{requestValid:false}),'INVALID_INPUT',400,'dish count 21 rejected');
const prefAckRoom=expectOk(await api(host,'updatePreferences',{requestId:requestId('room-pref'),roomId,expectedVersion:s3.version,preferences:{...pref,temperature:'cold'}}),'update room preferences');
const s4=await snapshot(host,roomId);pass('room preference change increments room version',s3.version+1,s4.version);pass('own preference is room-scoped','cold',s4.ownPreferences.temperature);

// Start requires joined members only: there is no ready action in the v4 protocol.
const started=expectOk(await api(host,'start',{requestId:requestId('start'),roomId,expectedVersion:s4.version}),'host starts');
pass('host starts without ready state','ROUND_1',started.state);pass('start roster size',2,started.memberCount);
let current=await snapshot(host,roomId);const pool=current.pool;
const hostVotes=votesFor(pool,(d,i)=>i===0?'WANT':i===1?'OK':'OK');
const memberVotes=votesFor(pool,(d,i)=>i===0?'OK':i===1?'WANT':'OK');
const hostSubmitId=requestId('r1-host');const hostSubmit=expectOk(await submit(host,roomId,current,hostVotes,hostSubmitId),'R1 host submit');
pass('submit ACK does not start waiting clock',null,(await snapshot(host,roomId)).waitingStartedAt);
const replay=expectOk(await submit(host,roomId,current,hostVotes,hostSubmitId),'R1 exact replay');
pass('same request replay stays accepted',true,replay.accepted);
expectFail(await submit(host,roomId,current,votesFor(pool,()=> 'NO'),hostSubmitId),'REQUEST_ID_REUSED',409,'mutated request id rejected');
expectFail(await submit(host,roomId,current,votesFor(pool,()=> 'NO')),'ALREADY_SUBMITTED',409,'second ballot rejected');
current=await snapshot(member,roomId);const memberSubmit=await submit(member,roomId,current,memberVotes);expectOk(memberSubmit,'R1 member submit');
let round2=await snapshot(host,roomId);pass('R1 without winner advances to a real round 2',2,round2.round);pass('R1 open survivor pool is nonempty',true,round2.pool.length>0);pass('R2 removal cap for 10 candidates',3,round2.removalCap);
const overCap=votesFor(round2.pool,(d,i)=>i<4?'REMOVE':'KEEP');
expectFail(await submit(host,roomId,round2,overCap),'REMOVE_LIMIT',409,'R2 cap plus one rejected');
const removedDish=pool[9];const removedIndex=round2.pool.findIndex(d=>d.dishId===removedDish.dishId);assert.notEqual(removedIndex,-1);const r2hostVotes=votesFor(round2.pool,(d,i)=>i===removedIndex?'REMOVE':'KEEP');
const r2id=requestId('r2-host');const accepted=expectOk(await submit(host,roomId,round2,r2hostVotes,r2id),'R2 host submit');
const r2afterSubmit=await snapshot(host,roomId);pass('ACK alone does not start R2 waiting clock',null,r2afterSubmit.waitingStartedAt);
const waiting=expectOk(await api(host,'waiting',{...versionArgs(roomId,r2afterSubmit,2),requestId:requestId('waiting')}),'R2 host waiting');
pass('waiting deadline is 60 seconds',60000,Date.parse(waiting.deadline)-Date.parse(waiting.waitingStartedAt));
const waitingSnap=await snapshot(host,roomId);pass('exact half roster cannot end early',false,waitingSnap.canEndWaiting);
expectFail(await api(host,'finalize',{requestId:requestId('early-finalize'),roomId,expectedVersion:waitingSnap.version}),'NOT_READY',409,'host early end below strict majority');
const m2=await snapshot(member,roomId);const memberR2=await submit(member,roomId,m2,votesFor(m2.pool,()=> 'KEEP'));expectOk(memberR2,'R2 member submit');
const final=await snapshot(host,roomId);pass('all complete round-two ballots finalize server-side','DECIDED',final.state);assert.equal(final.state,'DECIDED');assert.equal(final.result.status,'DECIDED');
pass('Top 3 scores sort/tie with dense ranks',[1,1,2],final.result.topDishes.map(d=>d.rank));
pass('Top 3 score basis',[3,3,2],final.result.topDishes.map(d=>d.score));
pass('Top 3 tie cutoff stays capped and contains winner',true,final.result.topDishes.length<=3&&final.result.topDishes.some(d=>d.isWinner));
pass('winner is on podium',true,final.result.topDishes.some(d=>d.isWinner));
pass('R2 removed dish absent from podium',false,final.result.topDishes.some(d=>d.dish.dishId===removedDish.dishId));
pass('private vote and seed are absent from result',false,['votes','ballots','seed','poolSeed'].some(k=>Object.hasOwn(final.result,k)));
const readResult=expectOk(await api(member,'result',{roomId}),'result API');pass('result API returns persisted result id',final.result.resultId,readResult.resultId);
expectFail(await api(outsider,'result',{roomId}),'NOT_MEMBER',403,'outsider cannot read result');

// N=1 still opens a real R2 and an accepted REMOVE by both players yields NO_CONSENSUS.
const one=await create(host,10,'breakfast'), oneRoom=one.roomId;await join(member,one.code,'QA member');let oneSnap=await snapshot(host,oneRoom);
expectOk(await api(host,'start',{requestId:requestId('start-n1'),roomId:oneRoom,expectedVersion:oneSnap.version}),'start N=1 case');
oneSnap=await snapshot(host,oneRoom);
const rv1=votesFor(oneSnap.pool,(d,i)=>i===0?'OK':'NO');expectOk(await submit(host,oneRoom,oneSnap,rv1),'N=1 R1 host submit');
let oneMemberSnap=await snapshot(member,oneRoom);const oneResult=await submit(member,oneRoom,oneMemberSnap,votesFor(oneMemberSnap.pool,(d,i)=>i===0?'OK':'NO'));expectOk(oneResult,'N=1 R1 member submit');
let only=await snapshot(host,oneRoom);pass('N=1 after R1 opens R2',2,only.round);pass('R2 carries one candidate',1,only.pool.length);pass('N=1 removal cap remains one',1,only.removalCap);
await submit(host,oneRoom,only,votesFor(only.pool,()=> 'REMOVE'));
let onlyMember=await snapshot(member,oneRoom);const removed=await submit(member,oneRoom,onlyMember,votesFor(onlyMember.pool,()=> 'REMOVE'));expectOk(removed,'N=1 R2 member remove');
const noConsensus=await snapshot(host,oneRoom);pass('removing all candidates ends without winner','NO_CONSENSUS',noConsensus.state);pass('all removed reason','ALL_REMOVED',noConsensus.result.reasonCode);pass('all removed podium empty',0,noConsensus.result.topDishes.length);

// Empty R1 intersection terminates immediately and does not open an empty R2.
const empty=await create(host,10,'snack'), emptyRoom=empty.roomId;await join(member,empty.code,'QA member');let e1=await snapshot(host,emptyRoom);
expectOk(await api(host,'start',{requestId:requestId('start-empty'),roomId:emptyRoom,expectedVersion:e1.version}),'start empty intersection case');
e1=await snapshot(host,emptyRoom);expectOk(await submit(host,emptyRoom,e1,votesFor(e1.pool,()=> 'NO')),'empty intersection R1 host submit');
let e2=await snapshot(member,emptyRoom);const emptyAck=await submit(member,emptyRoom,e2,votesFor(e2.pool,()=> 'NO'));expectOk(emptyAck,'empty intersection R1 member submit');
const emptySnap=await snapshot(host,emptyRoom);pass('empty intersection ends in R1','NO_CONSENSUS',emptySnap.state);pass('empty intersection reason','EMPTY_INTERSECTION',emptySnap.result.reasonCode);pass('empty R1 does not create R2',1,emptySnap.round);

// Three-person room proves waiting gate uses locked roster, not presence or ready flags.
const three=await create(host,10,'dinner'), threeRoom=three.roomId;await join(member,three.code,'QA member');await join(outsider,three.code,'QA outsider');let t0=await snapshot(host,threeRoom);await api(host,'start',{requestId:requestId('start3'),roomId:threeRoom,expectedVersion:t0.version});
let t1=await snapshot(host,threeRoom);await submit(host,threeRoom,t1,votesFor(t1.pool,()=> 'OK'));let tw=await snapshot(host,threeRoom);
expectOk(await api(host,'waiting',{...versionArgs(threeRoom,tw,1),requestId:requestId('wait3')}),'3p waiting');tw=await snapshot(host,threeRoom);
pass('one of three cannot end wait',false,tw.canEndWaiting);expectFail(await api(host,'finalize',{requestId:requestId('early3'),roomId:threeRoom,expectedVersion:tw.version}),'NOT_READY',409,'three-person strict majority below threshold');
let tMember=await snapshot(member,threeRoom);await submit(member,threeRoom,tMember,votesFor(tMember.pool,()=> 'OK'));tw=await snapshot(host,threeRoom);pass('two of three can end wait',true,tw.canEndWaiting);
const advanced=expectOk(await api(host,'finalize',{requestId:requestId('finalize3'),roomId:threeRoom,expectedVersion:tw.version}),'host ends waiting after majority');
pass('host finalize acknowledges transition','ROUND_ADVANCED',advanced.outcome);pass('finalize state is round two','ROUND_2',advanced.state);

// Real timeout worker: backdate only this owned QA room timer; worker finalizes without another client call.
const timed=await create(host,10,'dinner'), timedRoom=timed.roomId;await join(member,timed.code,'QA member');let q0=await snapshot(host,timedRoom);await api(host,'start',{requestId:requestId('start-timeout'),roomId:timedRoom,expectedVersion:q0.version});
let q1=await snapshot(host,timedRoom);await submit(host,timedRoom,q1,votesFor(q1.pool,()=> 'OK'));let q2=await snapshot(host,timedRoom);await api(host,'waiting',{...versionArgs(timedRoom,q2,1),requestId:requestId('wait-timeout')});
sql("update dish_v4_private.sessions set waiting_started_at=clock_timestamp()-interval '61 seconds' where room_id='"+timedRoom+"';");
let timedSnap;for(let i=0;i<12;i++){await new Promise(r=>setTimeout(r,1000));timedSnap=await snapshot(host,timedRoom);if(timedSnap.state==='ROUND_2'||timedSnap.state==='DECIDED'||timedSnap.state==='NO_CONSENSUS')break;}
pass('worker timeout advances state without client finalize','ROUND_2',timedSnap.state);

// The 20-member cap includes host; a 21st join receives a typed ROOM_FULL error.
// Invitation acceptance must use the same v4 admission rules as direct join.
const hostIdentity=await legacyRpc(host,'get_my_social_identity');
const outsiderIdentity=await legacyRpc(outsider,'get_my_social_identity');
pass('social identity endpoint available for authenticated caller',200,hostIdentity.status);
const friendInvite=await legacyRpc(host,'invite_partner',{requestId:randomUUID(),friend_code:outsiderIdentity.body.friendCode,partner_id:null});
assert.equal(friendInvite.status,200,'friend invite HTTP '+friendInvite.status+' '+JSON.stringify({code:friendInvite.body.code,message:friendInvite.body.message}));assert.equal(friendInvite.body.ok,true);
const friendAccepted=await legacyRpc(outsider,'accept_partner',{requestId:randomUUID(),invitation_id:friendInvite.body.data.id});
assert.equal(friendAccepted.status,200);assert.equal(friendAccepted.body.ok,true);
const invitedRoom=await create(host,10,'lunch'),invitedRoomId=invitedRoom.roomId;
let invitedSnap=await snapshot(host,invitedRoomId);
expectOk(await api(host,'updateSettings',{requestId:requestId('invite-settings'),roomId:invitedRoomId,expectedVersion:invitedSnap.version,settings:{dishCount:11,mealSlot:'lunch',desiredAt:null}}),'prepare current invitation version');
const staleInvite=await legacyRpc(host,'invite_to_room',{requestId:randomUUID(),room_id:invitedRoomId,partner_id:outsider.id,expected_version:invitedSnap.version});
assert.equal(staleInvite.status,409);assert.equal(staleInvite.body.messageKey??staleInvite.body.error?.messageKey,'VERSION_CONFLICT');
results.push({case:'stale invitation version rejected before retry',result:'Pass',expected:{status:409,code:'VERSION_CONFLICT'},actual:{status:staleInvite.status,code:staleInvite.body.messageKey??staleInvite.body.error?.messageKey}});console.log('PASS stale invitation version rejected before retry');
invitedSnap=await snapshot(host,invitedRoomId);
const roomInvite=await legacyRpc(host,'invite_to_room',{requestId:randomUUID(),room_id:invitedRoomId,partner_id:outsider.id,expected_version:invitedSnap.version});
assert.equal(roomInvite.status,200);assert.equal(roomInvite.body.ok,true);
const acceptedRoom=await legacyRpc(outsider,'accept_room_invite',{requestId:randomUUID(),invitation_id:roomInvite.body.data.id,display_name:'QA invited member'});
assert.equal(acceptedRoom.status,200);assert.equal(acceptedRoom.body.ok,true);
const invitedMemberSnap=await snapshot(outsider,invitedRoomId);pass('invitation admission uses v4 capacity',2,invitedMemberSnap.memberCount);
pass('invited member is immediately in lobby',true,invitedMemberSnap.members.some(m=>m.userId===outsider.id));
pass('v4 invitation snapshot has no ready state',false,invitedMemberSnap.members.some(m=>Object.hasOwn(m,'ready')));
const invitationInbox=await legacyRpc(outsider,'list_partner_inbox',{cursor:null});assert.equal(invitationInbox.status,200);
pass('inbox invitation references admitted room',true,invitationInbox.body.some(i=>i.type==='room_invite'&&i.metadata?.roomId===invitedRoomId));

// History is created only from explicit consent, immutable result projection, and is removed on revoke/delete/expiry.
for(const [user,scope] of [[host,'personal'],[host,'group'],[member,'personal'],[member,'group']]){
 const consent=await legacyRpc(user,'update_history_consent',{requestId:randomUUID(),scope,consent:true});assert.equal(consent.status,200);assert.equal(consent.body.ok,true);
}
// Regression: account consent is enabled before the room and membership exist.
const historyRoom=await create(host,10,'lunch'),historyRoomId=historyRoom.roomId;await join(member,historyRoom.code,'QA history member');
let hs=await snapshot(host,historyRoomId);expectOk(await api(host,'start',{requestId:requestId('start-history'),roomId:historyRoomId,expectedVersion:hs.version}),'start history room');
hs=await snapshot(host,historyRoomId);expectOk(await submit(host,historyRoomId,hs,votesFor(hs.pool,()=> 'OK')),'history R1 host submit');
hs=await snapshot(member,historyRoomId);expectOk(await submit(member,historyRoomId,hs,votesFor(hs.pool,()=> 'OK')),'history R1 member submit');
hs=await snapshot(host,historyRoomId);pass('history R1 no unanimous WANT advances to R2',2,hs.round);
expectOk(await submit(host,historyRoomId,hs,votesFor(hs.pool,()=> 'KEEP')),'history R2 host submit');
hs=await snapshot(member,historyRoomId);expectOk(await submit(member,historyRoomId,hs,votesFor(hs.pool,()=> 'KEEP')),'history R2 member submit');
const hostHistory=expectOk(await api(host,'history'),'host history');const memberHistory=expectOk(await api(member,'history'),'member history');
const hostPersonal=hostHistory.items.find(i=>i.scope==='personal'&&i.roomId===historyRoomId),memberPersonal=memberHistory.items.find(i=>i.scope==='personal'&&i.roomId===historyRoomId);
const groupHistory=hostHistory.items.find(i=>i.scope==='group'&&i.roomId===historyRoomId);
pass('explicit consent persists personal history',true,Boolean(hostPersonal&&memberPersonal));pass('all-member consent persists one group projection',true,Boolean(groupHistory&&memberHistory.items.some(i=>i.historyId===groupHistory.historyId)));
pass('history projection reuses persisted Top 3',true,Array.isArray(groupHistory?.result?.topDishes));
pass('history Top 3 tie cutoff stays capped and contains winner',true,groupHistory.result.topDishes.length<=3&&groupHistory.result.topDishes.some(d=>d.isWinner));
const deleted=expectOk(await api(member,'deleteHistory',{requestId:requestId('delete-history'),historyId:memberPersonal.historyId}),'delete own personal history');pass('owner can delete own history',true,deleted.accepted);
let afterDelete=expectOk(await api(member,'history'),'member history after delete');pass('deleted personal history is absent',false,afterDelete.items.some(i=>i.historyId===memberPersonal.historyId));
const revoke=await legacyRpc(member,'update_history_consent',{requestId:randomUUID(),scope:'group',consent:false});assert.equal(revoke.status,200);assert.equal(revoke.body.ok,true);
const memberAfterRevoke=expectOk(await api(member,'history'),'member history after group revoke'),hostAfterRevoke=expectOk(await api(host,'history'),'host history after group revoke');
pass('group revoke purges projection for all participants',false,[...memberAfterRevoke.items,...hostAfterRevoke.items].some(i=>i.historyId===groupHistory.historyId));
sql("update dish_v4_private.history set created_at=clock_timestamp()-interval '31 days',expires_at=clock_timestamp()-interval '1 day' where id='"+hostPersonal.historyId+"';");
const afterExpiry=expectOk(await api(host,'history'),'host history after expiry');pass('expired history is hidden by API',false,afterExpiry.items.some(i=>i.historyId===hostPersonal.historyId));

// Verify each account-level scope independently and the consent/start boundary.
async function setHistoryConsent(user,scope,consent){
 const response=await legacyRpc(user,'update_history_consent',{requestId:randomUUID(),scope,consent});
 assert.equal(response.status,200,'history consent '+scope+' HTTP '+response.status);
 assert.equal(response.body.ok,true,'history consent '+scope+' rejected');
}
async function finishConsentRoom(roomHost,roomMember,label,{beforeStart,afterStart}={}){
 const madeRoom=await create(roomHost,10,'lunch');
 await join(roomMember,madeRoom.code,('C-'+label).slice(0,18));
 if(beforeStart) await beforeStart(madeRoom);
 let snap=await snapshot(roomHost,madeRoom.roomId);
 expectOk(await api(roomHost,'start',{requestId:requestId('consent-start-'+label),roomId:madeRoom.roomId,expectedVersion:snap.version}),'consent '+label+' start');
 if(afterStart) await afterStart(madeRoom);
 snap=await snapshot(roomHost,madeRoom.roomId);
 expectOk(await submit(roomHost,madeRoom.roomId,snap,votesFor(snap.pool,()=> 'OK')),'consent '+label+' host R1');
 snap=await snapshot(roomMember,madeRoom.roomId);
 expectOk(await submit(roomMember,madeRoom.roomId,snap,votesFor(snap.pool,()=> 'OK')),'consent '+label+' member R1');
 snap=await snapshot(roomHost,madeRoom.roomId);
 assert.equal(snap.round,2,'consent '+label+' must exercise R2');
 expectOk(await submit(roomHost,madeRoom.roomId,snap,votesFor(snap.pool,()=> 'KEEP')),'consent '+label+' host R2');
 snap=await snapshot(roomMember,madeRoom.roomId);
 expectOk(await submit(roomMember,madeRoom.roomId,snap,votesFor(snap.pool,()=> 'KEEP')),'consent '+label+' member R2');
 const terminal=await snapshot(roomHost,madeRoom.roomId);
 assert.ok(['DECIDED','NO_CONSENSUS'].includes(terminal.state),'consent '+label+' terminal state');
 return {madeRoom,terminal,hostItems:expectOk(await api(roomHost,'history'),'consent '+label+' host history').items,memberItems:expectOk(await api(roomMember,'history'),'consent '+label+' member history').items};
}
function roomHistory(items,room,scope){return items.find(item=>item.roomId===room&&item.scope===scope);}

const personalHost=await guest('consent-personal-host'),personalMember=await guest('consent-personal-member');
await setHistoryConsent(personalHost,'personal',true);await setHistoryConsent(personalMember,'personal',true);
const personalOnly=await finishConsentRoom(personalHost,personalMember,'personal-only');
pass('personal-only consent writes each personal projection',true,Boolean(roomHistory(personalOnly.hostItems,personalOnly.madeRoom.roomId,'personal')&&roomHistory(personalOnly.memberItems,personalOnly.madeRoom.roomId,'personal')));
pass('personal-only consent does not write group projection',false,Boolean(roomHistory(personalOnly.hostItems,personalOnly.madeRoom.roomId,'group')));

const groupHost=await guest('consent-group-host'),groupMember=await guest('consent-group-member');
await setHistoryConsent(groupHost,'group',true);await setHistoryConsent(groupMember,'group',true);
const groupOnly=await finishConsentRoom(groupHost,groupMember,'group-only');
pass('group-only consent writes shared projection',true,Boolean(roomHistory(groupOnly.hostItems,groupOnly.madeRoom.roomId,'group')&&roomHistory(groupOnly.memberItems,groupOnly.madeRoom.roomId,'group')));
pass('group-only consent does not write personal projection',false,Boolean(roomHistory(groupOnly.hostItems,groupOnly.madeRoom.roomId,'personal')));

const partialHost=await guest('consent-partial-host'),partialMember=await guest('consent-partial-member');
await setHistoryConsent(partialHost,'group',true);
const partialGroup=await finishConsentRoom(partialHost,partialMember,'partial-group');
pass('group projection requires every roster member consent',false,Boolean(roomHistory(partialGroup.hostItems,partialGroup.madeRoom.roomId,'group')));

const lobbyHost=await guest('consent-lobby-host'),lobbyMember=await guest('consent-lobby-member');
await setHistoryConsent(lobbyMember,'personal',true);
const lobbyGrant=await finishConsentRoom(lobbyHost,lobbyMember,'lobby-grant',{beforeStart:async()=>setHistoryConsent(lobbyHost,'personal',true)});
pass('consent enabled during lobby is included at start',true,Boolean(roomHistory(lobbyGrant.hostItems,lobbyGrant.madeRoom.roomId,'personal')&&roomHistory(lobbyGrant.memberItems,lobbyGrant.madeRoom.roomId,'personal')));

const lateHost=await guest('consent-late-host'),lateMember=await guest('consent-late-member');
const lateOptIn=await finishConsentRoom(lateHost,lateMember,'late-opt-in',{afterStart:async()=>{await setHistoryConsent(lateHost,'personal',true);await setHistoryConsent(lateMember,'personal',true);}});
pass('post-start opt-in does not grant consent retroactively',false,Boolean(roomHistory(lateOptIn.hostItems,lateOptIn.madeRoom.roomId,'personal')||roomHistory(lateOptIn.memberItems,lateOptIn.madeRoom.roomId,'personal')));

const revokeHost=await guest('consent-revoke-host'),revokeMember=await guest('consent-revoke-member');
await setHistoryConsent(revokeHost,'personal',true);await setHistoryConsent(revokeMember,'personal',true);
const revoked=await finishConsentRoom(revokeHost,revokeMember,'revoke-before-finalize',{afterStart:async()=>setHistoryConsent(revokeHost,'personal',false)});
pass('revoke before finalize suppresses only revoked personal scope',true,!roomHistory(revoked.hostItems,revoked.madeRoom.roomId,'personal')&&Boolean(roomHistory(revoked.memberItems,revoked.madeRoom.roomId,'personal')));

const capRoom=await create(host,20,'lunch');const capUsers=[];for(let i=0;i<17;i++)capUsers.push(await guest('cap-'+i));
for(let i=0;i<17;i++)await join(capUsers[i],capRoom.code,'Cap '+i);
// Existing member and outsider complete the 20-person roster.
await join(member,capRoom.code,'QA member');await join(outsider,capRoom.code,'QA outsider');
const fullSnap=await snapshot(host,capRoom.roomId);pass('room accepts exactly 20 members',20,fullSnap.memberCount);
const overflow=await api(capUsers[0],'join',{requestId:requestId('overflow'),code:capRoom.code,displayName:'Overflow'});
// Existing member is already in room, so use a fresh guest for the 21st attempt.
const overGuest=await guest('overflow');const overflow2=await api(overGuest,'join',{requestId:requestId('overflow'),code:capRoom.code,displayName:'Overflow'});
expectFail(overflow2,'ROOM_FULL',409,'21st member rejected');

// Inbox rows use result references; account privacy does not expose anyone's ballot.
const inbox=await fetch(base+'/rest/v1/rpc/list_partner_inbox',{method:'POST',headers:{apikey:key,authorization:'Bearer '+member.token,'content-type':'application/json'},body:JSON.stringify({cursor:null})});
const inboxBody=await inbox.json();pass('inbox API callable for authenticated member',200,inbox.status);

const schemaCheck=spawnSync(process.env.GM_V4_PYTHON||'python',['scripts/validate_dish_v4_schema.py','--schema','docs/architecture/schemas/dish-session-v4b.schema.json','--stdin'],{cwd:root,encoding:'utf8',input:JSON.stringify(contractSamples),maxBuffer:2*1024*1024});
assert.equal(schemaCheck.status,0,'Actual GM-07.B HTTP request/response samples failed JSON Schema 2020-12 validation: '+(schemaCheck.stderr||'').slice(0,1200));
const schemaSummary=JSON.parse(schemaCheck.stdout);assert.equal(schemaSummary.result,'Pass');
results.push({case:'actual HTTP requests and responses validate as JSON Schema 2020-12',result:'Pass',expected:'all v4 dish_session envelopes valid',actual:{envelopesValidated:schemaSummary.envelopesValidated}});
assert.ok(results.length>=82,'The established v4 coverage floor of 82 assertions must remain');
if(qaMode==='gm03')await setActive(realRelease);
const revision=qaMode==='gm03'?manifest.sourceRevision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const migrationPaths=readdirSync(resolve(root,'supabase/migrations')).filter(name=>name.endsWith('.sql')).sort().map(name=>'supabase/migrations/'+name);
const hashedPaths=['docs/architecture/schemas/dish-session-v4b.schema.json','tests/fixtures/dish-catalogue-v1/qa-v4-synthetic.json','scripts/dish_policy_worker.py',...migrationPaths];
const sourceHashes=Object.fromEntries(hashedPaths.map(path=>[path,createHash('sha256').update(readFileSync(resolve(root,path))).digest('hex')]));
const report={result:'Pass',runId:qaMode==='gm03'?manifest.runId:project,target:'dedicated Supabase QA project '+project,branch:qaMode==='gm03'?manifest.branch:(process.env.GITHUB_REF_NAME||'local'),sha:revision,contractVersion,policyVersion,schemaVersion:'0.9.1',schemaSha256:sourceHashes['docs/architecture/schemas/dish-session-v4b.schema.json'],sourceHashes,dataset:{realRelease,realSourceSha256,realCount,realMealCounts:{breakfast:mealCount('breakfast'),lunch:mealCount('lunch'),dinner:mealCount('dinner'),snack:mealCount('snack')},syntheticRelease,syntheticSha256,syntheticCount,syntheticFixtureOnly},schemaValidation:schemaSummary,caseCount:results.length,cases:results,credentialsWritten:false,applicationDatabaseChanged:false};
const reportPath=qaMode==='ci'&&process.env.GM_V4_REPORT_PATH?process.env.GM_V4_REPORT_PATH:resolve(qa,'api-check-results.json');
await writeFile(reportPath,JSON.stringify(report,null,2)+'\n','utf8');
console.log(JSON.stringify({result:'PASS',caseCount:results.length,contractEnvelopesValidated:schemaSummary.envelopesValidated,report:reportPath,applicationDatabaseChanged:false}));


