import { HEARTBEAT_MS, RECONNECT_DELAYS_MS, realtimeSocketUrl, subscribeInboxRealtime, type WebSocketLike } from '../../src/features/inbox/services/inboxRealtime';

class FakeSocket implements WebSocketLike {
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onclose: ((event: unknown) => void) | null = null;
  sent: Record<string, any>[] = [];
  closed = false;
  constructor(readonly url: string) {}
  send(data: string) { this.sent.push(JSON.parse(data)); }
  close() { this.closed = true; }
  receive(message: Record<string, unknown>) { this.onmessage?.({ data: JSON.stringify(message) }); }
}

const flush = () => new Promise(resolve => setImmediate(resolve));
const topic = 'realtime:inbox:user-1';

function setup(tokens: (string | undefined)[] = ['t1', 't2', 't3']) {
  const sockets: FakeSocket[] = [];
  const timers: { run: () => void; ms: number; cleared: boolean }[] = [];
  const onInsert = jest.fn();
  const statuses: string[] = [];
  let call = 0;
  const stop = subscribeInboxRealtime({
    baseUrl: 'https://abc.trycloudflare.com/', apiKey: 'k y', userId: 'user-1',
    getAccessToken: async () => tokens[Math.min(call++, tokens.length - 1)],
    onInsert, onStatus: status => statuses.push(status),
    createSocket: url => { const socket = new FakeSocket(url); sockets.push(socket); return socket; },
    setTimer: (run, ms) => { const timer = { run: () => { timer.cleared = true; run(); }, ms, cleared: false }; timers.push(timer); return timer; },
    clearTimer: timer => { (timer as { cleared: boolean }).cleared = true; },
  });
  const pending = () => timers.filter(timer => !timer.cleared);
  return { sockets, timers, pending, onInsert, statuses, stop };
}

test('the socket URL follows the backend address, http to ws and https to wss', () => {
  expect(realtimeSocketUrl('http://127.0.0.1:54361', 'key')).toBe('ws://127.0.0.1:54361/realtime/v1/websocket?apikey=key&vsn=1.0.0');
  expect(realtimeSocketUrl('https://abc.trycloudflare.com/', 'k y')).toBe('wss://abc.trycloudflare.com/realtime/v1/websocket?apikey=k%20y&vsn=1.0.0');
});

test('it joins only its own inbox rows with the access token and keeps a heartbeat', async () => {
  const { sockets, pending } = setup();
  await flush();
  const socket = sockets[0]!;
  socket.onopen?.();
  const join = socket.sent[0]!;
  expect(join).toMatchObject({ topic, event: 'phx_join' });
  expect(join.payload.access_token).toBe('t1');
  expect(join.payload.config.postgres_changes).toEqual([{ event: 'INSERT', schema: 'public', table: 'inbox', filter: 'owner_user_id=eq.user-1' }]);
  const heartbeat = pending().find(timer => timer.ms === HEARTBEAT_MS)!;
  heartbeat.run();
  expect(socket.sent.at(-1)).toMatchObject({ topic: 'phoenix', event: 'heartbeat' });
});

test('a new row calls onInsert, and the status turns live once the database subscription is confirmed', async () => {
  const { sockets, onInsert, statuses } = setup();
  await flush();
  sockets[0]!.onopen?.();
  sockets[0]!.receive({ topic, event: 'system', payload: { extension: 'postgres_changes', status: 'ok' } });
  expect(statuses).toContain('live');
  sockets[0]!.receive({ topic, event: 'postgres_changes', payload: { data: { record: { id: 'x' } } } });
  expect(onInsert).toHaveBeenCalledTimes(1);
  sockets[0]!.receive({ topic: 'realtime:other', event: 'postgres_changes', payload: {} });
  expect(onInsert).toHaveBeenCalledTimes(1);
});

test('a dropped connection reconnects after a growing wait, with a fresh token', async () => {
  const { sockets, pending, statuses } = setup();
  await flush();
  sockets[0]!.onclose?.({});
  expect(statuses.at(-1)).toBe('down');
  const first = pending().find(timer => RECONNECT_DELAYS_MS.includes(timer.ms))!;
  expect(first.ms).toBe(RECONNECT_DELAYS_MS[0]);
  first.run();
  await flush();
  expect(sockets).toHaveLength(2);
  sockets[1]!.onopen?.();
  expect(sockets[1]!.sent[0]!.payload.access_token).toBe('t2');
  sockets[1]!.onerror?.({});
  expect(pending().find(timer => RECONNECT_DELAYS_MS.includes(timer.ms))!.ms).toBe(RECONNECT_DELAYS_MS[1]);
});

test('an expired token closes the channel and it joins again', async () => {
  const { sockets, pending } = setup();
  await flush();
  sockets[0]!.onopen?.();
  sockets[0]!.receive({ topic, event: 'phx_close', payload: {} });
  expect(sockets[0]!.closed).toBe(true);
  pending().find(timer => RECONNECT_DELAYS_MS.includes(timer.ms))!.run();
  await flush();
  expect(sockets).toHaveLength(2);
});

test('no token means no connection, and it tries again later', async () => {
  const { sockets, pending } = setup([undefined, 't2']);
  await flush();
  expect(sockets).toHaveLength(0);
  pending()[0]!.run();
  await flush();
  expect(sockets).toHaveLength(1);
});

test('stopping closes the socket and cancels every timer', async () => {
  const { sockets, pending, stop } = setup();
  await flush();
  sockets[0]!.onopen?.();
  stop();
  expect(sockets[0]!.closed).toBe(true);
  expect(pending()).toHaveLength(0);
});
