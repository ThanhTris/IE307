import { AuthHttpTransport } from '../../src/data/auth/transport';

const now = Date.parse('2026-10-11T10:00:00Z');
const user = { id: 'fixture-caller-A', is_anonymous: true, created_at: '2026-10-11T09:00:00Z', user_metadata: { display_name: 'Trí', userId: 'forged-B', isGuest: false } };
const wire = { access_token: 'fixture-access', refresh_token: 'fixture-refresh', token_type: 'bearer', expires_in: 3600, expires_at: now / 1000 + 3600, user };
function setup(response: Response | (() => Promise<Response>) = new Response(JSON.stringify(wire))) {
  const fetchFn = jest.fn(async () => typeof response === 'function' ? response() : response);
  const transport = new AuthHttpTransport({ baseUrl: 'http://127.0.0.1:54321', publicKey: 'sb_publishable_fixture', now: () => now, fetchFn });
  return { transport, fetchFn };
}

test.each(['https://user:pass@example.com', 'http://example.com', 'http://127.0.0.1:54321/path', 'https://example.com?q=1'])('reject unsafe endpoint %s', baseUrl => {
  expect(() => new AuthHttpTransport({ baseUrl, publicKey: 'sb_publishable_fixture' })).toThrow();
});

test.each(['sb_secret_fixture', 'service_role', ''])('reject privileged/unrecognized configured key %s', publicKey => {
  expect(() => new AuthHttpTransport({ baseUrl: 'http://localhost:54321', publicKey })).toThrow();
});

test('legacy anon JWT allowed, legacy service-role JWT rejected', () => {
  const key = (role: string) => `header.${btoa(JSON.stringify({ role }))}.signature`;
  expect(() => new AuthHttpTransport({ baseUrl: 'https://example.com', publicKey: key('anon') })).not.toThrow();
  expect(() => new AuthHttpTransport({ baseUrl: 'https://example.com', publicKey: key('service_role') })).toThrow();
});

test('anonymous signup sends only display name; verified user.id owns identity', async () => {
  const s = setup();
  const result = await s.transport.createGuest(' Trí ');
  expect(result.user).toEqual({ id: user.id, displayName: 'Trí', isGuest: true, createdAt: user.created_at });
  expect(s.fetchFn).toHaveBeenCalledWith('http://127.0.0.1:54321/auth/v1/signup', expect.objectContaining({
    method: 'POST', redirect: 'error', body: JSON.stringify({ data: { display_name: 'Trí' } }),
    headers: { apikey: 'sb_publishable_fixture', 'Content-Type': 'application/json' },
  }));
});

test('GET user verifies bearer on server; metadata userId never becomes caller', async () => {
  const s = setup(new Response(JSON.stringify(user)));
  expect((await s.transport.verify('fixture-access')).id).toBe('fixture-caller-A');
  expect(s.fetchFn).toHaveBeenCalledWith(expect.stringContaining('/auth/v1/user'), expect.objectContaining({
    method: 'GET', headers: expect.objectContaining({ Authorization: 'Bearer fixture-access' }),
  }));
});

test('refresh token goes only to GoTrue token endpoint', async () => {
  const s = setup();
  await s.transport.refresh('fixture-refresh');
  expect(s.fetchFn).toHaveBeenCalledWith(expect.stringContaining('/auth/v1/token?grant_type=refresh_token'), expect.objectContaining({ body: JSON.stringify({ refresh_token: 'fixture-refresh' }) }));
});

test('logout is current session scope and accepts 204 without JSON body', async () => {
  const s = setup(new Response(null, { status: 204 }));
  await s.transport.logout('fixture-access');
  expect(s.fetchFn).toHaveBeenCalledWith(expect.stringContaining('logout?scope=local'), expect.objectContaining({ method: 'POST' }));
});

test.each([
  [401, {}, 'AUTH_REQUIRED'], [403, {}, 'AUTH_REQUIRED'],
  [400, { code: 'refresh_token_not_found' }, 'AUTH_REQUIRED'],
  [400, { code: 400, error_code: 'refresh_token_not_found' }, 'AUTH_REQUIRED'],
  [400, { code: 400, error_code: 'refresh_token_already_used' }, 'AUTH_REQUIRED'],
  [400, { code: 400, error_code: 'validation_failed' }, 'AUTH_REQUIRED'],
  [400, { code: 400, error_code: 'session_not_found' }, 'AUTH_REQUIRED'],
  [400, { code: 400, error_code: 'session_expired' }, 'AUTH_REQUIRED'],
  [400, {}, 'INVALID_INPUT'], [422, {}, 'INVALID_INPUT'],
  [500, {}, 'NETWORK_ERROR'], [404, {}, 'UNKNOWN_ERROR'],
] as const)('HTTP %i mapped to safe error %s', async (status, body, messageKey) => {
  const s = setup(new Response(JSON.stringify({ ...body, message: 'fixture-private-token' }), { status }));
  await expect(s.transport.refresh('fixture-refresh')).rejects.toMatchObject({ error: { messageKey } });
});

test.each(['2', 'Sun, 11 Oct 2026 10:00:02 GMT'])('429 Retry-After %s returns sanitized delay', async delay => {
  const s = setup(new Response('fixture-sensitive', { status: 429, headers: { 'Retry-After': delay } }));
  await expect(s.transport.verify('fixture-access')).rejects.toMatchObject({ error: { messageKey: 'RATE_LIMITED' }, retryAfterMs: 2000 });
});

test.each([
  {}, { ...wire, refresh_token: null }, { ...wire, token_type: 'unexpected' },
  { ...wire, expires_at: 'tomorrow' }, { ...wire, expires_at: now / 1000 - 1 },
  { ...wire, user: { ...user, is_anonymous: false } },
  { ...wire, user: { ...user, user_metadata: {} } },
])('malformed auth success rejected before token storage', async value => {
  const s = setup(new Response(JSON.stringify(value)));
  await expect(s.transport.createGuest('Trí')).rejects.toMatchObject({ error: { messageKey: 'MALFORMED_RESPONSE' } });
});

test('network failure raw token message suppressed', async () => {
  const s = setup(async () => { throw new Error('fixture-secret'); });
  await expect(s.transport.verify('fixture-access')).rejects.toMatchObject({ error: { messageKey: 'NETWORK_ERROR' } });
});

test('actual timeout aborts request and reports TIMEOUT', async () => {
  const fetchFn = jest.fn((_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
  }));
  const transport = new AuthHttpTransport({ baseUrl: 'http://localhost:54321', publicKey: 'sb_publishable_fixture', timeoutMs: 10, fetchFn });
  await expect(transport.verify('fixture-access')).rejects.toMatchObject({ error: { messageKey: 'TIMEOUT' } });
});
