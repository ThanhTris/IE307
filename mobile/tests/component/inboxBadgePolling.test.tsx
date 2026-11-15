import { act, render } from '@testing-library/react-native';
import { AppState } from 'react-native';
import type { InboxItem } from '../../src/data/api/contracts';
import { INBOX_FALLBACK_POLL_MS, INBOX_PUSH_DEBOUNCE_MS, InboxBadgeProvider } from '../../src/bootstrap/InboxBadgeProvider';
import type { InboxRealtimeOptions } from '../../src/features/inbox/services/inboxRealtime';

const mockPush = jest.fn();
const mockNotify = jest.fn();
const mockStopRealtime = jest.fn();
let mockRealtime: InboxRealtimeOptions[] = [];
let mockPath = '/';
let mockRoom: string | undefined;
let rows: InboxItem[] = [];
const mockList = jest.fn(async () => ({ ok: true as const, data: { items: rows, fetchedAt: '2026-11-14T10:00:00.000Z' } }));

jest.mock('expo-router', () => ({
  router: { push: (path: string) => mockPush(path) },
  usePathname: () => mockPath,
  useGlobalSearchParams: () => ({ roomId: mockRoom }),
}));
jest.mock('../../src/bootstrap/RoomRepositoryProvider', () => ({ useRoomRepository: () => mockLive }));
jest.mock('../../src/features/inbox/services/inboxRepository', () => ({ createInboxRepository: () => ({ list: mockList }) }));
jest.mock('../../src/shared/ui/feedback/NotificationBanner', () => ({ useNotifications: () => ({ notify: mockNotify }) }));
jest.mock('../../src/features/inbox/services/inboxRealtime', () => ({
  subscribeInboxRealtime: (options: InboxRealtimeOptions) => { mockRealtime.push(options); return mockStopRealtime; },
}));
const mockLive = { user: { id: 'user-1' }, repository: { getSessionApi: () => ({ getAccessToken: async () => ({ ok: true, data: 'token-1' }) }) } };

const row = (n: number, patch: Partial<InboxItem> = {}): InboxItem => ({
  id: `00000000-0000-4000-8000-00000000000${n}`, eventId: `10000000-0000-4000-8000-00000000000${n}`, type: 'friend_accepted',
  title: 'Kết bạn thành công', body: 'Linh đã chấp nhận lời mời kết bạn của bạn', read: false, metadata: {}, createdAt: '2026-11-14T10:00:00.000Z', ...patch,
});
const tick = async (ms: number) => { await act(async () => { await jest.advanceTimersByTimeAsync(ms); }); };
const realtime = () => mockRealtime[mockRealtime.length - 1]!;
const push = async () => { await act(async () => { realtime().onInsert(); }); await tick(INBOX_PUSH_DEBOUNCE_MS + 10); };
const status = async (value: 'live' | 'down') => { await act(async () => { realtime().onStatus?.(value); }); await tick(1); };

const env = { url: process.env.EXPO_PUBLIC_SUPABASE_URL, key: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY };
beforeEach(() => {
  jest.useFakeTimers();
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54361';
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'public-key';
  mockPush.mockClear(); mockNotify.mockClear(); mockList.mockClear(); mockStopRealtime.mockClear();
  mockRealtime = []; mockPath = '/'; mockRoom = undefined; rows = [];
});
afterEach(() => {
  jest.useRealTimers(); jest.restoreAllMocks();
  process.env.EXPO_PUBLIC_SUPABASE_URL = env.url; process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = env.key;
});

test('nothing is read while nothing happens: no timer while the push connection is live', async () => {
  await render(<InboxBadgeProvider>{null}</InboxBadgeProvider>);
  await tick(1);
  expect(realtime()).toMatchObject({ baseUrl: 'http://127.0.0.1:54361', apiKey: 'public-key', userId: 'user-1' });
  expect(await realtime().getAccessToken()).toBe('token-1');
  await status('live');
  const reads = mockList.mock.calls.length;
  await tick(5 * 60_000);
  expect(mockList.mock.calls.length).toBe(reads);
});

