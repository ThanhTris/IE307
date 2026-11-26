import { createAccountDeletion } from '../../src/features/account/services/accountDeletion';
import { SessionManager } from '../../src/data/auth/session';
import { AuthFailure, type StoredSession } from '../../src/data/auth/types';

const userId = '00000000-0000-4000-8000-000000000053';
const start = Date.parse('2026-11-26T10:00:00Z');

function reply(status: number, body: unknown, retryAfter?: string): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers(retryAfter ? { 'Retry-After': retryAfter } : {}),
    json: async () => body,
  } as Response;
}

function ack(init: RequestInit) {
  return reply(200, { ok: true, data: { ...JSON.parse(String(init.body)), deleted: true } });
}

async function setup(isGuest = true) {
  let time = start;
  const user = { id: userId, isGuest, displayName: 'QA', createdAt: new Date(start).toISOString() };
  const original: StoredSession = {
    accessToken: 'fixture-original', refreshToken: 'fixture-refresh',
    expiresAt: new Date(start + 3600_000).toISOString(), user,
  };
  const storage = { load: jest.fn(async () => original), save: jest.fn(async () => {}), clear: jest.fn(async () => {}) };
  const auth = {
    verify: jest.fn(async () => user), createGuest: jest.fn(async () => original),
    refresh: jest.fn(async () => original), logout: jest.fn(async (_token: string) => {}),
    accountProfile: jest.fn(async (_token: string) => ({ user, email: 'tester@example.test' })),
    signIn: jest.fn(async (_credentials: { email: string; password: string }) => ({ ...original, accessToken: 'fixture-proof' })),
  };
  const clearPrivateData = jest.fn(async () => {});
  const clearDeletedData = jest.fn(async (_id: string) => {});
  const onAccountSessionChange = jest.fn();
  const session = new SessionManager({ auth, storage, clearPrivateData, onAccountSessionChange, now: () => time });
  expect((await session.restoreSession()).ok).toBe(true);
  const fetchFn = jest.fn(async (_url: string, init: RequestInit) => ack(init));
  const deletion = createAccountDeletion({
    baseUrl: 'http://localhost:54321', publicKey: 'fixture-public', session, auth, clearDeletedData,
    fetchFn: fetchFn as unknown as typeof fetch, now: () => time,
  });
  const submit = (password = '') => deletion.submit({ userId, password, signal: new AbortController().signal });
  return { auth, storage, session, clearPrivateData, clearDeletedData, onAccountSessionChange,
    fetchFn, deletion, submit, advance: (ms: number) => { time += ms; } };
}

test('email reauth stays temporary, and an uncertain retry uses the same UUID and original bearer', async () => {
  const s = await setup(false);
  s.fetchFn.mockRejectedValueOnce(new TypeError('network request failed'));
  expect(await s.submit('example-password')).toMatchObject({ ok: false, error: { messageKey: 'NETWORK_ERROR' } });
  expect(s.auth.signIn).toHaveBeenCalledWith({ email: 'tester@example.test', password: 'example-password' });
  expect(s.auth.logout).toHaveBeenCalledWith('fixture-proof');
  expect(s.storage.clear).not.toHaveBeenCalled();
  expect(s.deletion.canResume(userId)).toBe(true);
  expect(await s.submit()).toEqual({ ok: true, data: undefined });
  expect(s.auth.signIn).toHaveBeenCalledTimes(1);
  expect(s.fetchFn.mock.calls[0]![0]).toBe('http://localhost:54321/functions/v1/delete-account');
  const first = s.fetchFn.mock.calls[0]![1];
  const second = s.fetchFn.mock.calls[1]![1];
  expect(second.body).toBe(first.body);
  expect(second.headers).toMatchObject({ Authorization: 'Bearer fixture-original' });
  expect(Object.keys(JSON.parse(String(second.body)))).toEqual(['requestId']);
  expect(s.storage.clear).toHaveBeenCalledTimes(1);
  expect(s.clearPrivateData).toHaveBeenCalledTimes(1);
  expect(s.clearDeletedData).toHaveBeenCalledWith(userId);
  expect(s.session.getStatus()).toBe('empty');
  expect(s.onAccountSessionChange).toHaveBeenCalledWith(null, { id: userId, isGuest: false, displayName: 'QA', createdAt: new Date(start).toISOString() }, 'empty');
});

