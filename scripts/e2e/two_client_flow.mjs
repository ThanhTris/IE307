#!/usr/bin/env node
// Two independent guests play one complete room over REST: create, join, preferences, start, both ballots, both waiting, result.
// Default target is an owned GM-03 QA stack (--qa-manifest). A hosted project (staging) needs --base-url, --publishable-key and
// --allow-remote; it then creates two real guest accounts and one room there. Never prints tokens, ballots or keys.
// Test cases covered: TC-ROOM-001, TC-ROOM-005, TC-VOTE1-010, TC-RES-003, TC-SEC-001 (docs/testing/TEST_CASES.md)
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const argv = process.argv.slice(2);
const option = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const contractVersion = 'dish-session-v4/roadmap-v2/GM-07.B-supplement';
const preferences = { cuisineIds: [], categoryIds: [], temperature: null, flavor: null, budget: null, avoidRecent: false };

function target() {
  const baseOption = option('--base-url');
  if (baseOption) {
    const key = option('--publishable-key');
    assert.ok(key, '--publishable-key is required with --base-url');
    assert.ok(argv.includes('--allow-remote'), 'a remote project needs --allow-remote: this creates two guests and one room there');
    return { base: baseOption.replace(/\/$/, ''), key, label: new URL(baseOption).host, runId: 'remote' };
  }
  const manifestPath = option('--qa-manifest') || process.env.GM03_QA_MANIFEST;
  assert.ok(manifestPath, 'pass --qa-manifest .work/qa/<run-id>/manifest.json (from npm run qa:start)');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.format, 'gm03-qa-manifest-v1', 'not a GM-03 QA manifest');
  const base = manifest.endpoint?.baseUrl;
  assert.equal(new URL(base).hostname, '127.0.0.1', 'the QA API must be on loopback');
  const status = spawnSync(process.execPath, [resolve(root, 'node_modules/supabase/dist/supabase.js'), 'status', '--output', 'json', '--workdir', manifest.workdir],
    { encoding: 'utf8', maxBuffer: 1 << 24 });
  assert.equal(status.status, 0, 'supabase status failed for the QA run');
  const parsed = JSON.parse(status.stdout);
  const key = parsed.ANON_KEY || parsed.PUBLISHABLE_KEY;
  assert.ok(key, 'QA status has no publishable key');
  return { base, key, label: manifest.projectId, runId: manifest.runId };
}

const { base, key, label, runId } = target();
const log = [];
const step = (name, detail = {}) => { log.push({ step: name, ...detail }); console.log('PASS', name); };
const requestId = prefix => `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`;

async function guest(name) {
  const response = await fetch(`${base}/auth/v1/signup`, { method: 'POST', headers: { apikey: key, 'content-type': 'application/json' }, body: JSON.stringify({ data: { display_name: name } }) });
  const body = await response.json();
  assert.equal(response.status, 200, `guest signup failed (${response.status})`);
  assert.ok(body.access_token && body.user?.id, 'signup returned no session');
  return { id: body.user.id, token: body.access_token };
}

async function call(user, command, args = {}) {
  const response = await fetch(`${base}/rest/v1/rpc/dish_session`, {
    method: 'POST', headers: { apikey: key, authorization: `Bearer ${user.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ command, payload: { contractVersion, ...args } }),
  });
  let body = {};
  try { body = await response.json(); } catch { /* keep empty */ }
  return { status: response.status, body };
}

async function api(user, command, args = {}) {
  const { status, body } = await call(user, command, args);
  assert.equal(status, 200, `${command} http ${status} ${body.error?.messageKey ?? ''}`);
  assert.equal(body.ok, true, `${command} rejected: ${body.error?.messageKey ?? 'unknown'}`);
  return body.data;
}

const snapshot = (user, roomId) => api(user, 'snapshot', { roomId });
const versionArgs = (roomId, s) => ({ roomId, expectedVersion: s.version, round: s.round, poolVersion: s.poolVersion });

const host = await guest('E2E host');
const member = await guest('E2E member');
assert.notEqual(host.id, member.id, 'the two clients must be independent guests');
step('two independent guests sign in');

const made = await api(host, 'create', { requestId: requestId('create'), displayName: 'E2E host', settings: { dishCount: 10, mealSlot: 'lunch', desiredAt: null }, preferences });
assert.match(made.code, /^[A-Z2-9]{6}$/, 'room code must be six characters');
step('host creates a lunch room with 10 dishes', { code: '[redacted]' });

const joined = await api(member, 'join', { requestId: requestId('join'), code: made.code, displayName: 'E2E member' });
assert.equal(joined.roomId, made.roomId);
const own = await snapshot(member, made.roomId);
await api(member, 'updatePreferences', { requestId: requestId('prefs'), roomId: made.roomId, expectedVersion: own.version, preferences: own.ownPreferences });
step('member joins by code and saves own preferences');

const lobby = await snapshot(host, made.roomId);
assert.equal(lobby.members.length, 2, 'two members in the lobby');
assert.equal(lobby.pool.length, 10, 'locked pool of exactly 10 dishes');
await api(host, 'start', { requestId: requestId('start'), roomId: made.roomId, expectedVersion: lobby.version });
step('host starts the room (both members ready)');

for (const user of [host, member]) {
  const s = await snapshot(user, made.roomId);
  assert.equal(s.pool.length, 10);
  await api(user, 'submit', { ...versionArgs(made.roomId, s), requestId: requestId('submit'), votes: s.pool.map(d => ({ roundDishId: d.roundDishId, choice: 'WANT' })) });
}
step('both clients submit a complete round-1 ballot');

for (const user of [host, member]) {
  const s = await snapshot(user, made.roomId);
  await api(user, 'waiting', { ...versionArgs(made.roomId, s), requestId: requestId('waiting') });
}
const final = await snapshot(host, made.roomId);
assert.equal(final.result?.status, 'DECIDED', 'unanimous WANT decides in round 1');
assert.equal(final.result?.reasonCode, 'UNANIMOUS_WANT');
assert.equal(final.result?.round, 1);
step('server decides once: DECIDED, round 1, UNANIMOUS_WANT');

const [a, b] = [await api(host, 'result', { roomId: made.roomId }), await api(member, 'result', { roomId: made.roomId })];
assert.deepEqual(a, b, 'both clients read the same persisted result');
assert.ok(a.topDishes?.length >= 1 && a.topDishes.length <= 3, 'Top 3 holds one to three dishes');
step('both clients read the same persisted result', { topDishes: a.topDishes.length });

const outsider = await guest('E2E outsider');
const refused = await call(outsider, 'result', { roomId: made.roomId });
assert.equal(refused.status, 403, 'an outsider must not read the result');
assert.equal(refused.body.ok, false);
assert.equal(refused.body.error?.messageKey, 'NOT_MEMBER');
const peek = await call(outsider, 'snapshot', { roomId: made.roomId });
assert.ok(peek.status !== 200 || peek.body.ok === false, 'an outsider must not read the room snapshot');
step('an outsider is refused the result and the snapshot');

const outDir = resolve(root, '.work/e2e');
mkdirSync(outDir, { recursive: true });
const report = { run: runId, target: label, contractVersion, at: new Date().toISOString(), steps: log.map(s => s.step), result: 'Pass' };
writeFileSync(resolve(outDir, `two-client-${Date.now()}.json`), JSON.stringify(report, null, 2) + '\n');
console.log(`Two-client flow passed on ${label}: ${log.length} steps`);
