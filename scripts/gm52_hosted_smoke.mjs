#!/usr/bin/env node
// GM-52 hosted smoke. Plays real rooms against a Supabase project and checks what only the hosted project can prove:
// the pg_cron tick closes a waiting round with no local worker, Realtime accepts the inbox subscription and
// delete-account removes both guests. It also runs the two-client flow (scripts/e2e/two_client_flow.mjs) first.
//
//   node scripts/gm52_hosted_smoke.mjs --base-url https://<ref>.supabase.co --project-ref <ref> \
//        --publishable-key <key> --allow-remote [--skip-timeout] [--target-env staging|production]
//
// Never prints tokens, ballots or keys. Creates anonymous guests only and deletes every one of them at the end.
// A production run needs --target-env production and creates the same few guests; do it once per release.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const argv = process.argv.slice(2);
const option = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const flag = name => argv.includes(name);
const contractVersion = 'dish-session-v4/roadmap-v2/GM-07.B-supplement';
const preferences = { cuisineIds: [], categoryIds: [], temperature: null, flavor: null, budget: null, avoidRecent: false };

export function parseTarget(args) {
  const read = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const baseUrl = read('--base-url');
  const ref = read('--project-ref');
  const key = read('--publishable-key') ?? process.env.GM52_PUBLISHABLE_KEY;
  assert.ok(baseUrl && ref && key, '--base-url, --project-ref and --publishable-key are required');
  assert.ok(args.includes('--allow-remote'), 'this creates guests and rooms on a remote project: pass --allow-remote');
  const url = new URL(baseUrl);
  assert.equal(url.protocol, 'https:', 'a hosted project must use https');
  assert.equal(url.hostname, `${ref}.supabase.co`, 'the base URL must be exactly <project-ref>.supabase.co');
  assert.ok(!/^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(key) || !/service_role/.test(Buffer.from(key.split('.')[1] ?? '', 'base64url').toString()),
    'refusing a service_role key: pass the publishable key');
  assert.ok(!key.startsWith('sb_secret_'), 'refusing a secret key: pass the publishable key');
  return { base: url.origin, ref, key, env: read('--target-env') ?? 'staging' };
}

