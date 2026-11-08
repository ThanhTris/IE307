// Real producer HTTP upgrade fixture for the 0037 -> 0038 migration.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';

const root=process.cwd(),mode=process.argv[2];
assert.ok(['--create','--verify'].includes(mode),'use --create or --verify');
const project=process.env.GM_V4_QA_PROJECT_ID,workdir=process.env.GM_V4_QA_WORKDIR,container=process.env.GM_V4_QA_CONTAINER;
assert.match(project||'',/^ie307-dish-v4-qa-\d{8}(?:-\d+-\d+)?$/,'QA project must be uniquely owned');
assert.equal(container,'supabase_db_'+project,'QA container mismatch');
const inspected=JSON.parse(execFileSync('docker',['container','inspect',container],{encoding:'utf8'}))[0];
assert.equal(inspected.Config.Labels['com.supabase.cli.project'],project);
assert.equal(String(inspected.Config.Labels['com.supabase.cli.workdir']).replaceAll('\\','/').toLowerCase(),String(workdir).replaceAll('\\','/').toLowerCase());
assert.equal(inspected.State.Running,true);
const statusText=execFileSync(process.execPath,[resolve(root,'node_modules/supabase/dist/supabase.js'),'status','--output','json','--workdir',workdir],{encoding:'utf8',maxBuffer:1024*1024});
const status=JSON.parse(statusText),base=status.API_URL||status.api?.url,key=status.ANON_KEY||status.PUBLISHABLE_KEY;
assert.equal(new URL(base).hostname,'127.0.0.1');assert.equal(new URL(base).port,'54361');
const output=resolve(root,'.work/gm23-upgrade'),fixturePath=resolve(output,'upgrade-fixture.json');
function sql(q){return execFileSync('docker',['exec','-i',container,'psql','-X','-q','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At','-c',q],{encoding:'utf8'}).trim();}
function safeId(value){assert.match(value,/^[0-9a-f-]{36}$/i);return value;}
async function guest(name){const response=await fetch(base+'/auth/v1/signup',{method:'POST',headers:{apikey:key,'content-type':'application/json'},body:JSON.stringify({data:{display_name:name,gm23_upgrade_qa:project}})});const body=await response.json();assert.equal(response.status,200,'synthetic guest signup failed');assert.ok(body.access_token&&body.user?.id);return {id:body.user.id,token:body.access_token};}
async function rpc(user,name,args){const response=await fetch(base+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,authorization:'Bearer '+user.token,'content-type':'application/json'},body:JSON.stringify(args)});let body;try{body=await response.json();}catch{body={};}return {status:response.status,body};}
const contractVersion='dish-session-v4/roadmap-v2/GM-07.B-supplement',policyVersion='dish-decision-v4/ADR-019-30PCT-MIN1';
const preferences={cuisineIds:[],categoryIds:[],temperature:null,flavor:null,budget:null,avoidRecent:false};
function ok(reply,label){assert.equal(reply.status,200,label+' HTTP '+reply.status);assert.equal(reply.body.ok,true,label+' rejected');return reply.body.data;}
async function command(user,command,payload){return rpc(user,'dish_session',{command,payload:{contractVersion,...payload}});}
async function snapshot(user,roomId){return ok(await command(user,'snapshot',{roomId}),'snapshot');}
async function makeTerminal(status){
 const host=await guest('upgrade-host-'+status),member=await guest('upgrade-member-'+status);
 const created=ok(await command(host,'create',{requestId:randomUUID(),displayName:'Upgrade host',settings:{dishCount:10,mealSlot:'lunch',desiredAt:null},preferences}),'create');
 ok(await command(member,'join',{requestId:randomUUID(),code:created.code,displayName:'Upgrade member'}),'join');
 let view=await snapshot(host,created.roomId);
 ok(await command(host,'start',{requestId:randomUUID(),roomId:created.roomId,expectedVersion:view.version}),'start');
 for(const user of [host,member]){
  view=await snapshot(user,created.roomId);
  const choice=status==='DECIDED'?'WANT':'NO';
  const votes=view.pool.map(d=>({roundDishId:d.roundDishId,choice}));
  ok(await command(user,'submit',{requestId:randomUUID(),roomId:created.roomId,expectedVersion:view.version,round:view.round,poolVersion:view.poolVersion,votes}),'submit '+status);
 }
 for(const user of [host,member]){
  view=await snapshot(user,created.roomId);
  ok(await command(user,'waiting',{requestId:randomUUID(),roomId:created.roomId,expectedVersion:view.version,round:view.round,poolVersion:view.poolVersion}),'waiting '+status);
 }
 const terminal=await snapshot(host,created.roomId);
 assert.equal(terminal.result?.status,status,'producer should write expected terminal state');
 return {roomId:created.roomId,resultId:safeId(terminal.result.resultId),status,memberIds:[host.id,member.id]};
}

