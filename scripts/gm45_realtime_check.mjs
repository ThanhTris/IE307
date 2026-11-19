// GM-45 synthetic Auth/REST/Realtime QA on a sealed GM-03 owned run.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

const root = process.cwd();
const reportDirectory = resolve(root, '.work/gm45-realtime');
const manifestPath = process.env.GM03_QA_MANIFEST;
const qa = process.env.GM03_QA_WORKDIR;
assert.ok(manifestPath && qa, 'Provide the sealed GM-03 manifest and owned workdir');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
assert.equal(manifest.format, 'gm03-qa-manifest-v1');
const project = manifest.projectId;
const container = manifest.containerName;
assert.match(project, /^gm03qa-[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/);
assert.equal(container, 'supabase_db_' + project);
assert.equal(resolve(qa), resolve(manifest.workdir));
const statusRun = spawnSync(process.execPath, [
 resolve(root, 'node_modules/supabase/dist/supabase.js'), 'status',
 '--output', 'json', '--workdir', qa,
], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
assert.equal(statusRun.status, 0, 'QA Supabase status failed');
const status = JSON.parse(statusRun.stdout);
const base = status.API_URL;
const key = status.PUBLISHABLE_KEY || status.ANON_KEY;
assert.equal(new URL(base).hostname, '127.0.0.1');
assert.equal(base, manifest.endpoint.baseUrl);
assert.ok(key);
const contractVersion = 'dish-session-v4/roadmap-v2/GM-07.B-supplement';
const pref = { cuisineIds: [], categoryIds: [], temperature: null, flavor: null, budget: null, avoidRecent: false };
const results = [];

function sqlRaw(query) {
 return execFileSync('docker', [
  'exec', '-i', container, 'psql', '-XqAt', '-U', 'postgres',
  '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', query,
 ], { encoding: 'utf8' }).trim();
}
function sql(query) {
 const inspected = JSON.parse(execFileSync('docker', ['inspect', container], { encoding: 'utf8' }))[0];
 assert.equal(inspected.Name, '/' + container);
 assert.equal(inspected.Config.Labels['com.supabase.cli.project'], project);
 assert.equal(resolve(inspected.Config.Labels['com.supabase.cli.workdir']).toLowerCase(), resolve(qa).toLowerCase());
 assert.equal(inspected.State.Running, true);
 assert.equal(sqlRaw("select owner_uuid::text from gm03_qa_private.owner_manifest where run_id='" + manifest.runId.replaceAll("'", "''") + "'"), manifest.ownerUuid);
 return sqlRaw(query);
}
async function guest(name) {
 const response = await fetch(base + '/auth/v1/signup', {
  method: 'POST', headers: { apikey: key, 'content-type': 'application/json' },
  body: JSON.stringify({ data: { display_name: name, fixtureOnly: true } }),
 });
 const body = await response.json();
 assert.equal(response.status, 200, 'QA guest signup');
 assert.ok(body.access_token);
 return { id: body.user.id, token: body.access_token };
}
async function legacyRpc(user, rpcName, params) {
 const response = await fetch(base + '/rest/v1/rpc/' + rpcName, {
  method: 'POST',
  headers: { apikey: key, authorization: 'Bearer ' + user.token, 'content-type': 'application/json' },
  body: JSON.stringify(params),
 });
 return { status: response.status, body: await response.json() };
}
function api(user, command, payload = {}) {
 return legacyRpc(user, 'dish_session', { command, payload: { contractVersion, ...payload } });
}
function pass(name, expected, actual) {
 assert.deepEqual(actual, expected, name);
 results.push({ case: name, result: 'Pass', expected, actual });
 console.log('PASS', name);
}
function expectOk(response, name) {
 assert.equal(response.status, 200, name + ' HTTP ' + response.status);
 assert.equal(response.body.ok, true, name + ' rejected ' + response.body.error?.messageKey);
 return response.body.data;
}
const requestId = prefix => prefix + '-' + randomUUID();
async function create(user) {
 return expectOk(await api(user, 'create', {
  requestId: requestId('create'), displayName: 'QA host',
  settings: { dishCount: 10, mealSlot: 'lunch', desiredAt: null }, preferences: pref,
 }), 'create');
}
async function snapshot(user, roomId) {
 return expectOk(await api(user, 'snapshot', { roomId }), 'snapshot');
}
async function join(user, code, displayName) {
 const receipt = expectOk(await api(user, 'join', { requestId: requestId('join'), code, displayName }), 'join');
 const current = await snapshot(user, receipt.roomId);
 expectOk(await api(user, 'updatePreferences', {
  requestId: requestId('preferences'), roomId: receipt.roomId,
  expectedVersion: current.version, preferences: current.ownPreferences,
 }), 'member saves preferences');
 return receipt;
}
const votesFor = (pool, choice) => pool.map(dish => ({ roundDishId: dish.roundDishId, choice: choice(dish) }));
const versionArgs = (roomId, snap) => ({ roomId, expectedVersion: snap.version, round: snap.round, poolVersion: snap.poolVersion });
const submit = (user, roomId, snap, votes) => api(user, 'submit', { ...versionArgs(roomId, snap), requestId: requestId('submit'), votes });
const heartbeat = sql("select exists(select 1 from dish_v4_private.runtime where last_tick>clock_timestamp()-interval '15 seconds')");
pass('v4 worker heartbeat verified', 't', heartbeat);

sql("update gm20_canonical_private.configuration set allow_new_sessions=true where singleton");
const host = await guest('GM45 host');
const member = await guest('GM45 member');
const outsider = await guest('GM45 outsider');
const made = await create(host);
await join(member, made.code, 'GM45 member');
const roomId = made.roomId;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function signalRows(user) {
 const response = await fetch(base + '/rest/v1/room_version_signals?select=room_id,version&room_id=eq.' + roomId,
  {headers:{apikey:key,authorization:'Bearer ' + user.token}});
 return {status:response.status,body:await response.json()};
}
async function listen(user, watchedRoomId = roomId) {
 const socket = new WebSocket(base.replace(/^http/,'ws')+'/realtime/v1/websocket?apikey='+encodeURIComponent(key)+'&vsn=1.0.0');
 const rows = [];
 const deletions = [];
 const topic = 'realtime:gm45-' + user.id + '-' + watchedRoomId;
 let ref = 1;
 let ready = false;
 const send = message => socket.send(JSON.stringify({...message,ref:String(ref++)}));
 socket.addEventListener('open',()=>send({topic,event:'phx_join',join_ref:'1',payload:{
  config:{broadcast:{self:false},presence:{key:''},private:false,
   postgres_changes:[{event:'*',schema:'public',table:'room_version_signals',
    ...(watchedRoomId ? {filter:'room_id=eq.'+watchedRoomId} : {})}]},
  access_token:user.token,
 }}));
 socket.addEventListener('message',event=>{
  const message=JSON.parse(String(event.data));
  if(message.event==='system' && message.payload?.extension==='postgres_changes') {
   assert.equal(message.payload.status,'ok','Realtime subscription must be confirmed');
   ready=true;
  }
  if(message.event==='postgres_changes') {
   const data=message.payload.data;
   assert.equal(data.table,'room_version_signals');
   if (data.type === 'DELETE') { deletions.push(data.old_record); return; }
   assert.deepEqual(Object.keys(data.record).sort(),['room_id','version'],'Realtime contains no ballot or room payload');
   rows.push(data.record);
  }
 });
 const heartbeat=setInterval(()=>{if(socket.readyState===WebSocket.OPEN)send({topic:'phoenix',event:'heartbeat',payload:{}});},25000);
 const close=()=>{clearInterval(heartbeat);socket.close();};
 subscriptions.push(close);
 for(let n=0;n<150&&!ready;n++)await pause(100);
 assert.equal(ready,true,'Realtime channel must register');
 return {rows,deletions,close};
}
const subscriptions=[];
async function delivered(channel,version,name,watchedRoomId=roomId) {
 const received = () => channel.rows.some(row=>row.room_id===watchedRoomId&&row.version===version);
 for(let n=0;n<150&&!received();n++)await pause(100);
 pass(name,true,received());
}
try {
 const a=await listen(host), b=await listen(member), x=await listen(outsider);
 pass('member REST signal projection', [{room_id:roomId,version:(await snapshot(host,roomId)).version}], (await signalRows(member)).body);
 pass('outsider REST rows filtered',[],(await signalRows(outsider)).body);
 const before=await snapshot(host,roomId);
 const request={requestId:requestId('settings'),roomId,expectedVersion:before.version,settings:{...before.settings,desiredAt:new Date(Date.now()+600000).toISOString()}};
 const changed=expectOk(await api(host,'updateSettings',request),'settings change');
 const after=await snapshot(host,roomId);
 await delivered(a,after.version,'host gets same transaction version');
 await delivered(b,after.version,'second client gets version and can refetch');
 pass('ACK replay unchanged',changed,expectOk(await api(host,'updateSettings',request),'settings replay'));
 pass('no new signal version on ACK replay',after.version,(await signalRows(member)).body[0].version);
 const count=a.rows.length;
 sql("begin;select set_config('dish_v4.writer','on',true);update public.rooms set version=version+1 where id='"+roomId+"';rollback;");
 await pause(500);
 pass('rollback neither persists nor emits signal',[after.version,count],[(await signalRows(host)).body[0].version,a.rows.length]);
 b.close();
 const again=await snapshot(host,roomId);
 expectOk(await api(host,'updateSettings',{...request,requestId:requestId('offline-settings'),expectedVersion:again.version,settings:{...again.settings,desiredAt:new Date(Date.now()+900000).toISOString()}}),'change during member disconnect');
 const reconnected=await listen(member);
 pass('reconnect catch-up reads latest snapshot',(await snapshot(host,roomId)).version,(await signalRows(member)).body[0].version);
 let snap=await snapshot(host,roomId);
 expectOk(await api(host,'start',{requestId:requestId('start'),roomId,expectedVersion:snap.version}),'start');
 snap=await snapshot(host,roomId);
 await delivered(reconnected,snap.version,'reconnected client receives next transition');
 expectOk(await submit(host,roomId,snap,votesFor(snap.pool,()=> 'OK')),'R1 host ACK');
 snap=await snapshot(host,roomId);
 expectOk(await api(host,'waiting',{...versionArgs(roomId,snap),requestId:requestId('waiting')}),'host enters waiting');
 sql("update dish_v4_private.sessions set waiting_started_at=clock_timestamp()-interval '61 seconds' where room_id='"+roomId+"'");
 let worker;
 for(let n=0;n<40;n++) {worker=await snapshot(member,roomId);if(worker.round===2)break;await pause(250);}
 pass('worker advances R1 to R2',2,worker.round);
 await delivered(reconnected,worker.version,'worker transition pushes committed version');
 pass('outsider gets no events',[],x.rows);
 // A fresh lobby exercises removal, since roster is locked after start.
 const kicked=await create(host);
 await join(member,kicked.code,'GM45 member');
 const kickSnap=await snapshot(host,kicked.roomId);
 const kickedChannel=await listen(member,kicked.roomId);
 const response=await legacyRpc(host,'remove_room_member',{requestId:requestId('kick'),room_ref:kicked.roomId,member_ref:member.id,expected_version:kickSnap.version});
 expectOk(response,'host kicks member');
 const kickedRows=await fetch(base+'/rest/v1/room_version_signals?select=room_id,version&room_id=eq.'+kicked.roomId,{headers:{apikey:key,authorization:'Bearer '+member.token}});
 pass('kicked member loses REST signal visibility',[],await kickedRows.json());
 await pause(1000);
 pass('kicked subscription cannot receive final removal signal',[],kickedChannel.rows);
 // Unfiltered subscribers test the server publication itself, not the stock app's event/filter selection.
 const control=await create(outsider);
 await join(member,control.code,'GM45 member');
 const outsiderAll=await listen(outsider,null), kickedAll=await listen(member,null);
 sql(`begin;
 select pg_advisory_xact_lock(170017);
 select set_config('dish_v4.writer','on',true);
 update public.rooms
 set created_at=statement_timestamp()-interval '3 days',
     expires_at=statement_timestamp()-interval '2 days',
     version=version+1
 where id='${kicked.roomId}';
 select gm17_private.cleanup();
 commit;`);
 pass('retention deletes expired room and cascades its signal',[false,false],JSON.parse(sql(`select json_build_array(
  exists(select 1 from public.rooms where id='${kicked.roomId}'),
  exists(select 1 from public.room_version_signals where room_id='${kicked.roomId}'))`)));
 // A committed visible update after cleanup proves both wildcard channels processed subsequent WAL.
 const controlBefore=await snapshot(outsider,control.roomId);
 expectOk(await api(outsider,'updateSettings',{
  ...request,roomId:control.roomId,requestId:requestId('post-cleanup'),expectedVersion:controlBefore.version,
  settings:{...controlBefore.settings,desiredAt:new Date(Date.now()+600000).toISOString()},
 }),'control update after retention');
 const controlAfter=await snapshot(outsider,control.roomId);
 await delivered(outsiderAll,controlAfter.version,'outsider wildcard channel is live after cleanup',control.roomId);
 await delivered(kickedAll,controlAfter.version,'kicked wildcard channel is live after cleanup',control.roomId);
 pass('room cleanup publishes no DELETE to unauthorized wildcard channels',[0,0,0],
  [outsiderAll.deletions.length,kickedAll.deletions.length,kickedChannel.deletions.length]);
 pass('publication permits only INSERT and UPDATE',[true,true,false,false],JSON.parse(sql(
  "select json_build_array(pubinsert,pubupdate,pubdelete,pubtruncate) from pg_publication where pubname='supabase_realtime'")));
 pass('SQL privilege boundary',[true,false,false,false],JSON.parse(sql("select json_build_array(has_table_privilege('authenticated','public.room_version_signals','SELECT'),has_table_privilege('anon','public.room_version_signals','SELECT'),has_table_privilege('authenticated','public.room_version_signals','INSERT'),has_table_privilege('service_role','public.room_version_signals','SELECT'))")));
 pass('room table not published, signals published',[false,true],JSON.parse(sql("select json_build_array(exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='rooms'),exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='room_version_signals'))")));
 await mkdir(reportDirectory,{recursive:true});
 await writeFile(resolve(reportDirectory,'results.json'),JSON.stringify({result:'Pass',fixtureOnly:true,caseCount:results.length,cases:results,credentialsInEvidence:false},null,2)+'\n');
 console.log('GM45 Realtime PASS',results.length);
} finally { for(const close of subscriptions)close(); }