test('a wrong password leaves the session active and never sends the deletion request', async () => {
  const s = await setup(false);
  s.auth.signIn.mockRejectedValueOnce(new AuthFailure({ messageKey: 'INVALID_INPUT', details: { reason: 'invalid_credentials' } }));
  expect(await s.submit('wrong')).toMatchObject({ error: { details: { reason: 'INVALID_PASSWORD' } } });
  expect(s.fetchFn).not.toHaveBeenCalled();
  expect(s.storage.clear).not.toHaveBeenCalled();
  expect(s.session.getStatus()).toBe('active');
});

test.each([
  [401, 'AUTH_REQUIRED', 'AUTH_REQUIRED'],
  [403, 'GENERIC', 'FORBIDDEN'],
  [409, 'ACTIVE_ROOM', 'ACTIVE_ROOM'],
  [409, 'DELETION_IN_PROGRESS', 'DELETION_IN_PROGRESS'],
])('maps HTTP %s and %s without clearing a session', async (status, code, reason) => {
  const s = await setup();
  s.fetchFn.mockResolvedValueOnce(reply(status, { ok: false, error: { messageKey: code } }));
  expect(await s.submit()).toMatchObject({ error: { details: { reason } } });
  expect(s.clearDeletedData).not.toHaveBeenCalled();
  expect(s.session.getStatus()).toBe('active');
});

test('handles a thrown response, returned error envelope and mismatched success without accepting an ACK', async () => {
  const s = await setup();
  s.fetchFn.mockRejectedValueOnce({ status: 403, body: { ok: false, error: { messageKey: 'FORBIDDEN' } } })
    .mockResolvedValueOnce(reply(200, { ok: false, error: { messageKey: 'ACTIVE_ROOM' } }))
    .mockResolvedValueOnce(reply(200, { ok: true, data: { requestId: userId, deleted: true } }));
  for (const reason of ['FORBIDDEN', 'ACTIVE_ROOM', 'MALFORMED_RESPONSE']) {
    expect(await s.submit()).toMatchObject({ error: { details: { reason } } });
  }
  expect(s.clearDeletedData).not.toHaveBeenCalled();
});

test('enforces Retry-After and exponential server cooldown before sending again', async () => {
  const s = await setup();
  s.fetchFn.mockResolvedValueOnce(reply(429, {}, '2'))
    .mockResolvedValueOnce(reply(503, { ok: false, error: { messageKey: 'DELETE_RETRY' } }));
  expect(await s.submit()).toMatchObject({ error: { details: { reason: 'RATE_LIMITED', retryAt: start + 2000 } } });
  await s.submit();
  expect(s.fetchFn).toHaveBeenCalledTimes(1);
  s.advance(2000);
  expect(await s.submit()).toMatchObject({ error: { details: { reason: 'SERVER_RETRY', retryAt: start + 4000 } } });
  await s.submit();
  expect(s.fetchFn).toHaveBeenCalledTimes(2);
  s.advance(2000);
  expect(await s.submit()).toMatchObject({ ok: true });
  expect(new Set(s.fetchFn.mock.calls.map(call => call[1].body)).size).toBe(1);
});

test('ignores an ACK superseded by logout and prevents duplicate submits in flight', async () => {
  const s = await setup();
  let complete!: (response: Response) => void;
  let init!: RequestInit;
  let sent!: () => void;
  const onSent = new Promise<void>(resolve => { sent = resolve; });
  s.fetchFn.mockImplementationOnce((_url, options) => new Promise(resolve => {
    complete = resolve;
    init = options;
    sent();
  }));
  const deletion = s.submit();
  await onSent;
  expect(await s.submit()).toMatchObject({ error: { details: { reason: 'DELETION_IN_PROGRESS' } } });
  const logout = s.session.logout();
  complete(ack(init));
  expect(await deletion).toMatchObject({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });
  await logout;
  expect(s.clearDeletedData).not.toHaveBeenCalled();
});

test('retries failed local cleanup without repeating the server deletion', async () => {
  const s = await setup();
  s.clearDeletedData.mockRejectedValueOnce(new Error('local storage unavailable'));
  expect(await s.submit()).toMatchObject({ error: { details: { reason: 'LOCAL_CLEANUP' } } });
  expect(s.session.getStatus()).toBe('blocked');
  expect(await s.session.logout()).toMatchObject({ ok: true });
  expect(s.session.getStatus()).toBe('empty');
  expect(s.clearDeletedData).toHaveBeenCalledTimes(2);
  expect(s.fetchFn).toHaveBeenCalledTimes(1);
});
