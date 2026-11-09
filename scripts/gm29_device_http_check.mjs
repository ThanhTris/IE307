import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = process.env.GM29_QA_MANIFEST;
const credentialsPath = process.env.GM29_QA_CREDENTIALS;
assert.ok(manifestPath && credentialsPath, 'GM29_QA_MANIFEST and GM29_QA_CREDENTIALS are required');

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const credentials = JSON.parse(await readFile(credentialsPath, 'utf8'));
assert.equal(manifest.format, 'gm03-qa-manifest-v1', 'Refusing a runtime without a sealed GM-03 QA manifest');
assert.match(manifest.projectId, /^gm03qa-[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/);
assert.equal(manifest.endpoint?.baseUrl, credentials.apiUrl, 'Credential origin must match the sealed QA endpoint');
assert.equal(new URL(manifest.endpoint.baseUrl).hostname, '127.0.0.1', 'QA endpoint must be loopback only');
assert.equal(typeof credentials.anonKey, 'string');
assert.equal(typeof credentials.serviceRoleKey, 'string');

const dockerInfo = JSON.parse(execFileSync('docker', ['inspect', manifest.containerName], { encoding: 'utf8' }))[0];
assert.equal(dockerInfo.State.Running, true, 'Owned QA database must be running');
assert.equal(dockerInfo.Config.Labels?.['com.supabase.cli.project'], manifest.projectId);
assert.equal(String(dockerInfo.Config.Labels?.['com.supabase.cli.workdir'] ?? '').replaceAll('\\', '/').toLowerCase(), String(manifest.workdir).replaceAll('\\', '/').toLowerCase());

const endpoint = manifest.endpoint.baseUrl;
const cases = [];
const sourceHashes = {};
const hashFile = async file => {
  sourceHashes[file] = createHash('sha256').update(await readFile(resolve(root, file))).digest('hex');
};

function record(name, expected, actual) {
  assert.deepEqual(actual, expected, name);
  cases.push({ name, result: 'Pass', expected, actual });
}

async function rpc(name, accessToken, body) {
  const response = await fetch(`${endpoint}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: credentials.anonKey,
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  let payload = {};
  try { payload = await response.json(); } catch { /* Status assertion reports boundary failures. */ }
  return { status: response.status, payload };
}

async function guest(displayName) {
  const response = await fetch(`${endpoint}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: credentials.anonKey, 'content-type': 'application/json' },
    body: JSON.stringify({ data: { display_name: displayName, gm29_qa: manifest.runId } }),
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await response.json();
  assert.equal(response.status, 200, 'QA guest signup must succeed');
  assert.ok(payload.user?.id && payload.access_token, 'QA guest must have an identity and JWT');
  return { id: payload.user.id, token: payload.access_token };
}

function sql(query) {
  return execFileSync('docker', [
    'exec', manifest.containerName, 'psql', '-X', '-q', '-U', 'postgres', '-d', 'postgres', '-At', '-c', query,
  ], { encoding: 'utf8', timeout: 20_000 }).trim();
}

function deviceState(userId, deviceId) {
  return sql(`select active::text||'|'||permission||'|'||(push_token is null)::text||'|'||(session_id is null)::text from public.devices where user_id='${userId}'::uuid and device_key='${deviceId.replaceAll("'", "''")}';`);
}

const owner = await guest('GM29 QA push owner');
const outsider = await guest('GM29 QA push outsider');
const inbox = await rpc('list_partner_inbox', owner.token, { cursor: null });
assert.equal(inbox.status, 200, 'Authenticated Inbox request must succeed');
assert.ok(Array.isArray(inbox.payload) && inbox.payload.length <= 50, 'Inbox must return a bounded page');
cases.push({ name: 'JWT owner reads bounded Inbox', result: 'Pass', expected: 'HTTP 200 and <=50 rows', actual: { status: inbox.status, rowCount: inbox.payload.length } });

const deviceId = `gm29-qa-${randomUUID()}`;
const tokenA = `ExponentPushToken[gm29-${randomUUID()}]`;
const tokenB = `ExponentPushToken[gm29-${randomUUID()}]`;
const requestId = randomUUID();
const registerBody = { requestId, device_id: deviceId, token: tokenA, permission: 'granted' };
const register = await rpc('register_push_device', owner.token, registerBody);
assert.equal(register.status, 200, 'Granted registration must return HTTP 200');
assert.equal(register.payload.ok, true);
assert.equal(register.payload.data, null);
const replay = await rpc('register_push_device', owner.token, registerBody);
assert.deepEqual(replay, register, 'Same requestId/body must replay the exact ACK');
const reused = await rpc('register_push_device', owner.token, { ...registerBody, token: tokenB });
assert.equal(reused.status, 409);
assert.equal(reused.payload.messageKey ?? reused.payload.error?.messageKey, 'REQUEST_ID_REUSED');
record('registration, exact ACK replay, and request ID reuse guard', { status: 200, ack: true, data: null, replayExact: true, reusedStatus: 409, reusedKey: 'REQUEST_ID_REUSED' }, {
  status: register.status, ack: register.payload.ok, data: register.payload.data, replayExact: JSON.stringify(replay) === JSON.stringify(register), reusedStatus: reused.status, reusedKey: reused.payload.messageKey ?? reused.payload.error?.messageKey,
});
record('registered device state is private server state', 'true|granted|false|false', deviceState(owner.id, deviceId));
assert.equal(sql(`select push_token='${tokenA}' from public.devices where user_id='${owner.id}'::uuid and device_key='${deviceId}';`), 't');

const outsiderUnregister = await rpc('unregister_push_device', outsider.token, { requestId: randomUUID(), device_id: deviceId });
assert.equal(outsiderUnregister.status, 200);
assert.equal(outsiderUnregister.payload.ok, true);
record('another identity cannot unregister the owner device', 'true|granted|false|false', deviceState(owner.id, deviceId));

const rotate = await rpc('register_push_device', owner.token, { requestId: randomUUID(), device_id: deviceId, token: tokenB, permission: 'granted' });
assert.equal(rotate.status, 200);
assert.equal(rotate.payload.ok, true);
assert.equal(sql(`select push_token='${tokenB}' from public.devices where user_id='${owner.id}'::uuid and device_key='${deviceId}';`), 't');
record('same owner can rotate token without changing identity', 'true|granted|false|false', deviceState(owner.id, deviceId));

const denied = await rpc('register_push_device', owner.token, { requestId: randomUUID(), device_id: deviceId, token: tokenB, permission: 'denied' });
assert.equal(denied.status, 200);
assert.equal(denied.payload.ok, true);
record('denied permission deactivates device and clears token', 'false|denied|true|false', deviceState(owner.id, deviceId));

const unregisterBody = { requestId: randomUUID(), device_id: deviceId };
const unregister = await rpc('unregister_push_device', owner.token, unregisterBody);
assert.equal(unregister.status, 200);
assert.equal(unregister.payload.ok, true);
assert.equal(unregister.payload.data, null);
const unregisterReplay = await rpc('unregister_push_device', owner.token, unregisterBody);
assert.deepEqual(unregisterReplay, unregister, 'Unregister ACK replay must be exact');
record('unregister clears token/session and ACK replay is exact', { status: 200, data: null, state: 'false|unknown|true|true', replayExact: true }, {
  status: unregister.status, data: unregister.payload.data, state: deviceState(owner.id, deviceId), replayExact: JSON.stringify(unregisterReplay) === JSON.stringify(unregister),
});

const privateRead = await fetch(`${endpoint}/rest/v1/devices?select=push_token`, {
  headers: { apikey: credentials.anonKey, authorization: `Bearer ${owner.token}` },
  signal: AbortSignal.timeout(20_000),
});
assert.notEqual(privateRead.status, 200, 'Client must not read push tokens directly');
cases.push({ name: 'client cannot read token column directly', result: 'Pass', expected: 'non-200', actual: { status: privateRead.status } });

await hashFile('scripts/gm29_device_http_check.mjs');
await hashFile('scripts/gm_v4_http_check.mjs');
const report = {
  result: 'Pass',
  task: 'GM-29',
  environment: 'owned GM-03 loopback QA runtime',
  runId: manifest.runId,
  sourceRevision: manifest.sourceRevision,
  contractVersion: manifest.contractVersion,
  schemaVersion: manifest.schemaVersion,
  endpoint: manifest.endpoint.baseUrl,
  syntheticUsers: 2,
  credentialsWritten: false,
  tokensOrIdentityIdsWritten: false,
  applicationDatabaseChanged: false,
  cases,
  sourceHashes,
  checkedAt: new Date().toISOString(),
};
const outputPath = resolve(root, 'docs/evidence/roadmap-v2/GM-29/artifacts/qa-device-http.json');
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: report.result, runId: report.runId, caseCount: cases.length, cases: cases.map(item => ({ name: item.name, result: item.result, actual: item.actual })), report: 'docs/evidence/roadmap-v2/GM-29/artifacts/qa-device-http.json', credentialsPrinted: false }, null, 2));
