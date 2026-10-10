import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cliArgs, validateApiUrl, validateConfig, parseStatus, checkHealth, redact, main } from '../scripts/backend.mjs';

test('config pins project and ports', async () => {
  const text = await readFile(new URL('../supabase/config.toml', import.meta.url), 'utf8');
  assert.doesNotThrow(() => validateConfig(text));
  assert.throws(() => validateConfig(text.replace('gi-cung-duoc-local', 'other-project')));
  assert.throws(() => validateConfig(text.replace('54321', '9999')));
});
test('local URL guard rejects remote, credentials, paths, redirects and wrong port', () => {
  assert.equal(validateApiUrl('http://127.0.0.1:54321'), 'http://127.0.0.1:54321');
  for (const url of ['https://example.supabase.co', 'http://user:pass@localhost:54321', 'http://localhost:54322', 'http://localhost:54321/path', 'http://localhost:54321?q=1', 'http://127.0.0.1.example.com:54321']) assert.throws(() => validateApiUrl(url));
});
test('commands never target remote or delete backups', () => {
  assert.ok(cliArgs('stop').includes('gi-cung-duoc-local'));
  for (const flag of ['--linked', '--db-url', '--project-ref', '--all', '--no-backup']) assert.throws(() => cliArgs('stop', [flag]));
  assert.throws(() => cliArgs('reset'));
  assert.ok(cliArgs('reset', ['--confirm-local']).includes('--local'));
});
test('status deliberately drops all secrets', () => {
  const state = parseStatus(JSON.stringify({ API_URL: 'http://127.0.0.1:54321', ANON_KEY: 'secret', SERVICE_ROLE_KEY: 'secret', DB_URL: 'postgres://user:password@localhost:54322/postgres' }));
  assert.deepEqual(state, { apiUrl: 'http://127.0.0.1:54321' });
  assert.deepEqual(parseStatus('{"api":{"url":"http://localhost:54321"}}'), { apiUrl: 'http://localhost:54321' });
  assert.throws(() => parseStatus('secret, not JSON'), /suppressed/);
  assert.throws(() => parseStatus('{"API_URL":"https://example.supabase.co"}'));
});
test('health asserts HTTP status and GoTrue body, no redirect following', async () => {
  const result = await checkHealth('http://localhost:54321', async (url, options) => {
    assert.equal(url, 'http://localhost:54321/auth/v1/health');
    assert.equal(options.redirect, 'error');
    return new Response(JSON.stringify({ name: 'GoTrue', version: 'v2.test', description: 'Auth' }), { status: 200 });
  });
  assert.equal(result.status, 200);
  await assert.rejects(checkHealth('http://localhost:54321', async () => new Response('{}', { status: 503 })), /expected HTTP 200/);
  await assert.rejects(checkHealth('http://localhost:54321', async () => new Response('{}')), /body assertion/);
  await assert.rejects(checkHealth('http://localhost:54321', async () => { throw new Error('secret'); }), /connection failed/);
});
test('redaction strips JWT, keys, password and named credential fields', () => {
  const cleaned = redact('eyJabc.def.ghi\nsb_secret_abc\npostgres://postgres:private@localhost:54322/postgres\nANON_KEY: secret\nSERVICE_ROLE_KEY=other-secret');
  assert.ok(!cleaned.includes('private'));
  assert.ok(!cleaned.includes('other-secret'));
  assert.ok(!cleaned.includes('eyJabc'));
  assert.ok(!cleaned.includes('sb_secret_abc'));
});
test('invalid reset rejected before any process', async () => {
  let calls = 0;
  await assert.rejects(main('reset', [], { run: async () => { calls++; } }), /confirm-local/);
  assert.equal(calls, 0);
});
test('missing Docker fails actionable, not success', async () => {
  await assert.rejects(main('status', [], { run: async () => { throw new Error('engine absent'); } }), /Docker engine/);
});
