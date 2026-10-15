/** Local-only GM-16 HTTP/SQL assertions. Credentials remain in process memory. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCommand, validateConfig, validateApiUrl } from './backend.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.some(flag => !['--rate-limit', '--sql'].includes(flag))) throw new Error('Only --rate-limit / --sql supported; local project only');

// Compile the ACTUAL adapter in memory, using already-pinned mobile TypeScript.
const require = createRequire(import.meta.url);
const ts = require(resolve(root, 'mobile/node_modules/typescript'));
require.extensions['.ts'] = (module, filename) => {
  if (!filename.startsWith(resolve(root, 'mobile/src') + sep)) {
    throw new Error('Only mobile source may be loaded by local auth runner');
  }
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  module._compile(source, filename);
};
const { AuthHttpTransport } = require(resolve(root, 'mobile/src/data/auth/transport.ts'));
const cases = [];
async function check(name, work) {
  try { await work(); cases.push({ case: name, result: 'Pass' }); }
  catch { cases.push({ case: name, result: 'Fail' }); throw new Error(`Assertion failed: ${name}; response/credentials suppressed`); }
}
async function sql() {
  const text = readFileSync(resolve(root, 'supabase/tests/auth.sql'), 'utf8');
  const output = await new Promise((accept, reject) => {
    const child = spawn('docker', ['exec', '-i', 'supabase_db_gi-cung-duoc-local', 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-v', 'ON_ERROR_STOP=1', '-At'], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let result = '';
    const timer = setTimeout(() => child.kill(), 30000);
    child.stdout.on('data', chunk => { result += chunk; });
    child.stderr.on('data', () => {}); // Never emit DB setup/error bodies.
    child.on('error', () => { clearTimeout(timer); reject(new Error('Local SQL runner unavailable')); });
    child.on('close', code => { clearTimeout(timer); code === 0 ? accept(result) : reject(new Error('Local SQL failed')); });
    child.stdin.on('error', () => {});
    child.stdin.end(text);
  });
  assert.equal((output.match(/^ok \d+ -/gm) ?? []).length, 7);
  assert.ok(!/^not ok/m.test(output));
}

let stage = 'local setup';
try {
  validateConfig(readFileSync(resolve(root, 'supabase/config.toml'), 'utf8'));
  const status = JSON.parse(await runCommand(process.execPath, [resolve(root, 'node_modules/supabase/dist/supabase.js'), 'status', '--output', 'json', '--workdir', root], { quiet: true, timeoutMs: 15000 }));
  const baseUrl = validateApiUrl(status.API_URL);
  const publicKey = status.ANON_KEY ?? status.PUBLISHABLE_KEY;
  assert.equal(typeof publicKey, 'string');
  const auth = new AuthHttpTransport({ baseUrl, publicKey, timeoutMs: 10000 });
  stage = 'HTTP assertions';
  let session;
  await check('guest creates server identity', async () => {
    session = await auth.createGuest('GM16 synthetic');
    assert.ok(session.user.isGuest && session.user.id && session.refreshToken && session.accessToken);
    assert.ok(Date.parse(session.expiresAt) > Date.now());
  });
  await check('restore same caller', async () => { assert.equal((await auth.verify(session.accessToken)).id, session.user.id); });
  await check('forged JWT rejected', async () => { await assert.rejects(auth.verify('deliberately.invalid.token'), error => error.error?.messageKey === 'AUTH_REQUIRED'); });
  await check('missing JWT rejected over HTTP', async () => {
    const response = await fetch(`${baseUrl}/auth/v1/user`, { headers: { apikey: publicKey }, redirect: 'error', signal: AbortSignal.timeout(10000) });
    assert.ok([401, 403].includes(response.status));
  });
  await check('spoof metadata cannot select caller identity', async () => {
    const response = await fetch(`${baseUrl}/auth/v1/signup`, {
      method: 'POST', headers: { apikey: publicKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { display_name: 'GM16 spoof', userId: session.user.id } }),
      redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.notEqual(body.user.id, session.user.id);
    assert.equal((await auth.verify(body.access_token)).id, body.user.id);
    await auth.logout(body.access_token);
  });
  await check('refresh preserves caller and produces usable session', async () => {
    const next = await auth.refresh(session.refreshToken);
    assert.equal(next.user.id, session.user.id);
    assert.equal((await auth.verify(next.accessToken)).id, session.user.id);
    session = next;
  });
  await check('invalid refresh rejected', async () => { await assert.rejects(auth.refresh('not-a-refresh-token'), error => error.error?.messageKey === 'AUTH_REQUIRED'); });
  await check('logout revokes refresh', async () => {
    await auth.logout(session.accessToken);
    await assert.rejects(auth.refresh(session.refreshToken), error => error.error?.messageKey === 'AUTH_REQUIRED');
  });
  if (args.includes('--rate-limit')) await check('bounded real HTTP429 probe', async () => {
    // Use one rotating, valid refresh-token chain. Malformed tokens are rejected
    // before GoTrue's token-bucket limiter and therefore cannot prove HTTP 429.
    const authEnv = await runCommand('docker', ['inspect', 'supabase_auth_gi-cung-duoc-local', '--format', '{{range .Config.Env}}{{println .}}{{end}}'], { quiet: true, timeoutMs: 10000 });
    assert.match(authEnv, /GOTRUE_RATE_LIMIT_HEADER=X-Forwarded-For/, 'Run scripts/gm16_rate_limit_setup.ps1 before the real local probe');
    const probe = await auth.createGuest('GM16 rate-limit probe');
    let refreshToken = probe.refreshToken;
    let accessToken = probe.accessToken;
    try {
      for (let attempt = 0; attempt < 180; attempt++) {
        const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST', headers: { apikey: publicKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }), redirect: 'error', signal: AbortSignal.timeout(10000),
        });
        if (response.status === 429) return;
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.ok(body.access_token && body.refresh_token);
        accessToken = body.access_token;
        refreshToken = body.refresh_token;
        // The configured limit is a token bucket (150 requests / 5 minutes).
        // A small interval drains the bucket instead of measuring only burst capacity.
        if (attempt < 179) await new Promise(resolveDelay => setTimeout(resolveDelay, 100));
      }
    } finally {
      await auth.logout(accessToken).catch(() => {});
    }
    throw new Error('No429; check local GoTrue effective config');
  });
  else cases.push({ case: 'real HTTP429', result: 'Not run', reason: 'Use --rate-limit on isolated local test environment' });
  if (args.includes('--sql')) await check('auth.sql seven rollback assertions', sql);
  else cases.push({ case: 'auth.sql', result: 'Not run', reason: 'Use --sql with migrated local database' });
  console.log(JSON.stringify({ contract: 'GM-16.1', target: 'loopback local only', cases, limits: ['Synthetic guests retained in local Auth; no admin key used for deletion', 'Native storage and real expiry require separate checks'] }, null, 2));
} catch {
  console.error(JSON.stringify({ contract: 'GM-16.1', stage, cases, result: cases.length ? 'Fail' : 'Not run', reason: 'Local services/tooling or assertion unavailable; raw secrets suppressed' }, null, 2));
  process.exitCode = 1;
}
