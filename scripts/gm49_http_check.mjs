import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
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
const contractVersion = 'dish-session-v4/roadmap-v2/GM-07.B-supplement';
const prefs = { cuisineIds: [], categoryIds: [], temperature: null, flavor: null, budget: null, avoidRecent: false };

async function http(path, { token = undefined, key = status.ANON_KEY, payload = undefined, method = 'POST' } = {}) {
  const headers = { apikey: key, 'content-type': 'application/json' };
  if (token) headers.authorization = 'Bearer ' + token;
  const response = await fetch(baseUrl + path, { method, headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(35000) });
  return { status: response.status, body: await response.json() };
}
async function guest(name) {
  const result = await http('/auth/v1/signup', { payload: { data: { display_name: name, fixtureOnly: true } } });
  assert.equal(result.status, 200, 'Guest signup');
  assert.match(result.body.user.id, /^[0-9a-f-]{36}$/);
  return { token: result.body.access_token, id: result.body.user.id, name };
}
async function rpc(user, name, payload) {
  const { status, body } = await http('/rest/v1/rpc/' + name, { token: user.token, payload });
  assert.equal(status, 200, name + ': ' + body.error?.messageKey);
  assert.equal(body.ok, true, name + ': ' + body.error?.messageKey);
  return body.data;
}
const api = (user, command, payload = {}) => rpc(user, 'dish_session', { command, payload: { contractVersion, ...payload } });
const deletion = (user, requestId, extra = {}) => http('/functions/v1/delete-account', { token: user.token, payload: { requestId, ...extra } });
function check(label, actual, expected) {
  assert.deepEqual(actual, expected, label);
  console.log('PASS', label);
}
async function refused(label, task, status, code) {
  const result = await task;
  check(label, [result.status, result.body.error?.messageKey], [status, code]);
}

const host = await guest('GM49 Host');
const member = await guest('GM49 Member');
const outsider = await guest('GM49 Outsider');
await refused('reject caller-supplied user ID', deletion(outsider, randomUUID(), { userId: member.id }), 400, 'INVALID_INPUT');

for (const user of [host, member]) {
  for (const scope of ['personal', 'group']) await rpc(user, 'update_history_consent', { requestId: randomUUID(), scope, consent: true });
}
const room = await api(host, 'create', { requestId: randomUUID(), displayName: host.name,
  settings: { dishCount: 10, mealSlot: 'lunch', desiredAt: null }, preferences: prefs });
const { roomId, code } = room;
await api(member, 'join', { requestId: randomUUID(), code, displayName: member.name });
const snapshot = user => api(user, 'snapshot', { roomId });
const joined = await snapshot(member);
await api(member, 'updatePreferences', { requestId: randomUUID(), roomId, expectedVersion: joined.version, preferences: joined.ownPreferences });
await refused('host in lobby', deletion(host, randomUUID()), 409, 'ACTIVE_ROOM');
await refused('member in lobby', deletion(member, randomUUID()), 409, 'ACTIVE_ROOM');
await api(host, 'start', { roomId, requestId: randomUUID(), expectedVersion: (await snapshot(host)).version });
await refused('locked member during vote', deletion(member, randomUUID()), 409, 'ACTIVE_ROOM');
const version = s => ({ roomId, requestId: randomUUID(), expectedVersion: s.version, round: s.round, poolVersion: s.poolVersion });
for (const user of [host, member]) {
  const s = await snapshot(user);
  await api(user, 'submit', { ...version(s), votes: s.pool.map(dish => ({ roundDishId: dish.roundDishId, choice: 'WANT' })) });
}
for (const user of [host, member]) await api(user, 'waiting', version(await snapshot(user)));
const before = (await api(host, 'history')).items.find(item => item.scope === 'group');
assert.ok(before?.participants?.some(p => p.displayName === member.name), 'Fixture has a saved group participant name');

const requestId = randomUUID();
const expected = { status: 200, body: { ok: true, data: { requestId, deleted: true } } };
const simultaneous = await Promise.all([deletion(member, requestId), deletion(member, requestId)]);
assert.ok(simultaneous.some(reply => reply.body.data?.deleted === true), 'One concurrent deletion must commit');
check('replay of successful deletion', await deletion(member, requestId), expected);
await refused('other account cannot replay', deletion(outsider, requestId, { userId: member.id }), 400, 'INVALID_INPUT');