if(mode==='--create'){
 assert.equal(sql("select count(*) from public.schema_versions where schema_version='0.14.0' and contract_id='food-v1/roadmap-v2/GM-22.2'"),'1','pre-upgrade database must be at GM-22.2');
 assert.equal(sql("select to_regclass('gm23_private.canonical_notifications') is null"),'t','GM-23 canonical table must not yet exist');
 assert.equal(sql("select exists(select 1 from dish_v4_private.runtime where last_tick>clock_timestamp()-interval '15 seconds')"),'t','producer worker heartbeat');
 sql('update gm20_canonical_private.configuration set allow_new_sessions=true where singleton');
 const decided=await makeTerminal('DECIDED'),empty=await makeTerminal('NO_CONSENSUS');
 for(const row of [decided,empty]){
  const id=safeId(row.resultId);
  assert.equal(sql("select status from gm20_canonical_private.terminal_outbox where result_id='"+id+"'"),row.status);
  assert.equal(sql("select count(*) from public.events where result_id='"+id+"'"),'0','no notification before migration');
 }
 assert.equal(sql("select expires_at>clock_timestamp() from gm20_canonical_private.terminal_outbox where result_id='"+empty.resultId+"'"),'t','fresh outbox exists before expiry fixture');
 const fixture={liveResultId:decided.resultId,expiredResultId:empty.resultId,liveStatus:decided.status,expiredStatus:empty.status,liveAudience:decided.memberIds.length,expiredAudience:empty.memberIds.length,preUpgrade:{schemaVersion:'0.14.0',notifications:0}};
 mkdirSync(output,{recursive:true});writeFileSync(fixturePath,JSON.stringify(fixture,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({stage:'pre-upgrade',result:'Pass',expected:{live:'DECIDED',expired:'NO_CONSENSUS',existingNotifications:0},actual:{live:decided.status,expired:empty.status,existingNotifications:0},expiredFixture:'owned synthetic QA row; immutable trigger restored'}));
}else{
 const fixture=JSON.parse(readFileSync(fixturePath,'utf8')),live=safeId(fixture.liveResultId),expired=safeId(fixture.expiredResultId);
 const before={liveMapping:Number(sql("select count(*) from gm23_private.canonical_notifications where result_id='"+live+"'")),liveEvents:Number(sql("select count(*) from public.events where result_id='"+live+"' and kind='ROOM_RESULT_READY'")),liveInbox:Number(sql("select count(*) from public.inbox i join public.events e on e.id=i.event_id where e.result_id='"+live+"' and e.kind='ROOM_RESULT_READY'")),expiredMapping:Number(sql("select count(*) from gm23_private.canonical_notifications where result_id='"+expired+"'")),expiredEvents:Number(sql("select count(*) from public.events where result_id='"+expired+"' and kind='ROOM_RESULT_READY'"))};
 assert.deepEqual(before,{liveMapping:1,liveEvents:1,liveInbox:fixture.liveAudience,expiredMapping:0,expiredEvents:0},'migration must backfill only live outbox row and exact audience');
 assert.equal(sql("select status||'|'||contract_version||'|'||event_version from gm23_private.canonical_notifications where result_id='"+live+"'"),'DECIDED|dish-session-v4/roadmap-v2/GM-07.B-supplement|1');
 sql("select gm23_private.materialize_terminal('"+live+"');select gm23_private.materialize_terminal('"+live+"');");
 const after={liveMapping:Number(sql("select count(*) from gm23_private.canonical_notifications where result_id='"+live+"'")),liveEvents:Number(sql("select count(*) from public.events where result_id='"+live+"' and kind='ROOM_RESULT_READY'")),liveInbox:Number(sql("select count(*) from public.inbox i join public.events e on e.id=i.event_id where e.result_id='"+live+"' and e.kind='ROOM_RESULT_READY'")),expiredMapping:Number(sql("select count(*) from gm23_private.canonical_notifications where result_id='"+expired+"'")),expiredEvents:Number(sql("select count(*) from public.events where result_id='"+expired+"' and kind='ROOM_RESULT_READY'"))};
 assert.deepEqual(after,before,'repeated migration/backfill calls cannot duplicate event or inbox');
 fixture.upgradeActual={live:before,afterRepeatedMigrationAndMaterializer:after};
 writeFileSync(fixturePath,JSON.stringify(fixture,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({stage:'post-upgrade',result:'Pass',expected:before,actual:after,credentialsInEvidence:false}));
}
