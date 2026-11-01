/** GM-22.2 HTTP checks against one owned Supabase Auth+REST QA project. */
import assert from 'node:assert/strict';
import {execFileSync,spawn,spawnSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,chmod,unlink} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {resolve,sep} from 'node:path';

const root=process.cwd();
const project=process.env.GM_V4_QA_PROJECT_ID;
const workdir=process.env.GM_V4_QA_WORKDIR;
const container=process.env.GM_V4_QA_CONTAINER;
const namespace=process.env.GM_V4_OWNER_NAMESPACE;
const qaWorkdir=resolve(workdir||'.');
const workerPausePath=resolve(qaWorkdir,'.gm22-pause-policy-worker');
const brunoSetup=process.argv.includes('--prepare-bruno');
const contractB='dish-session-v4/roadmap-v2/GM-07.B';
const contractBsup='dish-session-v4/roadmap-v2/GM-07.B-supplement';
const policyV4='dish-decision-v4/ADR-019-30PCT-MIN1';
const pref={cuisineIds:[],categoryIds:[],temperature:null,flavor:null,budget:null,avoidRecent:false};
const results=[];
const users=[];

assert.match(project||'',/^ie307-dish-v4-qa-\d{8}(?:-\d+-\d+)?$/,'GM-22 requires an owned GM_V4 QA project');
assert.equal(container,'supabase_db_'+project,'GM-22 QA database container must match the owned project');
assert.ok(workdir&&namespace,'GM-22 QA workdir and namespace are required');
assert.ok(qaWorkdir.toLowerCase().startsWith((resolve(root,'.work/ci')+sep).toLowerCase()),'GM-22 worker control must stay inside its QA workdir');
assert.equal(qaWorkdir.split(/[\\/]/).at(-1),project.replace(/^ie307-/,''),'GM-22 QA workdir must match its project');
const statusResult=spawnSync(process.execPath,[resolve(root,'node_modules/supabase/dist/supabase.js'),'status','--output','json','--workdir',workdir],{encoding:'utf8',maxBuffer:1024*1024});
assert.equal(statusResult.status,0,'owned QA Supabase status must be available');
const status=JSON.parse(statusResult.stdout);
const base=(status.API_URL||status.api?.url||'').replace(/\/$/,'');
const anonKey=status.ANON_KEY||status.PUBLISHABLE_KEY;
assert.equal(new URL(base).hostname,'127.0.0.1','QA Auth and REST must bind to loopback');
assert.equal(new URL(base).port,'54361','GM-22 must use its explicit QA API port');
assert.ok(anonKey,'QA publishable key is missing');