test('a pushed row is read at once and becomes a banner', async () => {
  await render(<InboxBadgeProvider>{null}</InboxBadgeProvider>);
  await tick(1);
  await status('live');
  rows = [row(1)];
  await push();
  expect(mockNotify).toHaveBeenCalledTimes(1);
  expect(mockNotify.mock.calls[0][0]).toMatchObject({ title: 'Kết bạn thành công', message: 'Linh đã chấp nhận lời mời kết bạn của bạn' });
  mockNotify.mock.calls[0][0].onPress();
  expect(mockPush).toHaveBeenCalledWith('/friends');
});

test('several pushes together cause one read', async () => {
  await render(<InboxBadgeProvider>{null}</InboxBadgeProvider>);
  await tick(1);
  await status('live');
  const reads = mockList.mock.calls.length;
  await act(async () => { realtime().onInsert(); realtime().onInsert(); realtime().onInsert(); });
  await tick(INBOX_PUSH_DEBOUNCE_MS + 10);
  expect(mockList.mock.calls.length).toBe(reads + 1);
});

test('only while the push connection is down it reads every 30 seconds, and catches up when it is back', async () => {
  await render(<InboxBadgeProvider>{null}</InboxBadgeProvider>);
  await tick(1);
  await status('live');
  await status('down');
  const down = mockList.mock.calls.length;
  await tick(INBOX_FALLBACK_POLL_MS * 2);
  expect(mockList.mock.calls.length).toBe(down + 2);
  rows = [row(1)];
  await status('live');
  expect(mockNotify).toHaveBeenCalledTimes(1);
  const back = mockList.mock.calls.length;
  await tick(INBOX_FALLBACK_POLL_MS * 2);
  expect(mockList.mock.calls.length).toBe(back);
});

test('rows that were unread when the app opened become a single summary banner', async () => {
  rows = [row(1), row(2)];
  await render(<InboxBadgeProvider>{null}</InboxBadgeProvider>);
  await tick(1);
  expect(mockNotify).toHaveBeenCalledTimes(1);
  expect(mockNotify.mock.calls[0][0]).toMatchObject({ title: 'Thông báo mới', message: 'Bạn có 2 thông báo chưa đọc' });
});

test('no banner while the inbox list itself is open, and none for the room the person is in', async () => {
  const view = await render(<InboxBadgeProvider>{null}</InboxBadgeProvider>);
  await tick(1);
  await status('live');
  mockPath = '/inbox';
  await view.rerender(<InboxBadgeProvider>{null}</InboxBadgeProvider>);
  rows = [row(1)];
  await push();
  expect(mockNotify).not.toHaveBeenCalled();
  mockPath = '/room/vote'; mockRoom = 'room-a';
  await view.rerender(<InboxBadgeProvider>{null}</InboxBadgeProvider>);
  rows = [row(1), row(2, { type: 'room_result', title: 'Đã chốt món', body: 'Nhóm chọn: Cơm', metadata: { roomId: 'room-a', resultId: 'r1' } })];
  await push();
  expect(mockNotify).not.toHaveBeenCalled();
});

test('the connection closes in the background and comes back with a read on return', async () => {
  let listener: (state: string) => void = () => undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => { listener = handler as (state: string) => void; return { remove: jest.fn() }; });
  await render(<InboxBadgeProvider>{null}</InboxBadgeProvider>);
  await tick(1);
  expect(mockRealtime).toHaveLength(1);
  await act(async () => { listener('background'); });
  expect(mockStopRealtime).toHaveBeenCalledTimes(1);
  const before = mockList.mock.calls.length;
  await tick(INBOX_FALLBACK_POLL_MS * 3);
  expect(mockList.mock.calls.length).toBe(before);
  await act(async () => { listener('active'); await jest.advanceTimersByTimeAsync(0); });
  expect(mockRealtime).toHaveLength(2);
  expect(mockList.mock.calls.length).toBe(before + 1);
});

test('without backend settings it falls back to reading every 30 seconds', async () => {
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  await render(<InboxBadgeProvider>{null}</InboxBadgeProvider>);
  await tick(1);
  expect(mockRealtime).toHaveLength(0);
  const reads = mockList.mock.calls.length;
  await tick(INBOX_FALLBACK_POLL_MS);
  expect(mockList.mock.calls.length).toBe(reads + 1);
});
