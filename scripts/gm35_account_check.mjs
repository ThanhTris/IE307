import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { validateRunId } from './backend-qa.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const runId = validateRunId(process.argv[2]);
execFileSync(process.execPath, [resolve(root, 'scripts/backend-qa.mjs'), 'verify', '--run-id', runId],
  { cwd: root, stdio: 'ignore', timeout: 120_000, windowsHide: true });
const workdir = resolve(root, '.work/qa', runId);
const read = async name => JSON.parse(await readFile(resolve(workdir, name), 'utf8'));
const [state, manifest, credentials] = await Promise.all([read('state.json'), read('manifest.json'), read('credentials.private.json')]);
assert.equal(state.ownerUuid, manifest.ownerUuid);
assert.equal(credentials.apiUrl, `http://127.0.0.1:${state.ports.api}`);
assert.ok(Number.isInteger(state.ports.mail), 'Start QA with --mail-port.');
const mail = `http://127.0.0.1:${state.ports.mail}`;
const suffix = randomUUID().slice(0, 12);
const email = `gm35-${suffix}@example.com`;
const guestEmail = `gm35-guest-${suffix}@example.com`;
const originalPassword = `aA9!${randomUUID()}`;
const changedPassword = `bB8!${randomUUID()}`;
const recoveredPassword = `cC7!${randomUUID()}`;

async function request(path, method, body, bearer) {
  const headers = { apikey: credentials.anonKey, 'Content-Type': 'application/json' };
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  const response = await fetch(`${credentials.apiUrl}${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'error', signal: AbortSignal.timeout(15_000),
  });
  return { status: response.status, value: await response.json().catch(() => undefined) };
}

const auth = (path, method, body, bearer) => request(`/auth/v1/${path}`, method, body, bearer);
const pass = name => console.log(`PASS ${name}`);
function expectStatus(response, status, description) {
  assert.equal(response.status, status, description);
  return response.value;
}

async function mailCode(address, subject) {
  const query = encodeURIComponent(`to:${address} subject:"${subject}"`);
  for (let i = 0; i < 12; i += 1) {
    const response = await fetch(`${mail}/view/latest.html?query=${query}`, { redirect: 'error', signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const code = (await response.text()).match(/<strong>(\d{6})<\/strong>/)?.[1];
      assert.ok(code, 'Mail captured without a six-digit code.');
      return code;
    }
    assert.equal(response.status, 404, 'Mailpit rendered message endpoint.');
    await setTimeout(400);
  }
  throw new Error('Mailpit did not capture the requested message.');
}

const signup = expectStatus(await auth('signup', 'POST', {
  email, password: originalPassword, data: { display_name: 'GM35 QA' },
}), 200, 'Sign-up pending verification');
assert.ok(signup.id && signup.is_anonymous === false && signup.email_confirmed_at == null && !signup.access_token);
const code = await mailCode(email, 'Xác minh email');
const invalid = `${code[0] === '0' ? '1' : '0'}${code.slice(1)}`;
const invalidResult = await auth('verify', 'POST', { email, token: invalid, type: 'signup' });
assert.equal(invalidResult.status, 403);
assert.equal(invalidResult.value?.error_code, 'otp_expired');
const confirmed = expectStatus(await auth('verify', 'POST', { email, token: code, type: 'signup' }), 200, 'Email verification');
assert.ok(confirmed.user?.id === signup.id && confirmed.access_token && confirmed.refresh_token);
pass('Email signup, wrong code and OTP confirmation');

const guest = expectStatus(await auth('signup', 'POST', { data: { display_name: 'GM35 Guest' } }), 200, 'Guest signup');
assert.ok(guest.user?.id && guest.user.is_anonymous === true);
const conflict = await auth('user', 'PUT', { email }, guest.access_token);
assert.equal(conflict.status, 422);
assert.equal(conflict.value?.error_code, 'email_exists');
expectStatus(await auth('user', 'PUT', { email: guestEmail }, guest.access_token), 200, 'Link email request');
const linkCode = await mailCode(guestEmail, 'Liên kết email');
const linked = expectStatus(await auth('verify', 'POST', {
  email: guestEmail, token: linkCode, type: 'email_change',
}), 200, 'Link verification');
assert.ok(linked.user?.id === guest.user.id && linked.user.is_anonymous === false);
expectStatus(await auth('user', 'PUT', { password: originalPassword }, linked.access_token), 200, 'Set linked account password');
pass('Email conflict and guest conversion with unchanged user ID');

expectStatus(await auth('user', 'PUT', { password: changedPassword, current_password: originalPassword }, confirmed.access_token), 200, 'Change password');
const oldPassword = await auth('token?grant_type=password', 'POST', { email, password: originalPassword });
assert.equal(oldPassword.status, 400);
const reauthenticated = expectStatus(await auth('token?grant_type=password', 'POST', { email, password: changedPassword }), 200, 'Sign in after change');
assert.ok(reauthenticated.user?.id === signup.id);
pass('Change password and sign in with the new password');

expectStatus(await auth('recover', 'POST', { email }), 200, 'Send recovery code');
const recoveryCode = await mailCode(email, 'Đặt lại mật khẩu');
const recovery = expectStatus(await auth('verify', 'POST', { email, token: recoveryCode, type: 'recovery' }), 200, 'Verify recovery code');
expectStatus(await auth('user', 'PUT', { password: recoveredPassword }, recovery.access_token), 200, 'Set recovered password');
expectStatus(await auth('logout?scope=local', 'POST', undefined, recovery.access_token), 204, 'Revoke recovery session');
expectStatus(await auth('token?grant_type=password', 'POST', { email, password: recoveredPassword }), 200, 'Sign in after recovery');
pass('Recovery code, password reset and local logout');