check('auth user removed', sql(`select count(*) from auth.users where id='${member.id}'`), '0');
check('profile removed', sql(`select count(*) from public.profiles where user_id='${member.id}'`), '0');
check('personal history removed', sql(`select count(*) from gm06_canonical.histories where owner_user_id='${member.id}'`), '0');
check('terminal operational room removed', sql(`select count(*) from public.rooms where id='${roomId}'`), '0');
const after = (await api(host, 'history')).items.find(item => item.historyId === before.historyId);
check('group result remains', after.result, before.result);
check('deleted display name replaced', after.participants, before.participants.map(p => p.displayName === member.name
  ? { ...p, displayName: 'Thành viên đã xóa' } : p));
check('outsider cannot read group history', (await api(outsider, 'history')).items.length, 0);
const stale = await http('/rest/v1/profiles?select=user_id', { token: member.token, method: 'GET' });
check('old JWT has no RLS access to profiles', stale.body, []);

const fresh = await api(host, 'create', { requestId: randomUUID(), displayName: host.name,
  settings: { dishCount: 10, mealSlot: 'lunch', desiredAt: null }, preferences: prefs });
const pause = milliseconds => new Promise(resolveWait => setTimeout(resolveWait, milliseconds));
async function watch(user) {
  const socket = new WebSocket(baseUrl.replace(/^http/, 'ws') + '/realtime/v1/websocket?apikey='
    + encodeURIComponent(status.ANON_KEY) + '&vsn=1.0.0');
  const events = [];
  let ready = false;
  const topic = 'realtime:gm49-' + randomUUID();
  socket.addEventListener('open', () => socket.send(JSON.stringify({
    topic, event: 'phx_join', ref: '1', payload: { access_token: user.token, config: {
      broadcast: { self: false }, presence: { key: '' }, private: false,
      postgres_changes: [{ event: 'UPDATE', schema: 'public', table: 'room_version_signals', filter: 'room_id=eq.' + fresh.roomId }],
    } },
  })));
  socket.addEventListener('message', message => {
    const payload = JSON.parse(message.data);
    if (payload.event === 'system' && payload.payload?.extension === 'postgres_changes') ready = payload.payload.status === 'ok';
    if (payload.event === 'postgres_changes') events.push(payload.payload.data.record.version);
  });
  for (let attempt = 0; attempt < 100 && !ready; attempt++) await pause(100);
  if (!ready) socket.close();
  return { socket, ready, events };
}
const [live, deleted] = await Promise.all([watch(host), watch(member)]);
try {
  assert.ok(live.ready, 'Surviving user can subscribe');
  const freshSnapshot = await api(host, 'snapshot', { roomId: fresh.roomId });
  const result = await api(host, 'updateSettings', { requestId: randomUUID(), roomId: fresh.roomId,
    expectedVersion: freshSnapshot.version, settings: { ...freshSnapshot.settings, desiredAt: new Date(Date.now() + 600000).toISOString() } });
  for (let attempt = 0; attempt < 100 && !live.events.includes(result.version); attempt++) await pause(100);
  check('surviving JWT receives new room version', live.events.includes(result.version), true);
  await pause(1000);
  check('deleted JWT receives no room version', deleted.events, []);
} finally {
  live.socket.close();
  deleted.socket.close();
}

const revoked = await guest('GM49 revoked');
const session = JSON.parse(Buffer.from(revoked.token.split('.')[1], 'base64url')).session_id;
assert.match(session, /^[0-9a-f-]{36}$/);
sql(`delete from auth.sessions where id='${session}'`);
await refused('unexpired JWT with revoked session', deletion(revoked, randomUUID()), 401, 'AUTH_REQUIRED');

const expired = await guest('GM49 expired JWT');
const signingKey = execFileSync('docker', ['exec', 'supabase_auth_' + projectId,
  'printenv', 'GOTRUE_JWT_SECRET'], { encoding: 'utf8' }).trim();
assert.ok(signingKey.length >= 32);
const [encodedHeader, encodedClaims] = expired.token.split('.');
const claims = JSON.parse(Buffer.from(encodedClaims, 'base64url'));
const expiredClaims = Buffer.from(JSON.stringify({ ...claims, exp: Math.floor(Date.now() / 1000) - 120 })).toString('base64url');
const content = encodedHeader + '.' + expiredClaims;
expired.token = content + '.' + createHmac('sha256', signingKey).update(content).digest('base64url');
await refused('expired JWT', deletion(expired, randomUUID()), 401, 'AUTH_REQUIRED');

