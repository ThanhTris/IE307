import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const manifest = JSON.parse(readFileSync(process.env.GM03_QA_MANIFEST, 'utf8'));
assert.equal(manifest.format, 'gm03-qa-manifest-v1');
const { endpoint: { baseUrl }, projectId, containerName, workdir, ownerUuid, runId } = manifest;
assert.equal(new URL(baseUrl).hostname, '127.0.0.1');
assert.equal(containerName, 'supabase_db_' + projectId);
assert.match(projectId, /^gm03qa-[a-z0-9-]+$/);
assert.match(runId, /^[a-z0-9-]+$/);
const [container] = JSON.parse(execFileSync('docker', ['inspect', containerName], { encoding: 'utf8' }));
assert.equal(container.Config.Labels['com.supabase.cli.project'], projectId);
assert.equal(resolve(container.Config.Labels['com.supabase.cli.workdir']).toLowerCase(), resolve(workdir).toLowerCase());
function sql(query) {
  return execFileSync('docker', ['exec', containerName, 'psql', '-XqAt', '-U', 'postgres', '-d', 'postgres',
    '-v', 'ON_ERROR_STOP=1', '-c', query], { encoding: 'utf8' }).trim();
}
assert.equal(sql(`select owner_uuid::text from gm03_qa_private.owner_manifest where run_id='${runId}'`), ownerUuid);
const status = JSON.parse(execFileSync(process.execPath, ['node_modules/supabase/dist/supabase.js', 'status',
  '--output', 'json', '--workdir', workdir], { encoding: 'utf8' }));
assert.equal(status.API_URL, baseUrl);
const key = status.ANON_KEY;
const contractVersion = 'dish-session-v4/roadmap-v2/GM-07.B-supplement';

async function http(path, payload, token) {
  const headers = { apikey: key, 'content-type': 'application/json' };
  if (token) headers.authorization = 'Bearer ' + token;
  const response = await fetch(baseUrl + path, { method: 'POST', headers, body: JSON.stringify(payload) });
  const body = await response.json();
  assert.equal(response.status, 200, path + ': ' + (body.error?.messageKey ?? response.status));
  return body;
}

async function guest(name) {
  const body = await http('/auth/v1/signup', { data: { display_name: name, fixtureOnly: true } });
  assert.ok(body.access_token);
  return { token: body.access_token, id: body.user.id, name };
}

async function rpc(user, name, params) {
  const body = await http('/rest/v1/rpc/' + name, params, user.token);
  assert.equal(body.ok, true, name + ': ' + body.error?.messageKey);
  return body.data;
}
const api = (user, command, payload = {}) => rpc(user, 'dish_session', { command, payload: { contractVersion, ...payload } });
const flag = async user => (await api(user, 'getDefaultPreferences')).hasRecentHistory;
const consent = (user, enabled) => rpc(user, 'update_history_consent', { requestId: randomUUID(), scope: 'personal', consent: enabled });
function pass(label, actual, expected) {
  assert.equal(actual, expected, label);
  console.log('PASS', label);
}

const host = await guest('GM46 host');
const member = await guest('GM46 member');
const outsider = await guest('GM46 outsider');
await consent(host, true);
await consent(member, true);

async function finish(choice) {
  const made = await api(host, 'create', { requestId: randomUUID(), displayName: host.name,
    settings: { dishCount: 10, mealSlot: 'lunch', desiredAt: null },
    preferences: { cuisineIds: [], categoryIds: [], temperature: null, flavor: null, budget: null, avoidRecent: false } });
  const { roomId, code } = made;
  const snapshot = user => api(user, 'snapshot', { roomId });
  await api(member, 'join', { requestId: randomUUID(), code, displayName: member.name });
  const joined = await snapshot(member);
  await api(member, 'updatePreferences', { roomId, requestId: randomUUID(), expectedVersion: joined.version, preferences: joined.ownPreferences });
  await api(host, 'start', { roomId, requestId: randomUUID(), expectedVersion: (await snapshot(host)).version });
  const version = s => ({ roomId, requestId: randomUUID(), expectedVersion: s.version, round: s.round, poolVersion: s.poolVersion });
  for (const user of [host, member]) {
    const s = await snapshot(user);
    await api(user, 'submit', { ...version(s), votes: s.pool.map(dish => ({ roundDishId: dish.roundDishId, choice })) });
  }
  for (const user of [host, member]) await api(user, 'waiting', version(await snapshot(user)));
  return (await snapshot(host)).result.status;
}

pass('no saved result', await flag(host), false);
pass('NO_CONSENSUS fixture finalized', await finish('NO'), 'NO_CONSENSUS');
pass('NO_CONSENSUS only', await flag(host), false);
pass('winning fixture finalized', await finish('WANT'), 'DECIDED');
pass('saved winner', await flag(host), true);
pass('independent account', await flag(outsider), false);
pass('baseline omits flag', (await api(host, 'getDefaultPreferences',
  { contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B' })).hasRecentHistory, undefined);

const hostHistory = (await api(host, 'history')).items.find(item => item.scope === 'personal' && item.result.status === 'DECIDED');
await rpc(host, 'delete_history', { requestId: randomUUID(), history_id: hostHistory.historyId });
pass('deleted winner', await flag(host), false);
pass('other account keeps its own winner', await flag(member), true);

const memberHistory = (await api(member, 'history')).items.find(item => item.scope === 'personal' && item.result.status === 'DECIDED');
assert.match(memberHistory.historyId, /^[0-9a-f-]{36}$/);
sql(`begin;
 alter table gm06_canonical.histories disable trigger gm06_canonical_history_frozen;
 update gm06_canonical.histories set expires_at=clock_timestamp()-interval '1 second'
 where history_id='${memberHistory.historyId}';
 alter table gm06_canonical.histories enable trigger gm06_canonical_history_frozen;
 commit;`);
pass('expired winner', await flag(member), false);

pass('new winning fixture finalized', await finish('WANT'), 'DECIDED');
await consent(host, false);
pass('personal consent off', await flag(host), false);
