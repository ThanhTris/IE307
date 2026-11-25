import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProxy, faultReply, matchesRule } from './gm65_fault_proxy.mjs';

const listen = server => new Promise(done => server.listen(0, '127.0.0.1', () => done(server.address().port)));

test('a rule matches only its path and body and never a preflight', () => {
  const rule = { match: '/rpc/dish_session', bodyContains: 'previewJoin', mode: 'malformed' };
  assert.equal(matchesRule(rule, 'POST', '/rest/v1/rpc/dish_session', '{"command":"previewJoin"}'), true);
  assert.equal(matchesRule(rule, 'POST', '/rest/v1/rpc/dish_session', '{"command":"snapshot"}'), false);
  assert.equal(matchesRule(rule, 'OPTIONS', '/rest/v1/rpc/dish_session', 'previewJoin'), false);
  assert.equal(matchesRule({ match: '', mode: 'status' }, 'POST', '/x'), false);
  assert.equal(matchesRule(null, 'POST', '/x'), false);
});

test('code mode answers in the shape the app reads', () => {
  assert.deepEqual(faultReply({ mode: 'code', code: 'ROOM_EXPIRED' }),
    { status: 200, body: { ok: false, error: { messageKey: 'ROOM_EXPIRED' } } });
});

test('a rule limited by times is removed and later requests reach the QA server', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'gm65-proxy-'));
  const rulePath = join(folder, 'rule.json');
  const upstream = createServer((req, res) => res.end('upstream'));
  const proxy = createProxy({ qaPort: await listen(upstream), rulePath });
  const base = `http://127.0.0.1:${await listen(proxy)}`;
  try {
    writeFileSync(rulePath, JSON.stringify({ match: '/signup', mode: 'status', status: 503, times: 1 }));
    assert.equal((await fetch(`${base}/auth/v1/signup`, { method: 'POST' })).status, 503);
    assert.equal(existsSync(rulePath), false);
    assert.equal(await (await fetch(`${base}/auth/v1/signup`, { method: 'POST' })).text(), 'upstream');
  } finally {
    proxy.close(); upstream.close(); rmSync(folder, { recursive: true, force: true });
  }
});