const fault = await guest('GM49 rollback');
const retryId = randomUUID();
sql(`create function gm49_private.qa_fail_delete() returns trigger language plpgsql as $$
 begin raise exception 'QA_DELETE_ROLLBACK'; end $$;
 create trigger zz_qa_gm49_rollback before delete on auth.users
 for each row when (old.id='${fault.id}') execute function gm49_private.qa_fail_delete();`);
try {
  await refused('forced database failure is retryable', deletion(fault, retryId), 503, 'DELETE_RETRY');
  check('failed delete rolls back profile cleanup', sql(`select count(*) from public.profiles where user_id='${fault.id}'`), '1');
} finally {
  sql('drop trigger zz_qa_gm49_rollback on auth.users; drop function gm49_private.qa_fail_delete()');
}
check('same request succeeds after failure', (await deletion(fault, retryId)).body.data?.deleted, true);

const admin = { token: status.SERVICE_ROLE_KEY, key: status.SERVICE_ROLE_KEY };
const email = 'gm49-' + randomUUID() + '@example.test';
const password = randomUUID();
const signup = () => http('/auth/v1/admin/users', { ...admin, payload: { email, password, email_confirm: true } });
const first = await signup();
assert.ok(first.status < 300, 'Confirmed email fixture created');
const login = await http('/auth/v1/token?grant_type=password', { payload: { email, password } });
assert.equal(login.status, 200, 'Email login');
const emailDelete = await deletion({ token: login.body.access_token }, randomUUID());
check('email account can delete', emailDelete.body.data?.deleted, true);
const second = await signup();
assert.ok(second.status < 300 && second.body.id !== first.body.id, 'Deleted email can create a new account');
console.log('PASS same email can be registered again');

// Operator path for a deletion request received outside the app (store web form).
const adminCall = (name, payload) => http('/rest/v1/rpc/' + name, { ...admin, payload });
const adminRemove = id => fetch(baseUrl + '/auth/v1/admin/users/' + id, {
  method: 'DELETE', headers: { apikey: admin.key, authorization: 'Bearer ' + admin.token }, signal: AbortSignal.timeout(35000) });
check('operator stage of unknown account is refused', (await adminCall('gm49_admin_prepare_delete', { person: randomUUID() })).body, 'NOT_FOUND');
check('anon cannot stage an operator deletion', (await http('/rest/v1/rpc/gm49_admin_prepare_delete',
  { payload: { person: host.id } })).status >= 400, true);

const webUser = await guest('GM49 web request');
await rpc(webUser, 'update_history_consent', { requestId: randomUUID(), scope: 'personal', consent: true });
const unstaged = await adminRemove(webUser.id);
assert.ok(unstaged.status >= 400, 'Admin API delete without staging must fail');
check('unstaged admin delete leaves the account', sql(`select count(*) from auth.users where id='${webUser.id}'`), '1');
check('operator stage succeeds', (await adminCall('gm49_admin_prepare_delete', { person: webUser.id })).body, 'READY');
check('operator stage is repeatable', (await adminCall('gm49_admin_prepare_delete', { person: webUser.id })).body, 'READY');
const staged = await adminRemove(webUser.id);
assert.ok(staged.status < 300, 'Staged admin delete must succeed');
check('operator delete removes auth user', sql(`select count(*) from auth.users where id='${webUser.id}'`), '0');
check('operator delete removes profile', sql(`select count(*) from public.profiles where user_id='${webUser.id}'`), '0');
check('operator delete removes consent', sql(`select count(*) from public.consents where user_id='${webUser.id}'`), '0');

const busy = await guest('GM49 web busy');
await api(busy, 'create', { requestId: randomUUID(), displayName: busy.name,
  settings: { dishCount: 10, mealSlot: 'lunch', desiredAt: null }, preferences: prefs });
check('operator stage refuses a host in a live room', (await adminCall('gm49_admin_prepare_delete', { person: busy.id })).body, 'ACTIVE_ROOM');
const refusedAdmin = await adminRemove(busy.id);
assert.ok(refusedAdmin.status >= 400, 'Admin delete of an account in a live room must fail');
check('account in a live room is untouched', sql(`select count(*) from public.profiles where user_id='${busy.id}'`), '1');