function docker(args){return execFileSync('docker',args,{encoding:'utf8',maxBuffer:2*1024*1024});}
function sqlRaw(query){return docker(['exec','-i',container,'psql','-X','-q','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At','-c',query]).trim();}
function sqlAsync(query){return new Promise((resolve,reject)=>{
 const child=spawn('docker',['exec','-i',container,'psql','-X','-q','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At','-c',query],{shell:false,stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',()=>{});
 child.once('error',()=>reject(Error('Owned QA SQL operation unavailable')));
 child.once('close',code=>code===0?resolve(output.trim()):reject(Error('Owned QA SQL operation failed')));
});}
function ownedSql(query){
 const inspected=JSON.parse(docker(['inspect',container]))[0];
 const labels=inspected.Config?.Labels||{};
 assert.equal(inspected.Name,'/'+container);
 assert.equal(labels['com.supabase.cli.project'],project);
 assert.equal(String(labels['com.supabase.cli.workdir']||'').replaceAll('\\','/').toLowerCase(),String(workdir).replaceAll('\\','/').toLowerCase());
 assert.equal(inspected.State?.Running,true);
 assert.equal(sqlRaw('select namespace::text from public.gm40_qa_owner'),namespace,'QA owner marker mismatch');
 return sqlRaw(query);
}
function uuid(value){assert.match(value,/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);return value;}
function clean(value){return JSON.parse(JSON.stringify(value,(key,item)=>{
 if(typeof item==='string'&&/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(item))return '[REDACTED JWT]';
 if(/token|secret|password|key/i.test(key))return '[REDACTED]';
 if(typeof item==='string'&&/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(item))return '<uuid>';
 return item;
}));}
function pass(name,expected,actual){assert.deepEqual(actual,expected,name);results.push({case:name,result:'Pass',expected:clean(expected),actual:clean(actual)});console.log('PASS',name);}
function responseCode(body){return body?.messageKey??body?.error?.messageKey??body?.error?.code??null;}
function expectOk(response,name){assert.equal(response.status,200,name+' HTTP '+response.status+' '+JSON.stringify(response.body));assert.equal(response.body?.ok,true,name+' RPC rejected '+responseCode(response.body));return response.body.data;}
function expectFail(response,status,code,name){assert.equal(response.status,status,name+' HTTP '+response.status+' '+JSON.stringify(response.body));assert.equal(responseCode(response.body),code,name+' error messageKey');results.push({case:name,result:'Pass',expected:{status,code},actual:{status:response.status,code:responseCode(response.body)}});console.log('PASS',name);return response.body;}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitForOwnedSql(query,name,timeoutMs=5000){
 const stopAt=Date.now()+timeoutMs;
 while(Date.now()<stopAt){if(ownedSql(query)==='t')return;await pause(100);}
 throw new Error('GM22_TTL_LOCK_COORDINATION_FAILED: '+name);
}
function workerLastTick(){return ownedSql('select last_tick::text from dish_v4_private.runtime where singleton');}
async function pauseQaPolicyWorker(){
 const before=workerLastTick();
 await writeFile(workerPausePath,project+'\n',{encoding:'utf8',flag:'wx'});
 let candidate=before;
 for(let attempt=0;attempt<8;attempt++){
  await pause(1200);
  const current=workerLastTick();
  if(current===candidate)return current;
  candidate=current;
 }
 await unlink(workerPausePath);
 throw new Error('GM22_TTL_WORKER_PAUSE_FAILED');
}
async function resumeQaPolicyWorker(pausedTick){
 await unlink(workerPausePath);
 for(let attempt=0;attempt<20;attempt++){
  await pause(250);
  const current=workerLastTick();
  if(current!==pausedTick)return current;
 }
 throw new Error('GM22_TTL_WORKER_RESUME_FAILED');
}
async function request(path,token,body,headers={}){
 const response=await fetch(base+path,{method:'POST',headers:{apikey:anonKey,'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{}),...headers},body:JSON.stringify(body)});
 let data;try{data=await response.json();}catch{data={};}
 return {status:response.status,body:data};
}
async function rpc(name,token,body){return request('/rest/v1/rpc/'+name,token,body);}
async function dish(token,command,payload,wireVersion){
 if(wireVersion==='v3')return rpc('dish_session',token,{command,payload});
 const contractVersion=wireVersion==='bsup'?contractBsup:contractB;
 return rpc('dish_session',token,{command,payload:{contractVersion,...payload}});
}
async function guest(name){
 const response=await fetch(base+'/auth/v1/signup',{method:'POST',headers:{apikey:anonKey,'content-type':'application/json'},body:JSON.stringify({data:{display_name:name,gm22_qa_project:project}})});
 let data={};try{data=await response.json();}catch{}
 assert.ok([200,201].includes(response.status),'isolated GoTrue guest signup failed: '+response.status+' '+JSON.stringify(data));
 assert.ok(data.access_token&&data.user?.id,'GoTrue response did not contain a guest JWT/identity');
 const user={id:uuid(data.user.id),token:data.access_token,friendCode:null};users.push(user);
 const identity=await rpc('get_my_social_identity',user.token,{});
 assert.equal(identity.status,200);user.friendCode=identity.body.friendCode;
 return user;
}
function roomId(data){return uuid(data.roomId||data.id);}
function statusOfRoom(room){return ownedSql(`select state from public.rooms where id='${uuid(room)}'`);}
function versionOfRoom(room){return Number(ownedSql(`select version from public.rooms where id='${uuid(room)}'`));}
function activeCount(room){return Number(ownedSql(`select count(*) from public.members where room_id='${uuid(room)}' and left_at is null`));}
function memberRow(room,user){return JSON.parse(ownedSql(`select json_build_object('id',id,'nickname',nickname,'ready',ready,'leftAt',left_at,'version',version) from public.members where room_id='${uuid(room)}' and user_id='${uuid(user)}'`));}
function linkPair(left,right){
 const a=uuid(left),b=uuid(right),[low,high]=[a,b].sort();
 ownedSql(`insert into public.friends(id,low_user_id,high_user_id,accepted_at,version) values(gen_random_uuid(),'${low}','${high}',clock_timestamp(),1) on conflict(low_user_id,high_user_id) do nothing`);
}
function seedMembers(room,memberIds,policy){
 if(!memberIds.length)return;
 const r=uuid(room),ids=memberIds.map(uuid);
 const values=ids.map((id,index)=>`(gen_random_uuid(),'${r}','${id}','GM22 fixture ${index}',false,false,clock_timestamp(),null,1)`).join(',');
 const roster=ids.map(id=>`'${id}'::uuid`).join(',');
 const flags=policy==='v3'?'select set_config(\'dish_v3.writer\',\'on\',true);':policy==='v4'?'select set_config(\'dish_v4.writer\',\'on\',true);':'select set_config(\'dish_v3.writer\',\'on\',true);select set_config(\'dish_v4.writer\',\'on\',true);';
 ownedSql(`begin;${flags} insert into public.members(id,room_id,user_id,nickname,ready,history_consent,joined_at,left_at,version) values ${values}; update public.rooms set roster_user_ids=roster_user_ids||array[${roster}],version=version+${ids.length},updated_at=clock_timestamp() where id='${r}'; commit;`);
}
function grantHostPairs(host,targets){for(const target of targets)linkPair(host.id,target.id);}
async function inviteRoom(host,room,target,expectedVersion=versionOfRoom(room)){
 return rpc('invite_to_room',host.token,{requestId:randomUUID(),room_id:room,partner_id:target.id,expected_version:expectedVersion});
}
async function acceptRoom(user,invitation,displayName='GM22 recipient',requestIdValue=randomUUID()){
 return rpc('accept_room_invite',user.token,{requestId:requestIdValue,invitation_id:invitation,display_name:displayName});
}
async function createV2(host){
 const desired=new Date(Date.now()+30*60*1000).toISOString();
 const result=expectOk(await rpc('create_room',host.token,{requestId:randomUUID(),display_name:'GM22 v2 host',anchor_id:process.env.GM22_QA_ANCHOR_ID,radius_m:1500,desired_at:desired,service_mode:'dine_in',meal_slot:'lunch',time_hint:null,budget:null,avoid_recent:false}),'create decision-v2 room');
 return {id:roomId(result),code:result.code,policy:'v2'};
}
async function createDishRoom(host,version='v3'){
 const payload=version==='v3'
  ?{requestId:randomUUID(),displayName:'GM22 v3 host',dishCount:10,mealSlot:'lunch',cuisineIds:[],categoryIds:[]}
  :{requestId:randomUUID(),displayName:version==='b'?'GM22 B host':'GM22 B supplement host',
    settings:{dishCount:10,mealSlot:'lunch',desiredAt:null},preferences:pref};
 const wireVersion=version==='v3'?'v3':version==='bsup'?'bsup':'b';
 const result=expectOk(await dish(host.token,'create',payload,wireVersion),'create '+version+' room');
 return {id:roomId(result),code:result.code,policy:wireVersion};
}
async function createRoom(host,version){return version==='v2'?createV2(host):createDishRoom(host,version);}
async function roomSnapshot(user,room,version){
 if(version==='v2')return expectOk(await rpc('get_room_snapshot',user.token,{room_id:room}),'read decision-v2 room snapshot');
 const wireVersion=version==='v3'?'v3':version==='bsup'?'bsup':'b';
 return expectOk(await dish(user.token,'snapshot',{roomId:room},wireVersion),'read '+version+' room snapshot');
}
async function inviteAndAccept(host,target,room,version,acceptRequestId=randomUUID()){
 const sent=expectOk(await inviteRoom(host,room.id,target),'invite room member');
 const response=await acceptRoom(target,sent.id,'GM22 invited',acceptRequestId);
 return {invitation:sent,response,requestId:acceptRequestId};
}
async function verifyAcceptRejectedAfterLockExpiry(policy,target){
 const room=await createRoom(host,policy);
 linkPair(host.id,target.id);
 const invite=expectOk(await inviteRoom(host,room.id,target),'create '+policy+' TTL-lock invitation');
 const pausedTick=await pauseQaPolicyWorker();
 let lockDone=Promise.resolve(),lockError=null,pendingRequest=null,resumedTick;
 try{
  // Start both deadlines only after pausing the owned worker, so the test
  // measures admission behavior rather than its independent EXPIRED transition.
  ownedSql(`begin;select set_config('dish_v3.writer','on',true);select set_config('dish_v4.writer','on',true);update public.rooms set expires_at=clock_timestamp()+interval '6 seconds',version=version+1,updated_at=clock_timestamp() where id='${room.id}';update public.room_invitations set expires_at=(select expires_at from public.rooms where id='${room.id}'),version=version+1 where id='${invite.id}';commit;`);
  const fixture=JSON.parse(ownedSql(`select json_build_object('deadlineMs',floor(extract(epoch from expires_at)*1000)::bigint,'room',json_build_object('version',version,'poolVersion',pool_version,'state',state::text),'memberCount',(select count(*) from public.members where room_id='${room.id}' and user_id='${target.id}' and left_at is null)) from public.rooms where id='${room.id}'`));
  const deadline=Number(fixture.deadlineMs),before=fixture.room,acceptedBefore=Number(fixture.memberCount);
  assert.equal(acceptedBefore,0,'TTL fixture recipient must not already be a room member');
  const requestIdValue=randomUUID();
  const appName='gm22-ttl-lock-'+policy+'-'+randomUUID().slice(0,8);
  const lock=sqlAsync(`select set_config('application_name','${appName}',false);begin;update gm06_private.reference_epoch set epoch=epoch+1 where singleton;select pg_sleep(7);commit;`);
  lockDone=lock.catch(error=>{lockError=error;});
  await waitForOwnedSql(`select exists(select 1 from pg_stat_activity where application_name='${appName}' and state='active' and query ilike '%pg_sleep%')`,'reference lock acquired for '+policy);
  assert.ok(Date.now()<deadline-500,policy+' accept request must start before expiry');
  pendingRequest=acceptRoom(target,invite.id,'GM22 TTL boundary',requestIdValue);
  await waitForOwnedSql(`select exists(select 1 from pg_stat_activity blocker join pg_stat_activity waiter on waiter.pid<>blocker.pid where blocker.application_name='${appName}' and blocker.state='active' and waiter.wait_event_type='Lock' and blocker.pid=any(pg_blocking_pids(waiter.pid)))`,'accept request blocked on the owned reference lock for '+policy,1500);
  assert.ok(Date.now()<deadline,policy+' API request must be waiting before both expiry cutoffs');
  while(Date.now()<deadline+150)await pause(50);
  await lockDone;
  if(lockError)throw lockError;
  const response=await pendingRequest;
  expectFail(response,410,'ROOM_EXPIRED',policy+' accept waiting across both expiries is rejected');
  const after=JSON.parse(ownedSql(`select json_build_object('version',version,'poolVersion',pool_version,'state',state::text) from public.rooms where id='${room.id}'`));
  assert.deepEqual(after,before,policy+' expired admission must not mutate room or pool versions');
  const invitationState=JSON.parse(ownedSql(`select json_build_object('state',state,'respondedAt',responded_at) from public.room_invitations where id='${invite.id}'`));
  assert.deepEqual(invitationState,{state:'pending',respondedAt:null},policy+' expired invitation remains unaccepted');
  const memberCount=Number(ownedSql(`select count(*) from public.members where room_id='${room.id}' and user_id='${target.id}' and left_at is null`));
  assert.equal(memberCount,0,policy+' expired admission must not create membership');
  const acknowledgements=Number(ownedSql(`select (select count(*) from gm19_private.acks where user_id='${target.id}' and operation='accept_room_invite' and request_id='${requestIdValue}')+(select count(*) from public.idempotency where user_id='${target.id}' and operation='accept_room_invite' and request_id='${requestIdValue}')`));
  assert.equal(acknowledgements,0,policy+' expired admission must not save a success ACK');
  pass(policy+' waiting-expiry rejection has no admission side effects',{status:410,code:'ROOM_EXPIRED',members:0,invitation:'pending',room:before,acks:0},
   {status:response.status,code:responseCode(response.body),members:memberCount,invitation:invitationState.state,room:after,acks:acknowledgements});
 }finally{
  await lockDone;
  if(pendingRequest)await pendingRequest.catch(()=>{});
  resumedTick=await resumeQaPolicyWorker(pausedTick);
  if(lockError)throw lockError;
 }
 pass(policy+' QA expiry worker resumes after TTL lock test',{paused:true,resumed:true},{paused:true,resumed:resumedTick!==pausedTick});
}
async function prepareBruno(){
 const host=await guest('GM22 Bruno host'),member=await guest('GM22 Bruno member'),outsider=await guest('GM22 Bruno outsider');
 const dir=resolve(root,'supabase/tests/bruno/GM-22/environments');await mkdir(dir,{recursive:true});
 const environment={runId:project,baseUrl:base,anonKey,hostToken:host.token,memberToken:member.token,outsiderToken:outsider.token,
  hostId:host.id,memberId:member.id,outsiderId:outsider.id,memberFriendCode:member.friendCode,outsiderFriendCode:outsider.friendCode,
  requestId:'gm22-'+randomUUID().replaceAll('-','')};
 const text='vars {\n'+Object.entries(environment).map(([key,value])=>'  '+key+': '+value).join('\n')+'\n}\n';
 const path=resolve(dir,'Local.runtime.private.bru');await writeFile(path,text,{mode:0o600});await chmod(path,0o600);
 pass('Bruno fixture prepared from fresh isolated Auth identities; room will be created by Bruno',true,true);
 console.log(JSON.stringify({brunoReady:true,baseUrl:base,requestCount:12,credentialsWrittenToIgnoredPrivateEnvironment:true}));
}

if(brunoSetup){await prepareBruno();process.exit(0);}

assert.equal(ownedSql('select namespace::text from public.gm40_qa_owner'),namespace);
assert.equal(ownedSql("select count(*) from public.schema_versions where schema_version='0.14.0' and contract_id='food-v1/roadmap-v2/GM-22.2'"),'1');
assert.equal(ownedSql("select exists(select 1 from dish_v4_private.runtime where last_tick>clock_timestamp()-interval '15 seconds')"),'t','QA worker heartbeat required');
const all=await Promise.all(Array.from({length:24},(_,index)=>guest('GM22 QA guest '+index)));
const [host,member,outsider,reverseSender,expiredRecipient]=all;

// Friend RPCs are exercised over the real isolated Auth+REST boundary.
{
 const reqId=randomUUID();
 const first=expectOk(await rpc('invite_partner',host.token,{requestId:reqId,friend_code:member.friendCode,partner_id:null}),'friend invite creates pending request');
 const replay=expectOk(await rpc('invite_partner',host.token,{requestId:reqId,friend_code:member.friendCode,partner_id:null}),'friend invite exact ACK replay');
 pass('friend invite replay is byte-equivalent',first,replay);
 expectFail(await rpc('invite_partner',host.token,{requestId:reqId,friend_code:outsider.friendCode,partner_id:null}),409,'REQUEST_ID_REUSED','same request ID rejects different body');
 expectFail(await rpc('accept_partner',host.token,{requestId:randomUUID(),invitation_id:first.id}),403,'NOT_RECIPIENT','friend invitation is private to its recipient');
 expectOk(await rpc('accept_partner',member.token,{requestId:randomUUID(),invitation_id:first.id}),'recipient accepts friend invitation');
 const listed=await rpc('list_friends',host.token,{});assert.equal(listed.status,200);assert.ok(listed.body.some(row=>row.friendUserId===member.id));
 pass('accepted pair appears in own friends projection',true,listed.body.some(row=>row.friendUserId===member.id));
}
{
 const rejected=expectOk(await rpc('invite_partner',host.token,{requestId:randomUUID(),friend_code:outsider.friendCode,partner_id:null}),'create rejectable friend invite');
 expectOk(await rpc('reject_partner',outsider.token,{requestId:randomUUID(),invitation_id:rejected.id}),'recipient rejects friend invitation');
 const resent=expectOk(await rpc('invite_partner',host.token,{requestId:randomUUID(),friend_code:outsider.friendCode,partner_id:null}),'friend invite can be recreated after rejection');
 assert.notEqual(resent.id,rejected.id);
 expectOk(await rpc('accept_partner',outsider.token,{requestId:randomUUID(),invitation_id:resent.id}),'recipient accepts replacement friend invite');
 pass('reject then re-invite creates a single fresh pair',true,ownedSql(`select exists(select 1 from public.friends where low_user_id=least('${host.id}'::uuid,'${outsider.id}'::uuid) and high_user_id=greatest('${host.id}'::uuid,'${outsider.id}'::uuid))`)==='t');
}
{
 const replies=await Promise.all([
  rpc('invite_partner',host.token,{requestId:randomUUID(),friend_code:reverseSender.friendCode,partner_id:null}),
  rpc('invite_partner',reverseSender.token,{requestId:randomUUID(),friend_code:host.friendCode,partner_id:null})
 ]);
 for(const reply of replies)expectOk(reply,'opposite concurrent friend invitations share one pending invite');
 pass('concurrent opposite invites produce one invitation/event/inbox',true,ownedSql(`select (select count(*)=1 from public.friend_invitations where state='pending' and least(sender_user_id,recipient_user_id)=least('${host.id}'::uuid,'${reverseSender.id}'::uuid) and greatest(sender_user_id,recipient_user_id)=greatest('${host.id}'::uuid,'${reverseSender.id}'::uuid)) and (select count(*)=1 from public.events e join public.friend_invitations i on i.id=e.friend_invitation_id where e.kind='FRIEND_INVITED' and i.state='pending' and least(i.sender_user_id,i.recipient_user_id)=least('${host.id}'::uuid,'${reverseSender.id}'::uuid) and greatest(i.sender_user_id,i.recipient_user_id)=greatest('${host.id}'::uuid,'${reverseSender.id}'::uuid))`)==='t');
 const pending=ownedSql(`select id::text||':'||recipient_user_id::text from public.friend_invitations where state='pending' and least(sender_user_id,recipient_user_id)=least('${host.id}'::uuid,'${reverseSender.id}'::uuid) and greatest(sender_user_id,recipient_user_id)=greatest('${host.id}'::uuid,'${reverseSender.id}'::uuid)`);
 const [inviteId,recipientId]=pending.split(':');
 const recipient=[host,reverseSender].find(user=>user.id===recipientId);
 assert.ok(recipient,'one of the opposite-invite callers must be the pending recipient');
 await expectOk(await rpc('accept_partner',recipient.token,{requestId:randomUUID(),invitation_id:inviteId}),'recipient accepts concurrent pending invitation');
}
{
 const expired=expectOk(await rpc('invite_partner',host.token,{requestId:randomUUID(),friend_code:expiredRecipient.friendCode,partner_id:null}),'create expiring friend invite');
 ownedSql(`update public.friend_invitations set created_at=clock_timestamp()-interval '8 days',expires_at=clock_timestamp()-interval '1 day',version=version+1 where id='${expired.id}'`);
 const replacement=expectOk(await rpc('invite_partner',host.token,{requestId:randomUUID(),friend_code:expiredRecipient.friendCode,partner_id:null}),'expired friend invite is replaced');
 assert.notEqual(replacement.id,expired.id);
 pass('expired friend invite receives new invitation ID',true,replacement.id!==expired.id);
 await expectOk(await rpc('accept_partner',expiredRecipient.token,{requestId:randomUUID(),invitation_id:replacement.id}),'accept fresh invite after expiry');
}

// Owned synthetic accepted-pair fixture for policy-boundary and concurrency cases.
grantHostPairs(host,all.slice(5));
const versionRooms={};
for(const version of ['v2','v3','b','bsup']){
 const room=await createRoom(host,version);versionRooms[version]=room;
 const existingMembers=version==='v2'?all.slice(5,11):all.slice(5,23);
 seedMembers(room.id,existingMembers.map(user=>user.id),version==='v2'?'v2':version==='v3'?'v3':'v4');
 const admitted=version==='v2'?all[11]:all[23];
 const overflow=version==='v2'?all[12]:all[4];
 const expected=version==='v2'?8:20;
 const beforePool=ownedSql(`select pool_version from public.rooms where id='${room.id}'`);
 const accepted=await inviteAndAccept(host,admitted,room,version);
 expectOk(accepted.response,version+' invitation admits the final available member');
 assert.equal(activeCount(room.id),expected);
 pass(version+' admission reaches exact policy capacity',expected,activeCount(room.id));
 const afterAcceptVersion=versionOfRoom(room.id);
 const overflowInvite=expectOk(await inviteRoom(host,room.id,overflow),'create invitation beyond '+version+' capacity');
 const full=await acceptRoom(overflow,overflowInvite.id,'Overflow');
 expectFail(full,409,'ROOM_FULL',version+' rejects capacity plus one');
 assert.equal(activeCount(room.id),expected);
 pass(version+' capacity plus one does not change active roster',expected,activeCount(room.id));
 if(version!=='v2'){
  const poolAfter=ownedSql(`select pool_version from public.rooms where id='${room.id}'`);
  pass(version+' admission preserves pinned pool version',beforePool,poolAfter);
 }
 const duplicateReplay=await acceptRoom(admitted,accepted.invitation.id,'GM22 invited',accepted.requestId);
 pass(version+' exact accepted ACK replays unchanged',accepted.response.body,duplicateReplay.body);
 expectFail(await acceptRoom(admitted,accepted.invitation.id,'Changed display name',accepted.requestId),409,'REQUEST_ID_REUSED',version+' ACK rejects a changed body');
 assert.equal(versionOfRoom(room.id),afterAcceptVersion);
}

// Active-member acceptance is a no-op for the roster, preferences, and version.
{
 const room=await createRoom(host,'b');
 const joined=expectOk(await dish(member.token,'join',{requestId:randomUUID(),code:room.code,displayName:'Active member'},'b'),'join B room directly before invitation');
 const beforeVersion=versionOfRoom(room.id),beforeRow=memberRow(room.id,member.id);
 const beforePreference=ownedSql(`select coalesce(revision,0)::text from dish_v4_private.room_preferences where room_id='${room.id}' and user_id='${member.id}'`);
 const invite=expectOk(await inviteRoom(host,room.id,member),'invite already-active B member');
 const accepted=expectOk(await acceptRoom(member,invite.id,'Changed by invitation'),'accept while already active');
 pass('active-member acceptance keeps room version',beforeVersion,versionOfRoom(room.id));
 pass('active-member acceptance preserves nickname and member revision',beforeRow,memberRow(room.id,member.id));
 pass('active-member acceptance does not rewrite room preferences',beforePreference,ownedSql(`select coalesce(revision,0)::text from dish_v4_private.room_preferences where room_id='${room.id}' and user_id='${member.id}'`));
 assert.equal(accepted.memberId,joined.memberId);
}

// Identity, invitation, pair, state and expiry checks are repeated under locks.
{
 const room=await createRoom(host,'b');
 const inv=expectOk(await inviteRoom(host,room.id,member),'create invite for boundary errors');
 expectFail(await acceptRoom(outsider,inv.id),403,'NOT_RECIPIENT','wrong room-invitation recipient is forbidden');
 const stale=await inviteRoom(host,room.id,outsider,versionOfRoom(room.id)-1);
 expectFail(stale,409,'VERSION_CONFLICT','room invite rejects stale version');
 const inbox=await rpc('list_partner_inbox',member.token,{cursor:null});assert.equal(inbox.status,200);
 assert.ok(inbox.body.some(row=>row.type==='room_invite'&&row.metadata.invitationId===inv.id));
 pass('recipient inbox labels room invitations with the correct reference',true,inbox.body.some(row=>row.type==='room_invite'&&row.metadata.invitationId===inv.id));
 const before=activeCount(room.id);
 ownedSql(`begin;select set_config('dish_v4.writer','on',true);update public.members set left_at=clock_timestamp(),version=version+1 where room_id='${room.id}' and user_id='${host.id}';commit;`);
 expectFail(await acceptRoom(member,inv.id),403,'NOT_MEMBER','accept rejects an inviter who has left the room');
 assert.equal(activeCount(room.id),before-1);
}
{
 const room=await createRoom(host,'b');
 const rejected=expectOk(await inviteRoom(host,room.id,member),'create room invite that will be rejected');
 expectOk(await rpc('reject_room_invite',member.token,{requestId:randomUUID(),invitation_id:rejected.id}),'recipient rejects room invite');
 expectFail(await acceptRoom(member,rejected.id),409,'INVITE_CANCELLED','rejected room invite cannot be accepted');
 const expired=expectOk(await inviteRoom(host,room.id,outsider),'create room invite that will expire');
 ownedSql(`update public.room_invitations set created_at=clock_timestamp()-interval '8 days',expires_at=clock_timestamp()-interval '1 day',version=version+1 where id='${expired.id}'`);
 expectFail(await acceptRoom(outsider,expired.id),410,'INVITE_EXPIRED','expired room invite cannot be accepted');
 const expiringRoom=await createRoom(host,'b');
 const roomExpiredInvite=expectOk(await inviteRoom(host,expiringRoom.id,member),'create invitation to expiring room');
 ownedSql(`select set_config('dish_v4.writer','on',true);update public.rooms set expires_at=clock_timestamp()-interval '1 second',version=version+1 where id='${expiringRoom.id}'`);
 expectFail(await acceptRoom(member,roomExpiredInvite.id),410,'ROOM_EXPIRED','expired room cannot admit member');
 const cancelledRoom=await createRoom(host,'b');
 const cancelledInvite=expectOk(await inviteRoom(host,cancelledRoom.id,member),'create invitation to cancelled room');
 const snap=await roomSnapshot(host,cancelledRoom.id,'b');
 expectOk(await dish(host.token,'cancel',{requestId:randomUUID(),roomId:cancelledRoom.id,expectedVersion:snap.version},'b'),'host cancels invite room');
 expectFail(await acceptRoom(member,cancelledInvite.id),409,'ROOM_LOCKED','terminal room cannot admit a member');
}

// A request that starts before expiry but waits for the shared ACK/reference
// lock must re-check both TTLs after the lock is released. Cover every policy
// branch supported by accept_room_invite, including the pinned decision-v2.
for(const [index,policy] of ['v2','v3','b','bsup'].entries()){
 await verifyAcceptRejectedAfterLockExpiry(policy,all[19+index]);
}

// Race two requests through the actual REST boundary and assert final database state.
{
 const room=await createRoom(host,'b');const invite=expectOk(await inviteRoom(host,room.id,reverseSender),'create accept/accept race invite');
 const replies=await Promise.all([acceptRoom(reverseSender,invite.id,'Race A'),acceptRoom(reverseSender,invite.id,'Race B')]);
 const success=replies.filter(row=>row.status===200),failure=replies.filter(row=>row.status===409);
 assert.equal(success.length,1);assert.equal(failure.length,1);assert.equal(responseCode(failure[0].body),'INVITE_CANCELLED');
 assert.equal(activeCount(room.id),2);
 pass('accept/accept race creates one member and one accepted invitation',{success:1,failure:1,members:2,acceptedInvitations:1},{success:success.length,failure:failure.length,members:activeCount(room.id),acceptedInvitations:Number(ownedSql(`select count(*) from public.room_invitations where id='${invite.id}' and state='accepted'`))});
}
{
 const room=await createRoom(host,'b');const invite=expectOk(await inviteRoom(host,room.id,expiredRecipient),'create accept/reject race invite');
 const replies=await Promise.all([acceptRoom(expiredRecipient,invite.id),rpc('reject_room_invite',expiredRecipient.token,{requestId:randomUUID(),invitation_id:invite.id})]);
 const accepted=replies.filter(row=>row.status===200&&row.body?.data?.memberId),rejected=replies.filter(row=>row.status===200&&row.body?.data===null);
 const conflicts=replies.filter(row=>row.status===409);
 assert.equal(accepted.length+rejected.length,1);assert.equal(conflicts.length,1);
 const finalState=ownedSql(`select state from public.room_invitations where id='${invite.id}'`);
 assert.ok(['accepted','rejected'].includes(finalState));
 pass('accept/reject race commits exactly one recipient decision',true,accepted.length+rejected.length===1&&conflicts.length===1&&((finalState==='accepted')===(accepted.length===1)));
}
{
 const room=await createRoom(host,'b');seedMembers(room.id,all.slice(5,23).map(user=>user.id),'v4');
 const target=all[23],direct=all[4];const invite=expectOk(await inviteRoom(host,room.id,target),'create final-seat race invitation');
 const request={contractVersion:contractB,requestId:randomUUID(),code:room.code,displayName:'Direct join race'};
 const replies=await Promise.all([acceptRoom(target,invite.id),dish(direct.token,'join',request,'b')]);
 const successes=replies.filter(row=>row.status===200&&row.body?.ok===true),fulls=replies.filter(row=>row.status===409&&responseCode(row.body)==='ROOM_FULL');
 assert.equal(successes.length,1);assert.equal(fulls.length,1);assert.equal(activeCount(room.id),20);
 pass('accept/direct-join last-seat race respects capacity 20',{oneSuccess:true,oneRoomFull:true,memberCount:20},{oneSuccess:successes.length===1,oneRoomFull:fulls.length===1,memberCount:activeCount(room.id)});
}
{
 const room=await createRoom(host,'b');
 expectOk(await dish(member.token,'join',{requestId:randomUUID(),code:room.code,displayName:'Existing B member'},'b'),'seed active member through B join for start race');
 const invite=expectOk(await inviteRoom(host,room.id,outsider),'create accept/start race invite');
 const snapshot=await roomSnapshot(host,room.id,'b');
 const replies=await Promise.all([acceptRoom(outsider,invite.id),dish(host.token,'start',{requestId:randomUUID(),roomId:room.id,expectedVersion:snapshot.version},'b')]);
 const [acceptResponse,startResponse]=replies;
 const acceptFirst=acceptResponse.status===200&&startResponse.status===409&&responseCode(startResponse.body)==='VERSION_CONFLICT'&&statusOfRoom(room.id)==='LOBBY';
 const startFirst=startResponse.status===200&&acceptResponse.status===409&&responseCode(acceptResponse.body)==='ROOM_LOCKED'&&statusOfRoom(room.id)==='ROUND_1';
 assert.ok(acceptFirst||startFirst,'race must serialize to accept then stale-start or start then locked-accept');
 const admitted=Number(ownedSql(`select count(*) from public.members where room_id='${room.id}' and user_id='${outsider.id}' and left_at is null`));
 assert.equal(admitted,acceptFirst?1:0);
 const outcome=acceptFirst?'acceptThenStaleStart':'startThenLockedAccept';
 pass('accept/start race has one exact serialized outcome',outcome,outcome);
}
{
 const room=await createRoom(host,'b');
 const invite=expectOk(await inviteRoom(host,room.id,outsider),'create accept/cancel race invite');
 const snapshot=await roomSnapshot(host,room.id,'b');
 const [acceptResponse,cancelResponse]=await Promise.all([
  acceptRoom(outsider,invite.id),
  dish(host.token,'cancel',{requestId:randomUUID(),roomId:room.id,expectedVersion:snapshot.version},'b'),
 ]);
 const acceptFirst=acceptResponse.status===200&&cancelResponse.status===409&&responseCode(cancelResponse.body)==='VERSION_CONFLICT'
  &&statusOfRoom(room.id)==='LOBBY'&&activeCount(room.id)===2;
 const cancelFirst=cancelResponse.status===200&&acceptResponse.status===409&&responseCode(acceptResponse.body)==='ROOM_LOCKED'
  &&statusOfRoom(room.id)==='CANCELLED'&&activeCount(room.id)===1;
 assert.ok(acceptFirst||cancelFirst,'accept/cancel race must serialize to accept then stale cancel or cancel then locked accept');
 const outcome=acceptFirst?'acceptThenStaleCancel':'cancelThenLockedAccept';
 pass('accept/cancel race has one exact serialized outcome',outcome,outcome);
}
{
 const room=await createRoom(host,'b');const invite=expectOk(await inviteRoom(host,room.id,member),'create accept/unfriend race invite');
 const replies=await Promise.all([
  acceptRoom(member,invite.id),
  rpc('unfriend',host.token,{requestId:randomUUID(),partner_id:member.id}),
  inviteRoom(host,room.id,member),
 ]);
 const [acceptResponse,unfriendResponse,concurrentInvite]=replies;
 expectOk(unfriendResponse,'unfriend concurrent with invite and acceptance');
 if(concurrentInvite.status===200)expectOk(concurrentInvite,'room invite serialized before unfriend');
 else expectFail(concurrentInvite,403,'NOT_PARTNER','room invite serialized after unfriend');
 const state=ownedSql(`select state from public.room_invitations where id='${invite.id}'`);
 const pairCount=Number(ownedSql(`select count(*) from public.friends where low_user_id=least('${host.id}'::uuid,'${member.id}'::uuid) and high_user_id=greatest('${host.id}'::uuid,'${member.id}'::uuid)`));
 const finalMembership=state==='accepted'?2:1;
 const pendingCount=Number(ownedSql(`select count(*) from public.room_invitations where room_id='${room.id}' and recipient_user_id='${member.id}' and state='pending'`));
 assert.ok((state==='accepted'&&acceptResponse.status===200)||(state==='cancelled'&&acceptResponse.status===409&&responseCode(acceptResponse.body)==='INVITE_CANCELLED'));
 assert.equal(pairCount,0);assert.equal(activeCount(room.id),finalMembership);assert.equal(pendingCount,0);
 pass('unfriend/invite/accept race leaves no pending pair invite',{pairCount:0,memberCount:finalMembership,pendingInvites:0},{pairCount,memberCount:activeCount(room.id),pendingInvites:pendingCount});
 // Recreate pair for the remaining test scenarios using an owned synthetic row.
 linkPair(host.id,member.id);
}

// Preview and direct-write boundaries remain narrow; the private helper is not exposed by REST.
{
 const room=await createRoom(host,'b');
 const preview=expectOk(await dish(outsider.token,'previewJoin',{requestId:randomUUID(),code:room.code},'b'),'preview B join');
 const privateFields=['members','roster','pool','preferences','ownPreferences','votes','submissions'];
 pass('preview contains only admission summary',false,privateFields.some(field=>Object.hasOwn(preview,field)));
 const read=await rpc('get_room_snapshot',outsider.token,{room_id:room.id});
 expectFail(read,403,'NOT_MEMBER','outsider cannot read room snapshot');
 const direct=await fetch(base+'/rest/v1/members',{method:'POST',headers:{apikey:anonKey,authorization:'Bearer '+outsider.token,'content-type':'application/json','prefer':'return=representation'},body:JSON.stringify({room_id:room.id,user_id:outsider.id,nickname:'forged'})});
 assert.ok([401,403].includes(direct.status),'direct membership write must be denied, got '+direct.status);
 pass('client direct membership write is denied',true,[401,403].includes(direct.status));
}

// Unfriend revokes the pair and pending invitations but does not remove room membership.
{
 const room=await createRoom(host,'b');
 const invite=expectOk(await inviteRoom(host,room.id,member),'create invitation before unfriend');
 expectOk(await rpc('unfriend',host.token,{requestId:randomUUID(),partner_id:member.id}),'unfriend accepted pair');
 expectFail(await acceptRoom(member,invite.id),409,'INVITE_CANCELLED','unfriend cancels pending room invite before pair error');
 assert.equal(activeCount(room.id),1);
 assert.equal(ownedSql(`select count(*) from public.room_invitations where id='${invite.id}' and state='cancelled'`),'1');
 pass('unfriend cancels invite without changing current room roster',{members:1,inviteState:'cancelled'},{members:activeCount(room.id),inviteState:ownedSql(`select state from public.room_invitations where id='${invite.id}'`)});
 linkPair(host.id,member.id);
}

// Exact acceptance ACK survives later pair removal and room expiry; changed payload is rejected.
{
 const room=await createRoom(host,'b');const sent=expectOk(await inviteRoom(host,room.id,reverseSender),'create ACK replay invite');
 const requestIdValue=randomUUID();const accepted=await acceptRoom(reverseSender,sent.id,'Ack recipient',requestIdValue);
 const body=expectOk(accepted,'accept invite before cleanup/expiry');
 const pairBefore=ownedSql(`select count(*) from public.friends where id=(select friend_id from public.room_invitations where id='${sent.id}')`);
 const [cleanupText,replayedDuringCleanup]=await Promise.all([
  sqlAsync('select gm17_private.cleanup();'),
  acceptRoom(reverseSender,sent.id,'Ack recipient',requestIdValue),
 ]);
 let cleanupResult=JSON.parse(cleanupText);
 if(cleanupResult.skipped)cleanupResult=JSON.parse(sqlRaw('select gm17_private.cleanup();'));
 assert.equal(cleanupResult.skipped,false,'retention cleanup should complete after any concurrent cleanup lock');
 const ackRaceResponse=expectOk(replayedDuringCleanup,'ACK replay races retention cleanup');
 assert.deepEqual(ackRaceResponse,body,'retention cleanup must preserve the live ACK response');
 const liveAckCount=ownedSql(`select count(*) from gm19_private.acks where user_id='${reverseSender.id}' and operation='accept_room_invite' and request_id='${requestIdValue}' and expires_at>statement_timestamp()`);
 assert.equal(liveAckCount,'1','cleanup must preserve a live ACK row');
 pass('live ACK replays while retention cleanup runs',{sameAck:true,cleanupCompleted:true,liveAckRows:1,activeMembers:2},
  {sameAck:true,cleanupCompleted:!cleanupResult.skipped,liveAckRows:Number(liveAckCount),activeMembers:activeCount(room.id)});
 ownedSql(`begin;select set_config('dish_v4.writer','on',true);update public.rooms set expires_at=clock_timestamp()-interval '1 second',version=version+1 where id='${room.id}';commit;`);
 await rpc('unfriend',host.token,{requestId:randomUUID(),partner_id:reverseSender.id});
 const replay=await acceptRoom(reverseSender,sent.id,'Ack recipient',requestIdValue);
 pass('accept ACK replays after room expiry and unfriend',accepted.body,replay.body);
 expectFail(await acceptRoom(reverseSender,sent.id,'Changed after expiry',requestIdValue),409,'REQUEST_ID_REUSED','ACK payload remains immutable after room expiry');
 pass('accepted membership survives unfriend and room expiry',2,activeCount(room.id));
 assert.equal(pairBefore,'1');
 linkPair(host.id,reverseSender.id);
}

// Create/check authenticated quota boundary only inside this named disposable project.
{
 ownedSql(`delete from gm19_private.rate_windows where user_id='${host.id}' and operation='invite_partner'`);
 const calls=[];
 for(let index=0;index<11;index++)calls.push(await rpc('invite_partner',host.token,{requestId:randomUUID(),friend_code:member.friendCode,partner_id:null}));
 const limited=calls.at(-1);
 expectFail(limited,429,'RATE_LIMITED','friend invitation quota returns exact HTTP 429');
 assert.equal(limited.body.retryAfterSeconds,60);
 pass('friend invitation quota reports retry window',60,limited.body.retryAfterSeconds);
}

// Real GoTrue token boundary, exact inbox projections, TAP and source reports.
{
 expectFail(await rpc('list_friends',null,{}),401,'AUTH_REQUIRED','missing JWT is rejected');
 const forgedJwt=await request('/rest/v1/rpc/list_friends','forged.jwt.signature',{});
 assert.equal(forgedJwt.status,401,'forged JWT is rejected at the REST authentication boundary');
 assert.equal(forgedJwt.body.code,'PGRST301','forged JWT returns the gateway invalid-token code');
 assert.equal(forgedJwt.body.messageKey,undefined,'gateway token errors remain distinct from application errors');
 results.push({case:'forged JWT is rejected at the REST authentication boundary',result:'Pass',expected:{status:401,code:'PGRST301'},actual:{status:forgedJwt.status,code:forgedJwt.body.code}});
 console.log('PASS forged JWT is rejected at the REST authentication boundary');
 const inbox=await rpc('list_partner_inbox',member.token,{cursor:null});assert.equal(inbox.status,200);assert.ok(Array.isArray(inbox.body));
 pass('own inbox returns only its list DTO',true,Array.isArray(inbox.body));
 const denied=await rpc('list_partner_inbox',member.token,{cursor:'00000000-0000-0000-0000-000000000000'});
 expectFail(denied,403,'NOT_MEMBER','foreign or unknown inbox cursor is rejected');
}

const report={fixtureOnly:true,result:'Pass',task:'GM-22',supplement:'GM-22.2',contractVersion:'food-v1/roadmap-v2/GM-22.1',
 wireVersions:['decision-v2','dish-decision-v3','dish-session-v4/roadmap-v2/GM-07.B','dish-session-v4/roadmap-v2/GM-07.B-supplement'],
 schemaVersion:'0.14.0',qaProject:project,endpoint:'127.0.0.1:54361',applicationDatabaseChanged:false,
 remotePush:'Not run',android:'Not run',caseCount:results.length,cases:results,checkedAt:new Date().toISOString()};
await mkdir(resolve(root,'.work/gm22-admission'),{recursive:true});
await writeFile(resolve(root,'.work/gm22-admission/http-results.json'),JSON.stringify(report,null,2)+'\n','utf8');
console.log(JSON.stringify({result:'Pass',caseCount:results.length,fixtureOnly:true,qaProject:project,credentialsInEvidence:false}));
