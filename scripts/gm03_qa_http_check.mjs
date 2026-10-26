import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const workdir = process.env.GM03_QA_WORKDIR;
const manifestPath = process.env.GM03_QA_MANIFEST;
assert.ok(workdir && manifestPath, 'Use the owned GM-03 QA runner; no default/app database is accepted.');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const state = JSON.parse(await readFile(resolve(workdir, 'state.json'), 'utf8'));
const credentials = JSON.parse(await readFile(resolve(workdir, 'credentials.private.json'), 'utf8'));
assert.equal(manifest.format, 'gm03-qa-manifest-v1');
assert.equal(state.ownerUuid, manifest.ownerUuid);
assert.equal(credentials.apiUrl, manifest.endpoint.baseUrl);
assert.equal(new URL(credentials.apiUrl).hostname, '127.0.0.1');

const cases = [];
function record(name, expected, actual) {
  assert.deepEqual(actual, expected, name);
  cases.push({ name, expected, actual, result: 'Pass' });
  console.log(`PASS ${name}`);
}

async function request(path, { method = 'GET', body, token, authHeader = token ? `Bearer ${token}` : undefined } = {}) {
  const headers = { apikey: credentials.anonKey, accept: 'application/json' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (authHeader !== undefined) headers.authorization = authHeader;
  const response = await fetch(`${credentials.apiUrl}${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(15_000),
  });
  let payload = null;
  try { payload = await response.json(); } catch { /* status still asserted below */ }
  return { status: response.status, payload };
}

const health = await request('/auth/v1/health');
record('GoTrue health uses the QA API origin', { status: 200, name: 'GoTrue' }, { status: health.status, name: health.payload?.name });

const signup = await request('/auth/v1/signup', {
  method: 'POST',
  body: { data: { display_name: `GM03 QA ${manifest.runId}`, gm03_qa_run: manifest.runId } },
});
assert.equal(signup.status, 200, `guest signup status ${signup.status}`);
assert.equal(signup.payload?.user?.is_anonymous, true);
assert.ok(signup.payload?.user?.id && signup.payload?.access_token && signup.payload?.refresh_token);
const originalId = signup.payload.user.id;
let token = signup.payload.access_token;
const refreshToken = signup.payload.refresh_token;
record('guest signup returns an anonymous identity and session', true, true);

const refresh = await request('/auth/v1/token?grant_type=refresh_token', {
  method: 'POST', body: { refresh_token: refreshToken },
});
assert.equal(refresh.status, 200, `refresh status ${refresh.status}`);
assert.equal(refresh.payload?.user?.id, originalId);
assert.ok(refresh.payload?.access_token && refresh.payload?.refresh_token);
token = refresh.payload.access_token;
record('refresh retains the same guest identity', true, refresh.payload.user.id === originalId);

const current = await request('/auth/v1/user', { token });
record('GoTrue user endpoint accepts the refreshed JWT', { status: 200, sameIdentity: true }, { status: current.status, sameIdentity: current.payload?.id === originalId });

const identity = await request('/rest/v1/rpc/get_my_social_identity', { method: 'POST', body: {}, token });
record('authenticated REST RPC returns caller identity projection', { status: 200, hasCallerProjection: true }, {
  status: identity.status,
  hasCallerProjection: Boolean(typeof identity.payload?.id === 'string' && identity.payload.id
    && typeof identity.payload?.displayName === 'string' && identity.payload.displayName
    && typeof identity.payload?.friendCode === 'string' && identity.payload.friendCode
    && typeof identity.payload?.avatarSeed === 'string' && identity.payload.avatarSeed),
});

const missing = await request('/rest/v1/rpc/get_my_social_identity', { method: 'POST', body: {} });
record('missing JWT is denied at REST boundary', { status: 401 }, { status: missing.status });

const forged = await request('/rest/v1/rpc/get_my_social_identity', { method: 'POST', body: {}, authHeader: 'Bearer forged.gm03.token' });
record('forged JWT is denied at REST boundary', { status: 401 }, { status: forged.status });

const report = {
  result: 'Pass', runId: manifest.runId, sourceRevision: manifest.sourceRevision,
  contractVersion: manifest.contractVersion, schemaVersion: manifest.schemaVersion,
  apiOrigin: manifest.endpoint.baseUrl, identityIdsRecorded: false,
  credentialsRecorded: false, applicationDatabaseChanged: false,
  assertionCount: cases.length, cases, completedAt: new Date().toISOString(),
};
await writeFile(resolve(workdir, 'gm03-auth-rest-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', assertionCount: cases.length, credentialsPrinted: false, identityIdsPrinted: false }));
