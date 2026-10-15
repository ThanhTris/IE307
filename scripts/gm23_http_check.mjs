/** GM-23 disposable HTTP/Bruno suite: inbox and push-device ownership. */
import assert from 'node:assert/strict';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCommand, validateConfig, validateApiUrl } from './backend.mjs';
import { createOwnedRuntimeFiles } from './gm19_runtime_files.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const python = process.platform === 'win32' ? 'python' : 'python3';
const keep = process.argv.includes('--bruno');
const ns = randomUUID();
const guests = [];
const cases = [];
const container = `gm23-http-${ns.replaceAll('-', '').slice(0, 16)}`;
const envDir = resolve(root, 'supabase/tests/bruno/GM-23/environments');
const runtimeFile = resolve(envDir, 'runtime.private.json');
const runtimeBru = resolve(envDir, 'Local.runtime.private.bru');
const runtimeFiles = createOwnedRuntimeFiles(runtimeBru, runtimeFile);
const control = randomUUID();
let gateway; let upstream; let containerStarted = false; let stopResolve; let stopRequested = false;

function jwt(payload) {
  const secret = 'super-secret-jwt-token-with-at-least-32-characters-long';
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const head = encode({ alg: 'HS256', typ: 'JWT' });
  const body = encode(payload);
  const signature = createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${signature}`;
}
const anonKey = jwt({ role: 'anon', iss: 'supabase', exp: Math.floor(Date.now() / 1000) + 3600 });
const serviceKey = jwt({ role: 'service_role', iss: 'supabase', exp: Math.floor(Date.now() / 1000) + 3600 });

async function docker(args, env = {}) {
  return await new Promise((resolveValue, reject) => {
    const child = spawn('docker', args, { shell: false, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let output = ''; let errors = '';
    child.stdout.on('data', chunk => { output += chunk; }); child.stderr.on('data', chunk => { errors += chunk; });
    child.on('error', reject); child.on('close', code => code === 0 ? resolveValue(output) : reject(new Error(errors || 'docker failed')));
  });
}
async function fixture(mode, sql = '') {
  return await new Promise((resolveValue, reject) => {
    const child = spawn(python, [resolve(root, 'scripts/gm20_http_fixture.py'), mode, ns, ...guests.map(g => g.user.id)], { env: { ...process.env, PYTHONUTF8: '1' }, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let out = ''; let err = ''; child.stdout.on('data', chunk => { out += chunk; }); child.stderr.on('data', chunk => { err += chunk; });
    child.on('error', reject); child.on('close', code => code === 0 ? resolveValue(mode === 'sql' ? out : JSON.parse(out)) : reject(new Error(err || out || 'fixture failed'))); child.stdin.end(sql);
  });
}
async function request(name, token, body) {
  const response = await fetch(`http://127.0.0.1:54332/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: anonKey, 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(20_000) });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}
async function senderRequest(name, body) {
  const response = await fetch(`http://127.0.0.1:54332/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20_000) });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}
async function check(name, fn) { try { const actual = await fn(); cases.push({ case: name, result: 'Pass', ...actual }); console.log(`Pass: ${name}`); } catch (error) { cases.push({ case: name, result: 'Fail', diagnostic: error.message }); throw error; } }
function tokenForGuest(user) { return user.access_token; }
function success(response) { assert.equal(response.status, 200, JSON.stringify(response.body)); assert.equal(response.body.ok, true, JSON.stringify(response.body)); return response.body; }
function failure(response, status, key) { assert.equal(response.status, status, JSON.stringify(response.body)); assert.equal(response.body.messageKey ?? response.body.error?.messageKey, key); }
async function main() {
  validateConfig(await readFile(resolve(root, 'supabase/config.toml'), 'utf8'));
  const status = JSON.parse(await runCommand(process.execPath, [resolve(root, 'node_modules/supabase/dist/supabase.js'), 'status', '--output', 'json', '--workdir', root], { quiet: true }));
  const authBase = validateApiUrl(status.API_URL);
  for (let i = 0; i < 3; i += 1) {
    const response = await fetch(`${authBase}/auth/v1/signup`, { method: 'POST', headers: { apikey: anonKey, 'content-type': 'application/json' }, body: JSON.stringify({ data: { display_name: `GM23 guest ${i}`, gm18_test_namespace: ns } }) });
    if (!response.ok) throw new Error(`signup_${response.status}`);
    guests.push(await response.json());
  }
  const dbInfo = await fixture('create');
  const sqlOutput = await fixture('sql', await readFile(resolve(root, 'supabase/tests/notifications.sql'), 'utf8'));
  assert.ok(!/^not ok /m.test(sqlOutput), sqlOutput);
  assert.equal((sqlOutput.match(/^ok \d+ /gm) ?? []).length, 20, sqlOutput);
  await mkdir(resolve(root, 'docs/evidence/roadmap-v2/GM-23'), { recursive: true });
  await writeFile(resolve(root, 'docs/evidence/roadmap-v2/GM-23/sql-run.txt'), sqlOutput.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>'));
  const rest = JSON.parse(await docker(['inspect', 'supabase_rest_gi-cung-duoc-local']))[0];
  const dbUrl = new URL(status.DB_URL ?? 'postgresql://postgres:postgres@supabase_db_gi-cung-duoc-local:5432/postgres');
  dbUrl.hostname = 'supabase_db_gi-cung-duoc-local'; dbUrl.port = '5432'; dbUrl.pathname = `/${dbInfo.database}`;
  const network = Object.keys(rest.NetworkSettings.Networks)[0];
  await docker(['run', '--rm', '--pull', 'never', '-d', '--name', container, '--network', network, '-p', '127.0.0.1::3000', '-e', 'PGRST_DB_URI', '-e', 'PGRST_JWT_SECRET', '-e', 'PGRST_DB_ANON_ROLE=anon', '-e', 'PGRST_DB_SCHEMAS=public', rest.Config.Image], { PGRST_DB_URI: dbUrl.toString(), PGRST_JWT_SECRET: rest.Config.Env.find(value => value.startsWith('PGRST_JWT_SECRET='))?.slice(17) ?? 'super-secret-jwt-token-with-at-least-32-characters-long' });
  containerStarted = true;
  const binding = JSON.parse(await docker(['inspect', container]))[0].NetworkSettings.Ports['3000/tcp'][0];
  upstream = `http://127.0.0.1:${binding.HostPort}`;
  for (let i = 0; i < 40; i += 1) { try { if ((await fetch(`${upstream}/`)).ok) break; } catch {} await new Promise(resolveValue => setTimeout(resolveValue, 250)); }
  gateway = createServer(async (requestValue, responseValue) => {
    try {
      if (requestValue.method === 'POST' && requestValue.url === '/__stop' && requestValue.headers['x-gm23-control'] === control) { stopRequested = true; responseValue.writeHead(200); responseValue.end('{}'); stopResolve?.(); return; }
      if (requestValue.method !== 'POST' || !requestValue.url.startsWith('/rest/v1/rpc/')) { responseValue.writeHead(404); responseValue.end('{}'); return; }
      // Kong/GoTrue normally rejects a missing bearer before PostgREST. The
      // disposable PostgREST container is intentionally direct, so preserve
      // that production HTTP boundary in the owned gateway.
      if (!requestValue.headers.authorization) { responseValue.writeHead(401, { 'content-type': 'application/json' }); responseValue.end(JSON.stringify({ ok: false, messageKey: 'AUTH_REQUIRED', error: { messageKey: 'AUTH_REQUIRED' } })); return; }
      const chunks = []; for await (const chunk of requestValue) chunks.push(chunk);
      const forwarded = await fetch(upstream + requestValue.url.replace('/rest/v1', ''), { method: 'POST', headers: { 'content-type': 'application/json', ...(requestValue.headers.authorization ? { authorization: requestValue.headers.authorization } : {}) }, body: Buffer.concat(chunks) });
      responseValue.writeHead(forwarded.status, { 'content-type': 'application/json' }); responseValue.end(await forwarded.text());
    } catch { responseValue.writeHead(502); responseValue.end('{}'); }
  });
  await new Promise((resolveValue, reject) => { gateway.once('error', reject); gateway.listen(54332, '127.0.0.1', resolveValue); });
  const recipient = tokenForGuest(guests[1]);
  await check('own inbox returns a bounded typed page', async () => { const response = await request('list_partner_inbox', recipient, { cursor: null }); assert.equal(response.status, 200); assert.ok(Array.isArray(response.body)); assert.ok(response.body.length <= 50); return { status: response.status, count: response.body.length }; });
  await check('missing auth is rejected', async () => { const response = await request('register_push_device', null, { requestId: randomUUID(), device_id: 'gm23-no-auth', token: 'ExponentPushToken[synthetic-no-auth]', permission: 'granted' }); failure(response, 401, 'AUTH_REQUIRED'); return { status: response.status }; });
  const deviceId = 'gm23-android-device';
  await check('granted registration is idempotent', async () => { const requestId = `gm23-${randomUUID()}`; const body = { requestId, device_id: deviceId, token: 'ExponentPushToken[synthetic-gm23-token]', permission: 'granted' }; const first = success(await request('register_push_device', recipient, body)); const replay = success(await request('register_push_device', recipient, body)); assert.deepEqual(replay, first); failure(await request('register_push_device', recipient, { ...body, token: 'ExponentPushToken[changed-token]' }), 409, 'REQUEST_ID_REUSED'); return { status: 200, replay: true }; });
  await check('sender SQL claim complete and receipt path', async () => {
    const sql = `begin;
      do $fixture$
      declare dataset_key uuid:=gen_random_uuid(); coverage_key uuid:=gen_random_uuid(); anchor_key uuid:=gen_random_uuid(); room_key uuid:=gen_random_uuid(); friend_key uuid:=gen_random_uuid(); invitation_key uuid:=gen_random_uuid(); event_key uuid:=gen_random_uuid(); v_delivery_id uuid:=gen_random_uuid(); device_row_id uuid; session_key uuid; pending_before integer; pending_after integer; claim jsonb; item jsonb; completed jsonb; receipt_claim jsonb; receipt_item jsonb; recorded jsonb;
      begin
        select d.id into device_row_id from public.devices d where d.user_id='${guests[1].user.id}' and d.device_key='${deviceId}';
        if device_row_id is null then raise exception 'sender fixture device missing'; end if;
        select d.session_id into session_key from public.devices d where d.id=device_row_id;
        insert into public.dataset_versions(id,dataset_version,contract_version,status,checksum,version,review_status,field_sources,entered_by)
          values(dataset_key,'0.0.0','1.1.0','draft',repeat('a',64),1,'draft','{}','gm23');
        insert into public.coverage_areas(area_id,name,boundary,dataset_version,version,review_status,field_sources,entered_by)
          values(coverage_key,'GM23 coverage','{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,0]]]}','0.0.0',1,'draft','{}','gm23');
        insert into public.public_anchors(anchor_id,name,lat,lng,coverage_id,is_public,version,review_status,field_sources,entered_by)
          values(anchor_key,'GM23 anchor',0,0,coverage_key,true,1,'draft','{}','gm23');
        insert into public.rooms(id,code,host_user_id,state,created_at,updated_at,expires_at,meal_slot,time_hint,budget,avoid_recent,
          anchor_id,coverage_id,radius_m,desired_at,timezone,service_mode,catalogue_version,dataset_version,eligibility_version,
          context_version,pool_version,policy_version,pool_seed,roster_user_ids,consent_snapshot,evaluated_at,locked_at,version,anchor_display_name)
          values(room_key,'GM23A2','${guests[0].user.id}','LOBBY',clock_timestamp(),clock_timestamp(),clock_timestamp()+interval '1 hour','lunch',null,null,false,
            anchor_key,coverage_key,1000,clock_timestamp()+interval '30 minutes','UTC','dine_in','0.0.0','0.0.0','gm18-api-1.0.0',1,1,'decision-v2','gm23-seed',array['${guests[0].user.id}'::uuid],jsonb_build_array(jsonb_build_object('userId','${guests[0].user.id}','historyConsent',false)),null,null,1,'GM23 anchor');
        insert into public.friends(id,low_user_id,high_user_id,accepted_at,version)
          values(friend_key,least('${guests[0].user.id}'::uuid,'${guests[1].user.id}'::uuid),greatest('${guests[0].user.id}'::uuid,'${guests[1].user.id}'::uuid),clock_timestamp(),1);
        insert into public.room_invitations(id,room_id,friend_id,sender_user_id,recipient_user_id,state,event_id,created_at,expires_at,version)
          values(invitation_key,room_key,friend_key,'${guests[0].user.id}','${guests[1].user.id}','pending',event_key,clock_timestamp(),clock_timestamp()+interval '1 hour',1);
        insert into public.events(id,kind,room_id,invitation_id,result_id,recipient_user_ids,dedupe_key,created_at,expires_at,version)
          values(event_key,'ROOM_INVITED',room_key,invitation_key,null,array['${guests[1].user.id}'::uuid],'gm23-sender:'||event_key,clock_timestamp(),clock_timestamp()+interval '1 hour',1);
        select count(*) into pending_before from public.deliveries where event_id=event_key and state='pending';
        select id into v_delivery_id from public.deliveries where event_id=event_key and state='pending' limit 1;
        if pending_before<>1 then raise exception 'sender event delivery missing: %',pending_before; end if;
        perform set_config('request.jwt.claim.role','service_role',true);
        perform set_config('request.jwt.claim.sub','${guests[1].user.id}',true);
        perform set_config('request.jwt.claims',jsonb_build_object('sub','${guests[1].user.id}','session_id',session_key)::text,true);
        perform public.register_push_device('gm23-reregister-'||event_key::text,'${deviceId}','ExponentPushToken[synthetic-gm23-token]','granted');
        select count(*) into pending_after from public.deliveries where event_id=event_key and state='pending';
        if pending_after<>1 then raise exception 'sender re-register expired pending delivery'; end if;
        perform public.register_push_device('gm23-rotate-'||event_key::text,'${deviceId}','ExponentPushToken[synthetic-gm23-rotated-token]','granted');
        select count(*) into pending_after from public.deliveries where event_id=event_key and state='pending';
        if pending_after<>1 then raise exception 'sender token rotation lost pending delivery'; end if;
        perform set_config('request.jwt.claim.role','service_role',true);
        claim:=public.claim_push_deliveries(1);
        if jsonb_array_length(claim)<>1 then raise exception 'sender claim failed: %',claim; end if;
        item:=claim->0;
        if item->>'token' <> 'ExponentPushToken[synthetic-gm23-rotated-token]' then raise exception 'sender claim used stale token: %',item->>'token'; end if;
        completed:=public.complete_push_delivery((item->>'deliveryId')::uuid,(item->>'leaseId')::uuid,'gm23-ticket');
        if completed->>'ok' is distinct from 'true' then raise exception 'sender complete failed: %',completed; end if;
        update gm23_private.delivery_meta set provider_ticket_at=clock_timestamp()-interval '16 minutes' where gm23_private.delivery_meta.delivery_id=v_delivery_id;
        receipt_claim:=public.claim_push_receipts(1);
        if jsonb_array_length(receipt_claim)<>1 then raise exception 'sender receipt claim failed: %',receipt_claim; end if;
        receipt_item:=receipt_claim->0;
        recorded:=public.record_push_receipt((receipt_item->>'deliveryId')::uuid,'gm23-receipt','ok');
        if recorded->>'ok' is distinct from 'true' then raise exception 'sender receipt record failed: %',recorded; end if;
      end $fixture$;
      commit;
      select 'sender_sql_ok';`;
    const output = await fixture('sql', sql);
    assert.match(output, /sender_sql_ok/);
    return { status: 200, claim: true, complete: true, receipt: true };
  });
  await check('stale receipt cannot revoke rotated token', async () => {
    const sql = `begin;
      do $fixture$
      declare delivery_key uuid; recorded jsonb; device_state text;
      begin
        select d.id into delivery_key
          from public.deliveries d join public.events e on e.id=d.event_id
          where e.dedupe_key like 'gm23-sender:%' order by e.created_at desc limit 1;
        if delivery_key is null then raise exception 'receipt rotation fixture missing'; end if;
        perform set_config('request.jwt.claim.role','service_role',true);
        recorded:=public.record_push_receipt(delivery_key,'gm23-old-ticket','error','DeviceNotRegistered');
        if recorded->>'ok' is distinct from 'true' or recorded->>'ignored' is distinct from 'true' or recorded->>'messageKey' is distinct from 'STALE_RECEIPT' then
          raise exception 'stale receipt was not ignored: %',recorded;
        end if;
        select active::text||'|'||push_token||'|'||permission into device_state
          from public.devices where user_id='${guests[1].user.id}' and device_key='${deviceId}';
        if device_state <> 'true|ExponentPushToken[synthetic-gm23-rotated-token]|granted' then
          raise exception 'stale receipt revoked current registration: %',device_state;
        end if;
      end $fixture$;
      commit;
      select 'stale_receipt_ok';`;
    const output = await fixture('sql', sql);
    assert.match(output, /stale_receipt_ok/);
    return { status: 200, staleReceipt: 'ignored', rotatedTokenPreserved: true };
  });
  await check('unchanged registration preserves lease and retry budget', async () => {
    const sql = `begin;
      do $fixture$
      declare event_key uuid:=gen_random_uuid(); retry_event uuid:=gen_random_uuid(); room_key uuid; invitation_key uuid; delivery_key uuid; retry_delivery uuid; session_key uuid; claim jsonb; item jsonb; retry_claim jsonb; failed jsonb; retry_after jsonb;
      begin
        select e.room_id,e.invitation_id into room_key,invitation_key from public.events e where e.dedupe_key like 'gm23-sender:%' limit 1;
        if room_key is null then raise exception 'lease fixture room missing'; end if;
        insert into public.events(id,kind,room_id,invitation_id,result_id,recipient_user_ids,dedupe_key,created_at,expires_at,version)
          values(event_key,'ROOM_INVITED',room_key,invitation_key,null,array['${guests[1].user.id}'::uuid],'gm23-lease-test:'||event_key::text,clock_timestamp(),clock_timestamp()+interval '1 hour',1);
        select d.id into delivery_key from public.deliveries d where d.event_id=event_key;
        if delivery_key is null then raise exception 'lease delivery missing'; end if;
        perform set_config('request.jwt.claim.role','service_role',true);
        claim:=public.claim_push_deliveries(1);
        if jsonb_array_length(claim)<>1 then raise exception 'initial lease claim failed: %',claim; end if;
        item:=claim->0;
        perform set_config('request.jwt.claim.role','service_role',true);
        perform set_config('request.jwt.claims',jsonb_build_object('sub','${guests[1].user.id}','session_id',(select d.session_id from public.devices d where d.id=(select device_id from public.deliveries where id=delivery_key)))::text,true);
        perform public.register_push_device('gm23-lease-reregister-'||event_key::text,'${deviceId}','ExponentPushToken[synthetic-gm23-rotated-token]','granted');
        retry_claim:=public.claim_push_deliveries(1);
        if jsonb_array_length(retry_claim)<>0 then raise exception 'unchanged registration stole active lease: %',retry_claim; end if;
        failed:=public.complete_push_delivery((item->>'deliveryId')::uuid,(item->>'leaseId')::uuid,'gm23-lease-ticket');
        if failed->>'ok' is distinct from 'true' then raise exception 'original lease was lost: %',failed; end if;

        insert into public.events(id,kind,room_id,invitation_id,result_id,recipient_user_ids,dedupe_key,created_at,expires_at,version)
          values(retry_event,'ROOM_INVITED',room_key,invitation_key,null,array['${guests[1].user.id}'::uuid],'gm23-retry-test:'||retry_event::text,clock_timestamp(),clock_timestamp()+interval '1 hour',1);
        select d.id into retry_delivery from public.deliveries d where d.event_id=retry_event;
        claim:=public.claim_push_deliveries(1); item:=claim->0;
        if jsonb_array_length(claim)<>1 then raise exception 'retry claim failed: %',claim; end if;
        failed:=public.fail_push_delivery((item->>'deliveryId')::uuid,(item->>'leaseId')::uuid,'HTTP_429',600);
        if failed->>'ok' is distinct from 'true' then raise exception 'retry scheduling failed: %',failed; end if;
        perform public.register_push_device('gm23-backoff-reregister-'||retry_event::text,'${deviceId}','ExponentPushToken[synthetic-gm23-rotated-token]','granted');
        retry_after:=public.claim_push_deliveries(1);
        if jsonb_array_length(retry_after)<>0 then raise exception 'Retry-After was reset by unchanged registration: %',retry_after; end if;
        update public.deliveries set attempts=5,state='failed',version=version+1 where id=retry_delivery;
        update gm23_private.delivery_meta set next_attempt_at=clock_timestamp() where delivery_id=retry_delivery;
        perform public.register_push_device('gm23-exhausted-reregister-'||retry_event::text,'${deviceId}','ExponentPushToken[synthetic-gm23-rotated-token]','granted');
        retry_after:=public.claim_push_deliveries(1);
        if jsonb_array_length(retry_after)<>0 then raise exception 'exhausted delivery was revived: %',retry_after; end if;
      end $fixture$;
      commit;
      select 'lease_retry_ok';`;
    const output = await fixture('sql', sql);
    assert.match(output, /lease_retry_ok/);
    return { status: 200, activeLeasePreserved: true, retryAfterPreserved: true, exhaustedAttemptsPreserved: true };
  });
  await check('service role sender RPC is accepted over HTTP', async () => { const response = await senderRequest('claim_push_deliveries', { batch_size: 1 }); assert.equal(response.status, 200, JSON.stringify(response.body)); assert.ok(Array.isArray(response.body)); return { status: response.status, claimed: response.body.length }; });
  await check('denied permission does not retain token', async () => { success(await request('register_push_device', recipient, { requestId: randomUUID(), device_id: deviceId, token: 'ignored-token', permission: 'denied' })); const rows = (await fixture('sql', `select active::text||'|'||permission||'|'||(push_token is null)::text from public.devices where user_id='${guests[1].user.id}' and device_key='${deviceId}';`)).trim(); assert.equal(rows, 'false|denied|true'); return { status: 200, deviceProjection: 'inactive/denied/no-token' }; });
  await check('unregister clears token and is repeat-safe', async () => { const body = { requestId: randomUUID(), device_id: deviceId }; success(await request('unregister_push_device', recipient, body)); success(await request('unregister_push_device', recipient, { ...body, requestId: randomUUID() })); const rows = (await fixture('sql', `select active::text||'|'||(push_token is null)::text from public.devices where user_id='${guests[1].user.id}' and device_key='${deviceId}';`)).trim(); assert.equal(rows, 'false|true'); return { status: 200, cleaned: true }; });
  await check('client cannot read push token directly', async () => { const response = await fetch(`${upstream}/devices?select=push_token`, { headers: { authorization: `Bearer ${recipient}`, apikey: anonKey } }); assert.notEqual(response.status, 200); return { status: response.status }; });
  const report = { result: 'Pass', task: 'GM-23', contract: 'food-v1/roadmap-v2/GM-23.1', schemaVersion: '0.7.0', checkedAt: new Date().toISOString(), revision: (await runCommand('git', ['rev-parse', 'HEAD'], { quiet: true })).trim(), sourceHashes: Object.fromEntries(['supabase/migrations/0025_notifications.sql', 'supabase/tests/notifications.sql', 'supabase/tests/http/GM-23.http', 'supabase/functions/push-sender/index.ts'].map(path => [path, createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex')])), syntheticPositiveDataOnly: true, remoteExpoDelivery: 'Not run', cases };
  await mkdir(resolve(root, 'docs/evidence/roadmap-v2/GM-23'), { recursive: true });
  await writeFile(resolve(root, 'docs/evidence/roadmap-v2/GM-23/http-results.json'), JSON.stringify(report, null, 2) + '\n');
  if (keep) {
    await mkdir(envDir, { recursive: true });
    await writeFile(runtimeBru, `vars {\n  baseUrl: http://127.0.0.1:54332\n  anonKey: ${anonKey}\n  recipientToken: ${recipient}\n  deviceId: ${deviceId}\n  requestId: gm23-register-${Date.now()}\n  requestIdDenied: gm23-denied-${Date.now()}\n  requestIdUnregister: gm23-unregister-${Date.now()}\n  requestIdNoAuth: gm23-no-auth-${Date.now()}\n}\n`);
    await writeFile(runtimeFile, JSON.stringify({ endpoint: 'http://127.0.0.1:54332', control, namespace: ns, guestIds: guests.map(g => g.user.id), stopped: false }));
    console.log(`BRUNO_READY endpoint=http://127.0.0.1:54332 namespace=${ns}`);
    await new Promise(resolveValue => { stopResolve = resolveValue; process.once('SIGINT', resolveValue); process.once('SIGTERM', resolveValue); });
  }
}
try { await main(); } catch (error) { console.error(`GM23 failed: ${error.message}`); process.exitCode = 1; }
finally {
  if (gateway) await new Promise(resolveValue => gateway.close(resolveValue));
  if (containerStarted) await docker(['stop', container]).catch(() => {});
  if (!keep || stopRequested) await fixture('cleanup').catch(() => {});
  if (!keep || stopRequested) await runtimeFiles.cleanup().catch(() => {});
}
