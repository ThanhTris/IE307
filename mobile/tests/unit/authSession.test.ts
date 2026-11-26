import { SessionManager } from '../../src/data/auth/session';
import { AuthFailure, type AuthPort, type SessionStorage, type StoredSession } from '../../src/data/auth/types';
import { createSecureSessionStorage } from '../../src/data/auth/storage';
import { ApiClientImpl } from '../../src/data/api/client';
import { createAccountService } from '../../src/data/auth/account';
import { LiveRoomRepository } from '../../src/features/rooms/services/roomRepository';

jest.mock('expo-secure-store', () => ({ WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only' }));

const now = Date.parse('2026-10-11T10:00:00Z');
const user = { id: '00000000-0000-4000-8000-000000000001', displayName: 'Trí', isGuest: true, createdAt: '2026-10-11T09:00:00Z' };
const initial: StoredSession = { accessToken: 'fixture-access', refreshToken: 'fixture-refresh', expiresAt: new Date(now + 3600000).toISOString(), user };
function setup(saved: StoredSession | null = null, onAccountSessionChange?: (user: StoredSession['user'] | null) => void) {
  let record = saved ? structuredClone(saved) : null;
  const storage = {
    load: jest.fn(async () => record ? structuredClone(record) : null),
    save: jest.fn(async (session: StoredSession) => { record = structuredClone(session); }),
    clear: jest.fn(async () => { record = null; }),
  } satisfies SessionStorage;
  const auth = {
    createGuest: jest.fn(async () => structuredClone(initial)),
    verify: jest.fn(async () => ({ ...user })),
    refresh: jest.fn(async () => ({ ...structuredClone(initial), accessToken: 'fixture-rotated', refreshToken: 'fixture-rotated-refresh' })),
    logout: jest.fn(async () => undefined),
  } satisfies AuthPort;
  const clearPrivateData = jest.fn(async () => undefined);
  const onTokenChange = jest.fn();
  const sleep = jest.fn(async (_ms: number) => undefined);
  const session = new SessionManager({ auth, storage, clearPrivateData, onTokenChange, onAccountSessionChange, sleep, now: () => now, random: () => 0 });
  return { session, auth, storage, clearPrivateData, onTokenChange, sleep };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(accept => { resolve = accept; });
  return { promise, resolve };
}

const accountSession = { ...initial, accessToken: 'fixture-email-access', user: { ...user, isGuest: false } };

function accountSetup(onAccountSessionChange?: (user: StoredSession['user'] | null) => void) {
  const s = setup(initial, onAccountSessionChange);
  const transport = {
    signIn: jest.fn(async () => accountSession),
    signUp: jest.fn(async () => undefined),
    sendCode: jest.fn(async () => undefined),
    verifyCode: jest.fn(async () => accountSession),
    linkEmail: jest.fn(async () => user),
    accountProfile: jest.fn(async () => ({ user: accountSession.user, email: 'tester@example.test' })),
    saveProfile: jest.fn(async () => accountSession.user),
    updatePassword: jest.fn(async () => accountSession.user),
    logout: s.auth.logout,
  };
  return { ...s, transport, account: createAccountService(transport, s.session) };
}

test('consent started while guest cleanup is paused never uses the incoming account token', async () => {
  const s = accountSetup(next => repository.publishAccountSession(next));
  const invoke = jest.fn().mockResolvedValue({ ok: true });
  const client = new ApiClientImpl({ authSession: s.session, transport: { invoke } });
  const repository = new LiveRoomRepository({ client, session: s.session, sessionStorage: s.storage });
  await repository.restoreSession();

  const cleanupStarted = deferred<void>();
  const cleanup = deferred<undefined>();
  s.clearPrivateData.mockImplementationOnce(() => { cleanupStarted.resolve(); return cleanup.promise; });
  const member = { ...accountSession, user: { ...accountSession.user, id: '00000000-0000-4000-8000-000000000002' } };
  s.transport.signIn.mockResolvedValueOnce(member);
  const switching = s.account.signIn({ email: 'tester@example.test', password: 'Fixture!123' });
  await cleanupStarted.promise;
  expect(repository.getCurrentUser()).toEqual(user);
  const stale = repository.updateHistoryConsent('personal', true, 'old-consent');
  expect(invoke).not.toHaveBeenCalled();
  cleanup.resolve(undefined);

  expect(await switching).toMatchObject({ ok: true });
  expect(await stale).toMatchObject({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });
  expect(repository.getCurrentUser()).toEqual(member.user);
  expect(invoke).not.toHaveBeenCalled();
  expect(await repository.updateHistoryConsent('personal', true, 'new-consent')).toMatchObject({ ok: true });
  expect(invoke).toHaveBeenCalledTimes(1);
  expect(invoke).toHaveBeenCalledWith('update_history_consent', expect.objectContaining({ requestId: 'new-consent' }),
    expect.objectContaining({ token: member.accessToken }));
});

test('email linking preserves guest UUID and advances the identity epoch', async () => {
  const s = accountSetup();
  await s.session.restoreSession();
  const before = s.session.getGeneration();
  const proof = new AbortController().signal;
  expect(await s.account.linkEmail('tester@example.test')).toMatchObject({ ok: true });
  expect(s.transport.linkEmail).toHaveBeenCalledWith(initial.accessToken, 'tester@example.test');
  expect(await s.storage.load()).toMatchObject({ user });
  expect(await s.account.verifyCode('tester@example.test', '012345', 'email_change', proof)).toMatchObject({ ok: true });
  expect(s.session.getGeneration()).toBeGreaterThan(before);
  expect(s.clearPrivateData).not.toHaveBeenCalled();
  expect(await s.storage.load()).toMatchObject({ user: { id: user.id, isGuest: false } });
  expect(await s.account.setPassword('Fixture!123', proof)).toMatchObject({ ok: true });
});

test('discarding a link password proof keeps the linked account session', async () => {
  const s = accountSetup();
  await s.session.restoreSession();
  const controller = new AbortController();
  expect(await s.account.verifyCode('tester@example.test', '012345', 'email_change', controller.signal)).toMatchObject({ ok: true });

  controller.abort();
  s.account.discardPasswordProof(controller.signal);
  expect(await s.storage.load()).toEqual(accountSession);
  expect(s.transport.logout).not.toHaveBeenCalled();
  expect(s.transport.updatePassword).not.toHaveBeenCalled();
});

test('account recovery only sends to the authenticated account email', async () => {
  const s = accountSetup();
  await s.session.restoreSession();
  expect(await s.account.sendAccountRecoveryCode('tester@example.test')).toMatchObject({ ok: false });
  expect(s.transport.sendCode).not.toHaveBeenCalled();
  expect(await s.account.signIn({ email: 'tester@example.test', password: 'Fixture!123' })).toMatchObject({ ok: true });
  expect(await s.account.sendAccountRecoveryCode('different@example.test')).toMatchObject({
    ok: false, error: { details: { reason: 'recovery_email_mismatch' } },
  });
  expect(s.transport.sendCode).not.toHaveBeenCalled();
  expect(await s.account.sendAccountRecoveryCode(' Tester@EXAMPLE.TEST ')).toMatchObject({ ok: true });
  expect(s.transport.sendCode).toHaveBeenCalledTimes(1);
  expect(s.transport.sendCode).toHaveBeenCalledWith('tester@example.test', 'recovery');
});

test('link mismatch never adopts another user and logout supersedes an in-flight sign-in', async () => {
  const s = accountSetup();
  await s.session.restoreSession();
  s.transport.verifyCode.mockResolvedValueOnce({ ...accountSession, user: { ...accountSession.user, id: 'foreign-user' } });
  expect(await s.account.verifyCode('tester@example.test', '012345', 'email_change', new AbortController().signal))
    .toMatchObject({ ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } });
  expect(await s.storage.load()).toMatchObject({ user });
  const started = deferred<void>();
  const signInResponse = deferred<StoredSession>();
  s.transport.signIn.mockImplementationOnce(() => { started.resolve(); return signInResponse.promise; });
  const signIn = s.account.signIn({ email: 'tester@example.test', password: 'Fixture!123' });
  await started.promise;
  const logout = s.session.logout();
  signInResponse.resolve(accountSession);
  expect(await signIn).toMatchObject({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });
  await logout;
  expect(await s.storage.load()).toBeNull();
});

test('recovery token only authorizes a password change and never replaces the guest session', async () => {
  const s = accountSetup();
  await s.session.restoreSession();
  const signal = new AbortController().signal;
  await s.account.verifyCode('tester@example.test', '012345', 'recovery', signal);
  expect(await s.account.setPassword('Fixture!123', new AbortController().signal)).toMatchObject({ ok: false });
  expect(await s.account.setPassword('Fixture!123', signal)).toMatchObject({ ok: true });
  expect(s.transport.updatePassword).toHaveBeenCalledWith(accountSession.accessToken, 'Fixture!123');
  expect(s.transport.logout).toHaveBeenCalledWith(accountSession.accessToken);
  expect(await s.storage.load()).toEqual(initial);
});

test('password change checks credentials before comparing the proposed password', async () => {
  const s = accountSetup();
  await s.session.restoreSession();
  const email = 'tester@example.test';
  const correct = '12345678';
  const wrong = '01234567';
  await s.account.signIn({ email, password: correct });

  s.transport.signIn.mockRejectedValueOnce(new AuthFailure({ messageKey: 'INVALID_INPUT', details: { reason: 'invalid_credentials' } }));
  await expect(s.account.changePassword(wrong, wrong)).resolves.toMatchObject({
    ok: false, error: { details: { reason: 'invalid_credentials' } },
  });
  await expect(s.account.changePassword(correct, correct)).resolves.toMatchObject({
    ok: false, error: { details: { reason: 'same_password' } },
  });
  expect(s.transport.updatePassword).not.toHaveBeenCalled();

  await expect(s.account.changePassword(correct, wrong)).resolves.toMatchObject({ ok: true });
  expect(s.transport.updatePassword).toHaveBeenCalledWith(accountSession.accessToken, wrong, correct);
});

test('guest is persisted before becoming active; returned user cannot mutate stored identity', async () => {
  const s = setup();
  const result = await s.session.createGuestSession({ displayName: ' Trí ', requestId: 'fixture-request' });
  expect(result.ok).toBe(true);
  expect(s.auth.createGuest).toHaveBeenCalledWith('Trí');
  expect(s.storage.save.mock.invocationCallOrder[0]).toBeLessThan(s.onTokenChange.mock.invocationCallOrder[0]!);
  if (result.ok) result.data.user.id = 'forged';
  expect(await s.session.restoreSession()).toEqual({ ok: true, data: user });
});

test.each(['', '   ', 'x'.repeat(25), '\u0000name', 'name\n'])('invalid name %j never reaches signup', async displayName => {
  const s = setup();
  expect(await s.session.createGuestSession({ displayName })).toMatchObject({ ok: false, error: { messageKey: 'INVALID_INPUT' } });
  expect(s.auth.createGuest).not.toHaveBeenCalled();
});

test('existing secure session prevents silently creating a second guest', async () => {
  const s = setup(initial);
  expect((await s.session.createGuestSession({ displayName: 'B' })).ok).toBe(false);
  expect(s.auth.createGuest).not.toHaveBeenCalled();
});

test('restart restores the same caller after server verification', async () => {
  const s = setup(initial);
  expect(await s.session.restoreSession()).toEqual({ ok: true, data: user });
  expect(s.auth.verify).toHaveBeenCalledWith(initial.accessToken);
  expect(s.auth.createGuest).not.toHaveBeenCalled();
});

test('empty storage is rejected by the auth manager and clears stale private cache', async () => {
  const s = setup();
  expect(await s.session.restoreSession()).toMatchObject({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });
  expect(s.clearPrivateData).toHaveBeenCalledTimes(1);
  expect(s.session.getStatus()).toBe('lost');
  expect(s.storage.clear).toHaveBeenCalledTimes(1);
  expect(s.auth.createGuest).not.toHaveBeenCalled();
});

test('concurrent token requests refresh once and share rotated token', async () => {
  const s = setup({ ...initial, expiresAt: new Date(now - 1000).toISOString() });
  const result = await Promise.all(Array.from({ length: 8 }, () => s.session.getAccessToken()));
  expect(result).toEqual(Array.from({ length: 8 }, () => ({ ok: true, data: 'fixture-rotated' })));
  expect(s.auth.refresh).toHaveBeenCalledTimes(1);
  expect(s.storage.save).toHaveBeenCalledWith(expect.objectContaining({ refreshToken: 'fixture-rotated-refresh' }));
});

test('server rejects access token -> refresh same identity then verify', async () => {
  const s = setup(initial);
  s.auth.verify.mockRejectedValueOnce(new AuthFailure({ messageKey: 'AUTH_REQUIRED' }));
  expect((await s.session.restoreSession()).ok).toBe(true);
  expect(s.auth.refresh).toHaveBeenCalledTimes(1);
  expect(s.auth.verify).toHaveBeenLastCalledWith('fixture-rotated');
});

test('foreign token argument does not destroy legitimate persisted session', async () => {
  const s = setup(initial);
  expect(await s.session.restoreSession('B-token')).toMatchObject({ ok: false, error: { messageKey: 'INVALID_INPUT' } });
  expect(s.storage.clear).not.toHaveBeenCalled();
  expect((await s.session.restoreSession()).ok).toBe(true);
});

test.each(['verify', 'refresh'] as const)('identity change returned by %s clears private data', async method => {
  const s = setup(method === 'refresh' ? { ...initial, expiresAt: new Date(now - 1).toISOString() } : initial);
  if (method === 'verify') s.auth.verify.mockResolvedValueOnce({ ...user, id: 'B' });
  else s.auth.refresh.mockResolvedValueOnce({ ...initial, user: { ...user, id: 'B' } });
  expect(await s.session.restoreSession()).toMatchObject({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });
  expect(s.storage.clear).toHaveBeenCalled();
  expect(s.clearPrivateData).toHaveBeenCalled();
});

test('revoked refresh loses session, clears storage and private cache', async () => {
  const s = setup({ ...initial, expiresAt: new Date(now - 1).toISOString() });
  s.auth.refresh.mockRejectedValueOnce(new AuthFailure({ messageKey: 'AUTH_REQUIRED' }));
  expect((await s.session.restoreSession()).ok).toBe(false);
  expect(s.storage.clear).toHaveBeenCalled();
  expect(s.clearPrivateData).toHaveBeenCalled();
});

test.each(['NETWORK_ERROR', 'TIMEOUT'] as const)('refresh %s preserves credentials and never blind retries rotation', async messageKey => {
  const s = setup({ ...initial, expiresAt: new Date(now - 1).toISOString() });
  s.auth.refresh.mockRejectedValueOnce(new AuthFailure({ messageKey }));
  expect(await s.session.getAccessToken()).toMatchObject({ ok: false, error: { messageKey } });
  expect(s.auth.refresh).toHaveBeenCalledTimes(1);
  expect(s.storage.clear).not.toHaveBeenCalled();
});

test('read verification transient retry is bounded; secrets never enter public errors', async () => {
  const s = setup(initial);
  s.auth.verify.mockRejectedValue(new AuthFailure({ messageKey: 'NETWORK_ERROR', message: 'fixture-sensitive' }));
  expect(await s.session.restoreSession()).toEqual({ ok: false, error: { messageKey: 'NETWORK_ERROR' } });
  expect(s.auth.verify).toHaveBeenCalledTimes(3);
  expect(s.sleep.mock.calls.map(call => call[0])).toEqual([250, 500]);
  expect(s.storage.clear).not.toHaveBeenCalled();
});

test.each([1000, 10000])('rate limit Retry-After %i is respected without infinite retry', async retryAfter => {
  const s = setup(initial);
  s.auth.verify.mockRejectedValue(new AuthFailure({ messageKey: 'RATE_LIMITED' }, retryAfter));
  expect(await s.session.restoreSession()).toMatchObject({ ok: false, error: { messageKey: 'RATE_LIMITED' } });
  expect(s.auth.verify).toHaveBeenCalledTimes(retryAfter > 5000 ? 1 : 3);
  if (retryAfter <= 5000) expect(s.sleep).toHaveBeenCalledWith(retryAfter);
});

test.each(['NETWORK_ERROR', 'TIMEOUT'] as const)('signup %s requires explicit logout before another attempt', async messageKey => {
  const s = setup();
  s.auth.createGuest.mockRejectedValueOnce(new AuthFailure({ messageKey }));
  expect((await s.session.createGuestSession({ displayName: 'A' })).ok).toBe(false);
  expect(s.session.getStatus()).toBe('blocked');
  expect((await s.session.createGuestSession({ displayName: 'B' })).ok).toBe(false);
  expect(s.auth.createGuest).toHaveBeenCalledTimes(1);
  await s.session.logout();
  expect((await s.session.createGuestSession({ displayName: 'B' })).ok).toBe(true);
});

test('logout clears locally even when remote revoke is offline', async () => {
  const s = setup(initial);
  await s.session.restoreSession();
  s.auth.logout.mockRejectedValueOnce(new AuthFailure({ messageKey: 'NETWORK_ERROR' }));
  expect(await s.session.logout()).toMatchObject({ ok: false, error: { messageKey: 'NETWORK_ERROR' } });
  expect(s.storage.clear).toHaveBeenCalled();
  expect(s.clearPrivateData).toHaveBeenCalled();
  expect(s.onTokenChange).toHaveBeenLastCalledWith(null);
  expect(s.session.getStatus()).toBe('empty');
});

test.each(['cache', 'storage'])('logout %s cleanup failure blocks identity switch until cleanup succeeds', async part => {
  const s = setup(initial);
  await s.session.restoreSession();
  if (part === 'cache') s.clearPrivateData.mockRejectedValueOnce(new Error('fixture-private'));
  else s.storage.clear.mockRejectedValueOnce(new Error('fixture-private'));
  expect((await s.session.logout()).ok).toBe(false);
  expect(s.session.getStatus()).toBe('blocked');
  expect((await s.session.createGuestSession({ displayName: 'B' })).ok).toBe(false);
  expect((await s.session.logout()).ok).toBe(true);
  expect((await s.session.createGuestSession({ displayName: 'B' })).ok).toBe(true);
});

test('secure storage write failure cannot leave a guest active', async () => {
  const s = setup();
  s.storage.save.mockRejectedValueOnce(new Error('fixture-token-in-error'));
  expect(await s.session.createGuestSession({ displayName: 'A' })).toMatchObject({ ok: false, error: { messageKey: 'UNKNOWN_ERROR' } });
  expect(s.onTokenChange).not.toHaveBeenCalledWith(initial.accessToken);
  expect(s.storage.clear).toHaveBeenCalled();
});

test('observer failure cannot prevent logout storage and private-cache cleanup', async () => {
  const s = setup(initial);
  await s.session.restoreSession();
  s.onTokenChange.mockImplementation(() => { throw new Error('observer unavailable'); });
  expect((await s.session.logout()).ok).toBe(true);
  expect(s.storage.clear).toHaveBeenCalled();
  expect(s.clearPrivateData).toHaveBeenCalled();
  expect(s.session.getStatus()).toBe('empty');
});

test('logout during pending refresh cannot resurrect credentials', async () => {
  const s = setup({ ...initial, expiresAt: new Date(now - 1).toISOString() });
  const gate = deferred<StoredSession>();
  s.auth.refresh.mockReturnValueOnce(gate.promise);
  const restore = s.session.restoreSession();
  await new Promise(resolve => setTimeout(resolve, 0));
  const logout = s.session.logout();
  gate.resolve(initial);
  expect((await restore).ok).toBe(false);
  expect((await logout).ok).toBe(true);
  expect(s.storage.save).not.toHaveBeenCalled();
  expect(s.session.getStatus()).toBe('empty');
});

test('business response received after logout is rejected before exposure to caller', async () => {
  const s = setup(initial);
  await s.session.restoreSession();
  const gate = deferred<unknown>();
  const invoke = jest.fn().mockReturnValue(gate.promise);
  const client = new ApiClientImpl({ authSession: s.session, transport: { invoke } });
  const read = client.listFriends();
  await new Promise(resolve => setTimeout(resolve, 0));
  await s.session.logout();
  gate.resolve([]);
  expect(await read).toMatchObject({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });
});

test('managed API auth bypasses scaffold RPC and business caller uses fresh token', async () => {
  const s = setup();
  const invoke = jest.fn().mockResolvedValue([]);
  const client = new ApiClientImpl({ authSession: s.session, transport: { invoke } });
  expect((await client.createGuestSession({ displayName: 'A' })).ok).toBe(true);
  expect(invoke).not.toHaveBeenCalled();
  expect((await client.listFriends()).ok).toBe(true);
  expect(invoke.mock.calls[0]?.[2]).toMatchObject({ token: initial.accessToken });
});

test('server-detected auth loss also drops an already-running business response', async () => {
  const s = setup(initial);
  await s.session.restoreSession();
  const gate = deferred<unknown>();
  const client = new ApiClientImpl({ authSession: s.session, transport: { invoke: jest.fn().mockReturnValue(gate.promise) } });
  const read = client.listFriends();
  await new Promise(resolve => setTimeout(resolve, 0));
  s.auth.verify.mockRejectedValueOnce(new AuthFailure({ messageKey: 'AUTH_REQUIRED' }));
  s.auth.refresh.mockRejectedValueOnce(new AuthFailure({ messageKey: 'AUTH_REQUIRED' }));
  expect((await s.session.restoreSession()).ok).toBe(false);
  gate.resolve([]);
  expect(await read).toMatchObject({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });
});

test('refresh rotation storage failure blocks token use until explicit cleanup', async () => {
  const s = setup({ ...initial, expiresAt: new Date(now - 1).toISOString() });
  s.storage.save.mockRejectedValueOnce(new Error('native storage unavailable'));
  expect((await s.session.getAccessToken()).ok).toBe(false);
  expect(s.session.getStatus()).toBe('blocked');
  expect((await s.session.getAccessToken()).ok).toBe(false);
  expect((await s.session.logout()).ok).toBe(true);
});

test('explicit refresh rotates credentials while preserving the same guest identity', async () => {
  const s = setup(initial);
  expect((await s.session.restoreSession()).ok).toBe(true);
  const refreshed = await s.session.refreshSession();
  expect(refreshed).toMatchObject({ ok: true, data: user });
  expect(s.auth.refresh).toHaveBeenCalledWith(initial.refreshToken);
  expect(s.storage.save).toHaveBeenLastCalledWith(expect.objectContaining({
    accessToken: 'fixture-rotated', refreshToken: 'fixture-rotated-refresh', user,
  }));
  expect(s.session.getStatus()).toBe('active');
});

test('secure storage uses one device-only entry, rejects corruption, deletes exactly that key', async () => {
  let raw: string | null = null;
  const port = {
    getItemAsync: jest.fn(async () => raw),
    setItemAsync: jest.fn(async (_key: string, value: string) => { raw = value; }),
    deleteItemAsync: jest.fn(async () => { raw = null; }),
  };
  const storage = createSecureSessionStorage(port);
  await storage.save(initial);
  expect(port.setItemAsync).toHaveBeenCalledWith('gcd.auth.gm16.v1', expect.any(String), { keychainAccessible: 'device-only' });
  expect(await storage.load()).toEqual(initial);
  raw = '{corrupt';
  await expect(storage.load()).rejects.toThrow('AUTH_REQUIRED');
  await storage.clear();
  expect(await storage.load()).toBeNull();
});
