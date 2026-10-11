import { SessionManager } from '../../src/data/auth/session';
import { AuthFailure, type AuthPort, type SessionStorage, type StoredSession } from '../../src/data/auth/types';
import { createSecureSessionStorage } from '../../src/data/auth/storage';
import { ApiClientImpl } from '../../src/data/api/client';

jest.mock('expo-secure-store', () => ({ WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only' }));

const now = Date.parse('2026-10-11T10:00:00Z');
const user = { id: '00000000-0000-4000-8000-000000000001', displayName: 'Trí', isGuest: true, createdAt: '2026-10-11T09:00:00Z' };
const initial: StoredSession = { accessToken: 'fixture-access', refreshToken: 'fixture-refresh', expiresAt: new Date(now + 3600000).toISOString(), user };
function setup(saved: StoredSession | null = null) {
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
  const session = new SessionManager({ auth, storage, clearPrivateData, onTokenChange, sleep, now: () => now, random: () => 0 });
  return { session, auth, storage, clearPrivateData, onTokenChange, sleep };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(accept => { resolve = accept; });
  return { promise, resolve };
}

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

test('empty storage clears stale private cache; no automatic signup', async () => {
  const s = setup();
  expect(await s.session.restoreSession()).toMatchObject({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });
  expect(s.clearPrivateData).toHaveBeenCalledTimes(1);
  expect(s.session.getStatus()).toBe('lost');
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
