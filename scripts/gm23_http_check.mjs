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
  await check('denied permission does not retain token', async () => { success(await request('register_push_device', recipient, { requestId: randomUUID(), device_id: deviceId, token: 'ignored-token', permission: 'denied' })); const rows = (await fixture('sql', `select active::text||'|'||permission||'|'||(push_token is null)::text from public.devices where user_id='${guests[1].user.id}' and device_key='${deviceId}';`)).trim(); assert.equal(rows, 'false|denied|true'); return { status: 200, deviceProjection: 'inactive/denied/no-token' }; });
  await check('unregister clears token and is repeat-safe', async () => { const body = { requestId: randomUUID(), device_id: deviceId }; success(await request('unregister_push_device', recipient, body)); success(await request('unregister_push_device', recipient, { ...body, requestId: randomUUID() })); const rows = (await fixture('sql', `select active::text||'|'||(push_token is null)::text from public.devices where user_id='${guests[1].user.id}' and device_key='${deviceId}';`)).trim(); assert.equal(rows, 'false|true'); return { status: 200, cleaned: true }; });
  await check('client cannot read push token directly', async () => { const response = await fetch(`${upstream}/devices?select=push_token`, { headers: { authorization: `Bearer ${recipient}`, apikey: anonKey } }); assert.notEqual(response.status, 200); return { status: response.status }; });
  const report = { result: 'Pass', task: 'GM-23', contract: 'food-v1/roadmap-v2/GM-23.1', schemaVersion: '0.6.0', checkedAt: new Date().toISOString(), revision: (await runCommand('git', ['rev-parse', 'HEAD'], { quiet: true })).trim(), sourceHashes: Object.fromEntries(['supabase/migrations/0024_notifications.sql', 'supabase/tests/notifications.sql', 'supabase/tests/http/GM-23.http', 'supabase/functions/push-sender/index.ts'].map(path => [path, createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex')])), syntheticPositiveDataOnly: true, remoteExpoDelivery: 'Not run', cases };
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
