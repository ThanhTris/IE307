/** GM-22 owned disposable HTTP suite. Positive rows and JWTs never touch app data. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCommand, validateConfig, validateApiUrl } from './backend.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const python=process.platform==='win32'?'python':'python3'; const ns=randomUUID(), guests=[], cases=[];
const container='gm22-http-'+ns.replaceAll('-','').slice(0,16), port=54332, control=randomUUID();
const keep=process.argv.includes('--bruno');
let base,key,status,dbInfo,ids,gateway,started=false,stopResolve;
async function docker(args,env={}) { return new Promise((ok,bad)=>{const c=spawn('docker',args,{shell:false,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});let o='';c.stdout.on('data',x=>o+=x);c.on('error',bad);c.on('close',n=>n===0?ok(o):bad(Error('docker failed')));}); }
async function fixture(mode,sql='') { return new Promise((ok,bad)=>{const c=spawn(python,[resolve(root,'scripts/gm19_http_fixture.py'),mode,ns,...guests.map(g=>g.user.id)],{env:{...process.env,PYTHONUTF8:'1'},stdio:['pipe','pipe','pipe']});let o='',e='';c.stdout.on('data',x=>o+=x);c.stderr.on('data',x=>e+=x);c.on('error',bad);c.on('close',n=>n===0?ok(mode==='sql'?o:JSON.parse(o)):bad(Error(e||o||'fixture failed')));c.stdin.end(sql);}); }
async function req(name,token,body) { const r=await fetch(base+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});return {status:r.status,body:await r.json()}; }
function ok(r){assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.ok,true,JSON.stringify(r.body));return r.body;}
function fail(r,status,code){assert.equal(r.status,status,JSON.stringify(r.body));assert.equal(r.body.messageKey??r.body.error?.messageKey,code);}
async function check(name,fn){try{const out=await fn();cases.push({case:name,result:'Pass',...out});console.log('Pass:',name);}catch(e){cases.push({case:name,result:'Fail',diagnostic:String(e.message).slice(0,400)});throw e;}}
try {
  validateConfig(readFileSync(resolve(root,'supabase/config.toml'),'utf8'));
  status=JSON.parse(await runCommand(process.execPath,[resolve(root,'node_modules/supabase/dist/supabase.js'),'status','--output','json','--workdir',root],{quiet:true}));
  const auth=validateApiUrl(status.API_URL); key=status.ANON_KEY;
  for(let i=0;i<3;i++){let r;for(let attempt=0;attempt<5;attempt++){r=await fetch(auth+'/auth/v1/signup',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({data:{display_name:'GM22 guest '+i,gm18_test_namespace:ns,gm19_test_namespace:ns,gm22_test_namespace:ns}})});if(r.status!==429)break;await new Promise(resolveWait=>setTimeout(resolveWait,1500));}assert.equal(r.status,200);guests.push(await r.json());}
  dbInfo=await fixture('create');ids=await fixture('positive');
  const sql=await fixture('sql',readFileSync(resolve(root,'supabase/tests/database/GM-22_social.test.sql'),'utf8'));
  assert.ok(!/^not ok /m.test(sql),sql);assert.equal((sql.match(/^ok \d+ /gm)??[]).length,19);
  await mkdir(resolve(root,'docs/evidence/roadmap-v2/GM-22'),{recursive:true});await writeFile(resolve(root,'docs/evidence/roadmap-v2/GM-22/sql-run.txt'),sql.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,'<uuid>'),'utf8');
  const rest=JSON.parse(await docker(['inspect','supabase_rest_gi-cung-duoc-local']))[0];const dbUrl=new URL(status.DB_URL);dbUrl.hostname='supabase_db_gi-cung-duoc-local';dbUrl.port='5432';dbUrl.pathname='/'+dbInfo.database;
  await docker(['run','--rm','--pull','never','-d','--name',container,'--network',Object.keys(rest.NetworkSettings.Networks)[0],'-p',`127.0.0.1::3000`,'-e','PGRST_DB_URI','-e','PGRST_JWT_SECRET','-e','PGRST_DB_ANON_ROLE=anon','-e','PGRST_DB_SCHEMAS=public',rest.Config.Image],{PGRST_DB_URI:dbUrl.toString(),PGRST_JWT_SECRET:rest.Config.Env.find(v=>v.startsWith('PGRST_JWT_SECRET=')).slice(17)});started=true;
  const binding=JSON.parse(await docker(['inspect',container]))[0].NetworkSettings.Ports['3000/tcp'][0];const upstream='http://127.0.0.1:'+binding.HostPort;for(let i=0;i<40;i++){try{if((await fetch(upstream+'/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
  gateway=createServer(async(q,s)=>{try{if(q.method==='POST'&&q.url==='/__stop'&&q.headers['x-gm22-control']===control){s.writeHead(200);s.end('{}');setTimeout(()=>stopResolve?.(),10);return;}if(q.method!=='POST'||!q.url.startsWith('/rest/v1/rpc/')){s.writeHead(404);s.end('{}');return;}const chunks=[];for await(const c of q)chunks.push(c);const u=await fetch(upstream+q.url.replace('/rest/v1',''),{method:'POST',headers:{'Content-Type':'application/json',...(q.headers.authorization?{Authorization:q.headers.authorization}:{})},body:Buffer.concat(chunks)});s.writeHead(u.status,{'Content-Type':'application/json'});s.end(await u.text());}catch(e){s.writeHead(502);s.end('{}');}});
  await new Promise((ok,bad)=>{gateway.once('error',bad);gateway.listen(port,'127.0.0.1',ok)});base=`http://127.0.0.1:${port}`;
  const host=guests[0].access_token, member=guests[1].access_token, outsider=guests[2].access_token;const memberId=guests[1].user.id, outsiderId=guests[2].user.id;
  const hostIdentityResponse=await req('get_my_social_identity',host,{});assert.equal(hostIdentityResponse.status,200);const hostIdentity=hostIdentityResponse.body;
  const memberIdentityResponse=await req('get_my_social_identity',member,{});assert.equal(memberIdentityResponse.status,200);const memberIdentity=memberIdentityResponse.body;
  await check('self identity has stable ten-character code',async()=>{assert.match(hostIdentity.friendCode,/^[A-HJ-NP-Z2-9]{10}$/);return {status:200};});
  const invite=ok(await req('invite_partner',host,{requestId:randomUUID(),friend_code:memberIdentity.friendCode,partner_id:null}));
  await check('recipient accepts partner invite and pair lists',async()=>{assert.equal(invite.data.status,'pending');ok(await req('accept_partner',member,{requestId:randomUUID(),invitation_id:invite.data.id}));const f=await req('list_friends',host,{});assert.equal(f.status,200);assert.equal(f.body.length,1);return {status:200,friends:1};});
  const room=ok(await req('create_room',host,{requestId:randomUUID(),display_name:'GM22 host',anchor_id:ids.anchorId,radius_m:1500,desired_at:new Date(Date.now()+1800000).toISOString(),service_mode:'dine_in',meal_slot:'dinner',time_hint:null,budget:null,avoid_recent:false}));
  const roomInvite=ok(await req('invite_to_room',host,{requestId:randomUUID(),room_id:room.roomId,partner_id:memberId,expected_version:room.version}));
  await check('room invite does not join before recipient accepts',async()=>{assert.equal(roomInvite.data.status,'pending');const before=ok(await req('get_room_snapshot',host,{room_id:room.roomId}));assert.equal(before.data.members.length,1);return {status:200,members:1};});
  await check('recipient accepts room invitation with ready false',async()=>{const joined=ok(await req('accept_room_invite',member,{requestId:randomUUID(),invitation_id:roomInvite.data.id,display_name:'GM22 member'}));assert.equal(joined.data.memberId.length,36);const snap=ok(await req('get_room_snapshot',member,{room_id:room.roomId}));assert.equal(snap.data.members.length,2);assert.ok(snap.data.members.every(m=>m.ready===false));return {status:200,members:2,ready:false};});
  await check('inbox is caller scoped and missing auth is rejected',async()=>{const inbox=await req('list_partner_inbox',member,{cursor:null});assert.equal(inbox.status,200);assert.ok(Array.isArray(inbox.body));const unauth=await req('list_friends',null,{});assert.equal(unauth.status,401);return {status:200,unauthStatus:401};});
  const outsiderIdentityResponse=await req('get_my_social_identity',outsider,{});assert.equal(outsiderIdentityResponse.status,200);
  const inv2=ok(await req('invite_partner',host,{requestId:randomUUID(),friend_code:outsiderIdentityResponse.body.friendCode,partner_id:null}));
  await check('wrong recipient and rejected invite are distinguished',async()=>{fail(await req('accept_partner',host,{requestId:randomUUID(),invitation_id:inv2.data.id}),403,'NOT_RECIPIENT');ok(await req('reject_partner',outsider,{requestId:randomUUID(),invitation_id:inv2.data.id}));return {status:200};});
  // Keep the retained Bruno fixture at the pre-cleanup state so its request
  // chain can exercise the accepted pair and pending room invitation. The
  // regular disposable HTTP suite still verifies unfriend cleanup.
  if(!keep) await check('unfriend removes pair and keeps room membership',async()=>{ok(await req('unfriend',host,{requestId:randomUUID(),partner_id:memberId}));const f=await req('list_friends',host,{});assert.equal(f.status,200);assert.equal(f.body.length,0);const s=ok(await req('get_room_snapshot',member,{room_id:room.roomId}));assert.equal(s.data.members.length,2);return {status:200,membershipPreserved:true};});
  const summary={result:'Pass',task:'GM-22',contract:'food-v1/roadmap-v2/GM-22.1',schemaVersion:'0.4.0',revision:(await runCommand('git',['rev-parse','HEAD'],{quiet:true})).trim(),checkedAt:new Date().toISOString(),cases,endpoint:base,synthetic:true};
  await writeFile(resolve(root,'docs/evidence/roadmap-v2/GM-22/http-results.json'),JSON.stringify(summary,null,2)+'\n','utf8');
  if(keep){
    const envDir=resolve(root,'supabase/tests/bruno/GM-22/environments');await mkdir(envDir,{recursive:true});
    await writeFile(resolve(envDir,'Local.runtime.private.bru'),`vars {\n  baseUrl: ${base}\n  anonKey: ${key}\n  hostToken: ${host}\n  memberToken: ${member}\n  outsiderToken: ${outsider}\n  memberFriendCode: ${memberIdentity.friendCode}\n  roomId: ${room.roomId}\n  roomVersion: ${room.version}\n  memberId: ${memberId}\n  friendInvitationId: ${invite.data.id}\n  roomInvitationId: ${roomInvite.data.id}\n  requestId: gm22-bruno-${Date.now()}\n}\n`,'utf8');
    await writeFile(resolve(envDir,'runtime.private.json'),JSON.stringify({endpoint:base,control,namespace:ns}),'utf8');
    console.log('BRUNO_READY endpoint='+base+' namespace='+ns+' (stop with scripts/gm22_http_stop.mjs)');
    await new Promise(resolveWait=>{stopResolve=resolveWait;process.once('SIGINT',resolveWait);process.once('SIGTERM',resolveWait);});
    await new Promise(resolveClose=>gateway?.close(resolveClose));
    if(started) await docker(['stop',container]).catch(()=>{});
  } else console.log(JSON.stringify(summary));
}catch(e){console.error('GM22 failed:',e.message);process.exitCode=1;}
finally {if(!keep){if(gateway)await new Promise(r=>gateway.close(r));if(started)await docker(['stop',container]).catch(()=>{});if(guests.length)await fixture('cleanup').catch(()=>{});} }