async function main() {
  const { base, ref, key, env } = parseTarget(argv);
  const log = [];
  const created = [];
  const step = (name, detail = {}) => { log.push({ step: name, ...detail }); console.log('PASS', name); };
  const requestId = prefix => `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`;

  async function guest(name) {
    const response = await fetch(`${base}/auth/v1/signup`, { method: 'POST', headers: { apikey: key, 'content-type': 'application/json' }, body: JSON.stringify({ data: { display_name: name } }) });
    const body = await response.json();
    assert.equal(response.status, 200, `guest signup failed (${response.status}): check anonymous sign-ins in the dashboard`);
    const user = { id: body.user.id, token: body.access_token };
    created.push(user);
    return user;
  }
  async function call(user, command, args = {}) {
    const response = await fetch(`${base}/rest/v1/rpc/dish_session`, {
      method: 'POST', headers: { apikey: key, authorization: `Bearer ${user.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ command, payload: { contractVersion, ...args } }), signal: AbortSignal.timeout(35_000),
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
  async function deleteAccount(user, id) {
    return fetch(`${base}/functions/v1/delete-account`, {
      method: 'POST', headers: { apikey: key, authorization: `Bearer ${user.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ requestId: id }), signal: AbortSignal.timeout(35_000),
    }).then(async r => ({ status: r.status, body: await r.json().catch(() => ({})) }));
  }
  const snapshot = (user, roomId) => api(user, 'snapshot', { roomId });
  const versionArgs = (roomId, s) => ({ roomId, expectedVersion: s.version, round: s.round, poolVersion: s.poolVersion });

  try {
    // 0. Project is reachable and Auth allows anonymous sign-ins.
    const health = await fetch(`${base}/auth/v1/health`, { headers: { apikey: key } });
    assert.equal(health.status, 200, 'Auth health');
    step('project reachable', { env, ref });

    // 1. Full two-client flow from the existing script (own guests; it never touches another project).
    const e2e = spawnSync(process.execPath, [resolve(root, 'scripts/e2e/two_client_flow.mjs'), '--base-url', base, '--publishable-key', key, '--allow-remote', '--delete-guests'], { encoding: 'utf8', timeout: 180_000 });
    assert.equal(e2e.status, 0, `two-client flow failed:\n${(e2e.stdout + e2e.stderr).split('\n').filter(l => !l.includes(key)).slice(-8).join('\n')}`);
    step('two-client flow: create, join, both ballots, result, outsider refused');

    // 2. Realtime accepts the inbox subscription for a guest.
    const watcher = await guest('GM52 realtime');
    await new Promise((resolveJoin, rejectJoin) => {
      const url = `${base.replace(/^http/, 'ws')}/realtime/v1/websocket?apikey=${encodeURIComponent(key)}&vsn=1.0.0`;
      const socket = new WebSocket(url);
      const timer = setTimeout(() => { socket.close(); rejectJoin(new Error('Realtime join timed out: enable Realtime for the project')); }, 15_000);
      socket.onopen = () => socket.send(JSON.stringify({
        topic: `realtime:inbox:${watcher.id}`, event: 'phx_join', ref: '1', join_ref: '1',
        payload: { config: { broadcast: { self: false }, presence: { key: '' }, private: false,
          postgres_changes: [{ event: 'INSERT', schema: 'public', table: 'inbox', filter: `owner_user_id=eq.${watcher.id}` }] }, access_token: watcher.token },
      }));
      socket.onmessage = event => {
        const message = JSON.parse(String(event.data));
        if (message.event !== 'phx_reply') return;
        clearTimeout(timer); socket.close();
        if (message.payload?.status === 'ok') resolveJoin(); else rejectJoin(new Error('Realtime refused the inbox subscription'));
      };
      socket.onerror = () => { clearTimeout(timer); rejectJoin(new Error('Realtime socket error')); };
    });
    step('Realtime accepts the inbox subscription');

    // 3. pg_cron closes a waiting round after 60 seconds with no worker (room of two, one ballot in).
    if (!flag('--skip-timeout')) {
      const host = await guest('GM52 host');
      const member = await guest('GM52 member');
      const made = await api(host, 'create', { requestId: requestId('create'), displayName: 'GM52 host', settings: { dishCount: 10, mealSlot: 'lunch', desiredAt: null }, preferences });
      await api(member, 'join', { requestId: requestId('join'), code: made.code, displayName: 'GM52 member' });
      const own = await snapshot(member, made.roomId);
      await api(member, 'updatePreferences', { requestId: requestId('prefs'), roomId: made.roomId, expectedVersion: own.version, preferences: own.ownPreferences });
      const lobby = await snapshot(host, made.roomId);
      await api(host, 'start', { requestId: requestId('start'), roomId: made.roomId, expectedVersion: lobby.version });
      const s = await snapshot(host, made.roomId);
      const submitId = requestId('submit');
      const submit = { ...versionArgs(made.roomId, s), requestId: submitId, votes: s.pool.map(d => ({ roundDishId: d.roundDishId, choice: 'WANT' })) };
      await api(host, 'submit', submit);
      const afterSubmit = await snapshot(host, made.roomId);
      await api(host, 'waiting', { ...versionArgs(made.roomId, afterSubmit), requestId: requestId('waiting') });
      step('host ACKs a ballot and enters waiting; the member has not voted');

      const deadline = Date.now() + 150_000;
      let closed;
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 5_000));
        const now = await snapshot(host, made.roomId);
        if (now.result || now.round === 2) { closed = now; break; }
      }
      assert.ok(closed, 'the round did not close within 150 seconds: check the ie307-gm48-tick job and Supabase Cron');
      assert.equal(closed.members.length, 2, 'the roster keeps both members after a timeout');
      step('the cron tick closed the round with the member missing; roster still has two');
      const replay = await call(host, 'submit', submit);
      assert.equal(replay.status, 200, 'the original ballot ACK replays after the round moved on');
      step('the original submit request replays its ACK');
    }

    // 4. delete-account removes every guest this run created; replay of the same request is an ACK; the token is then dead.
    for (const user of created) {
      const id = randomUUID();
      const done = await deleteAccount(user, id);
      assert.equal(done.status, 200, `delete-account http ${done.status} ${done.body?.error?.messageKey ?? ''}`);
      assert.equal(done.body?.data?.deleted, true);
      const again = await deleteAccount(user, id);
      assert.equal(again.status, 200, 'replay of the same delete request is acknowledged');
    }
    step('delete-account removed every guest created here and acknowledged the replay', { guests: created.length });
    const dead = await fetch(`${base}/auth/v1/user`, { headers: { apikey: key, authorization: `Bearer ${created[0].token}` } });
    assert.ok(dead.status === 401 || dead.status === 403 || dead.status === 404, 'a deleted account token must stop working');
    created.length = 0;
    step('a deleted account token no longer authenticates');

    const outDir = resolve(root, '.work/gm52');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(resolve(outDir, `smoke-${env}-${Date.now()}.json`), JSON.stringify({ target: ref, env, contractVersion, at: new Date().toISOString(), steps: log.map(s => s.step), result: 'Pass' }, null, 2) + '\n');
    console.log(`GM-52 hosted smoke passed on ${env} (${ref}): ${log.length} steps`);
  } finally {
    // Best effort cleanup if a step failed before the deletion step.
    for (const user of created) { try { await deleteAccount(user, randomUUID()); } catch { /* reported by the failing step */ } }
  }
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('gm52_hosted_smoke.mjs')) {
  main().catch(error => { console.error('FAIL', error.message); process.exit(1); });
}
