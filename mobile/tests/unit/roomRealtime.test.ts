import { createRoomSubscription, isRoomSignal, type RoomSignal, type RoomRealtimeStatus, type RoomSubscription } from '../../src/features/rooms/services/roomRealtime';
import { startRoomSnapshotSync } from '../../src/features/rooms/services/roomSnapshotSync';
import type { ApiError } from '../../src/data/api/contracts';
import type { WebSocketLike } from '../../src/features/inbox/services/inboxRealtime';

const roomId = '11111111-1111-4111-8111-111111111111';
const topic = 'realtime:room-version:' + roomId;
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
class Socket implements WebSocketLike {
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  sent: Record<string, any>[] = [];
  closed = false;
  send(value: string) { this.sent.push(JSON.parse(value)); }
  close() { this.closed = true; }
  receive(event: string, payload: unknown) { this.onmessage?.({ data: JSON.stringify({ topic, event, payload }) }); }
}
beforeEach(() => jest.useFakeTimers());
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

function transport() {
  const sockets: Socket[] = [];
  const fetchFn = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [{ room_id: roomId, version: 1 }] });
  const onSignal = jest.fn(), onStatus = jest.fn(), onError = jest.fn();
  const subscribe = createRoomSubscription({
    baseUrl: 'http://localhost:54375', apiKey: 'public-key', getAccessToken: async () => 'test-token',
    fetchFn, createSocket: () => { const socket = new Socket(); sockets.push(socket); return socket; },
  });
  const stop = subscribe(roomId, onSignal, onStatus, onError);
  return { sockets, fetchFn, onSignal, onStatus, onError, stop };
}
test('validates minimal version signals', () => {
  expect(isRoomSignal({ room_id: roomId, version: 3 }, roomId)).toBe(true);
  for (const row of [
    { room_id: roomId, version: '3' }, { room_id: 'another', version: 3 },
    { room_id: roomId, version: 0 }, { room_id: roomId, version: 3, votes: [] },
  ]) expect(isRoomSignal(row, roomId)).toBe(false);
});
test('joins after capability/ACL probe, receives minimal rows and closes on cleanup', async () => {
  const t = transport();
  await flush();
  t.sockets[0]!.onopen?.();
  expect(t.sockets[0]!.sent[0]!.payload.config.postgres_changes).toEqual([
    { event: '*', schema: 'public', table: 'room_version_signals', filter: 'room_id=eq.' + roomId },
  ]);
  t.sockets[0]!.receive('system', { extension: 'postgres_changes', status: 'ok' });
  t.sockets[0]!.receive('postgres_changes', { data: { type: 'UPDATE', record: { room_id: roomId, version: 2 } } });
  expect(t.onSignal).toHaveBeenLastCalledWith({ room_id: roomId, version: 2 });
  expect(t.onStatus).toHaveBeenLastCalledWith('live');
  t.stop();
  expect(t.sockets[0]!.closed).toBe(true);
  expect(jest.getTimerCount()).toBe(0);
});
test('missing backend capability fails explicitly and does not connect', async () => {
  const t = transport();
  // A second connection gives us an explicit missing-table response.
  await flush();
  t.sockets[0]!.onclose?.({});
  t.fetchFn.mockResolvedValue({ ok: false, status: 404, json: async () => ({ code: 'PGRST205' }) });
  await jest.advanceTimersByTimeAsync(1000);
  expect(t.onError).toHaveBeenCalledWith({ messageKey: 'CONTRACT_MISMATCH' });
  expect(t.sockets).toHaveLength(1);
  expect(jest.getTimerCount()).toBe(0);
});
test('lease detects kick even without a delivered kick event', async () => {
  const t = transport();
  await flush();
  const socket = t.sockets[0]!;
  socket.onopen?.();
  socket.receive('system', { extension: 'postgres_changes', status: 'ok' });
  t.fetchFn.mockResolvedValue({ ok: true, status: 200, json: async () => [] });
  await jest.advanceTimersByTimeAsync(30_000);
  expect(t.onError).toHaveBeenCalledWith({ messageKey: 'NOT_MEMBER' });
  expect(socket.closed).toBe(true);
});
test('late token after stop cannot open a socket', async () => {
  let resolve!: (token: string) => void;
  const token = new Promise<string>(done => { resolve = done; });
  const createSocket = jest.fn();
  const subscribe = createRoomSubscription({ baseUrl: 'http://localhost', apiKey: 'key', getAccessToken: () => token, createSocket });
  const stop = subscribe(roomId, jest.fn(), jest.fn(), jest.fn());
  stop();
  resolve('late-token');
  await flush();
  expect(createSocket).not.toHaveBeenCalled();
});

function coordinator(read: (guard: () => boolean) => Promise<{ roomId: string; version: number } | null>) {
  let signal!: (signal: RoomSignal) => void;
  let status!: (status: RoomRealtimeStatus) => void;
  let error!: (error: ApiError) => void;
  const unsubscribe = jest.fn();
  const subscribe: RoomSubscription = (_room, onSignal, onStatus, onError) => {
    signal = onSignal; status = onStatus; error = onError;
    return unsubscribe;
  };
  const stop = startRoomSnapshotSync({ roomId, read, subscribe, isCurrent: () => true, onError: jest.fn() });
  return { signal: (version: number) => signal({ room_id: roomId, version }), status: (s: RoomRealtimeStatus) => status(s), error, stop, unsubscribe };
}
test('coalesces bursts into a single read and one follow-up and ignores old versions', async () => {
  let finish!: (value: { roomId: string; version: number }) => void;
  const read = jest.fn().mockReturnValueOnce(new Promise(resolve => { finish = resolve; }))
    .mockResolvedValue({ roomId, version: 9 });
  const c = coordinator(read);
  c.status('live');
  c.signal(3); c.signal(9); c.signal(8);
  expect(read).toHaveBeenCalledTimes(1);
  finish({ roomId, version: 3 });
  await flush();
  // A queued newer version gets one immediate follow-up after the in-flight read.
  expect(read).toHaveBeenCalledTimes(2);
  c.signal(9); c.signal(2);
  await jest.advanceTimersByTimeAsync(60_000);
  expect(read).toHaveBeenCalledTimes(2);
  c.stop();
});
test('disconnect uses finite backoff, reconnect reads once, stop invalidates response guard', async () => {
  const read = jest.fn().mockResolvedValue(null);
  const c = coordinator(read);
  c.status('down');
  await jest.advanceTimersByTimeAsync(2500);
  await jest.advanceTimersByTimeAsync(5000);
  expect(read).toHaveBeenCalledTimes(2);
  read.mockResolvedValue({ roomId, version: 4 });
  c.status('live');
  await flush();
  const guard = read.mock.calls.at(-1)![0] as () => boolean;
  await jest.advanceTimersByTimeAsync(60_000);
  expect(read).toHaveBeenCalledTimes(3);
  expect(guard()).toBe(true);
  c.stop();
  expect(guard()).toBe(false);
  expect(c.unsubscribe).toHaveBeenCalledTimes(1);
});
