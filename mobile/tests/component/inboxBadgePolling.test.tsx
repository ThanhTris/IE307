import { act, render } from '@testing-library/react-native';
import { AppState } from 'react-native';
import type { InboxItem } from '../../src/data/api/contracts';
import { INBOX_POLL_MS, InboxBadgeProvider } from '../../src/bootstrap/InboxBadgeProvider';

const mockPush = jest.fn();
const mockNotify = jest.fn();
let mockPath = '/';
let mockRoom: string | undefined;
let rows: InboxItem[] = [];
const mockList = jest.fn(async () => ({ ok: true as const, data: { items: rows, fetchedAt: '2026-11-13T10:00:00.000Z' } }));

jest.mock('expo-router', () => ({
  router: { push: (path: string) => mockPush(path) },
  usePathname: () => mockPath,
  useGlobalSearchParams: () => ({ roomId: mockRoom }),
}));
jest.mock('../../src/bootstrap/RoomRepositoryProvider', () => ({ useRoomRepository: () => mockLive }));
jest.mock('../../src/features/inbox/services/inboxRepository', () => ({ createInboxRepository: () => ({ list: mockList }) }));
jest.mock('../../src/shared/ui/feedback/NotificationBanner', () => ({ useNotifications: () => ({ notify: mockNotify }) }));
const mockLive = { user: { id: 'user-1' }, repository: {} };

const row = (n: number, patch: Partial<InboxItem> = {}): InboxItem => ({
  id: `00000000-0000-4000-8000-00000000000${n}`, eventId: `10000000-0000-4000-8000-00000000000${n}`, type: 'friend_accepted',
  title: 'Kết bạn thành công', body: 'Linh đã chấp nhận lời mời kết bạn của bạn', read: false, metadata: {}, createdAt: '2026-11-13T10:00:00.000Z', ...patch,
});

async function tick(ms: number) { await act(async () => { await jest.advanceTimersByTimeAsync(ms); }); }

beforeEach(() => {
  jest.useFakeTimers();
  mockPush.mockClear(); mockNotify.mockClear(); mockList.mockClear();
  mockPath = '/'; mockRoom = undefined; rows = [];
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

test('the inbox is read every 10 seconds and a new row becomes a banner', async () => {
  await render(<InboxBadgeProvider>{null}</InboxBadgeProvider>);
  await tick(1);
  expect(mockList).toHaveBeenCalledTimes(1);
  expect(mockNotify).not.toHaveBeenCalled();
  rows = [row(1)];
  await tick(INBOX_POLL_MS);
  expect(mockList).toHaveBeenCalledTimes(2);
  expect(mockNotify).toHaveBeenCalledTimes(1);
  expect(mockNotify.mock.calls[0][0]).toMatchObject({ title: 'Kết bạn thành công', message: 'Linh đã chấp nhận lời mời kết bạn của bạn' });
  mockNotify.mock.calls[0][0].onPress();
  expect(mockPush).toHaveBeenCalledWith('/friends');
  await tick(INBOX_POLL_MS);
  expect(mockNotify).toHaveBeenCalledTimes(1);
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
  mockPath = '/inbox';
  await view.rerender(<InboxBadgeProvider>{null}</InboxBadgeProvider>);
  rows = [row(1)];
  await tick(INBOX_POLL_MS);
  expect(mockNotify).not.toHaveBeenCalled();
  mockPath = '/room/vote'; mockRoom = 'room-a';
  await view.rerender(<InboxBadgeProvider>{null}</InboxBadgeProvider>);
  rows = [row(1), row(2, { type: 'room_result', title: 'Đã chốt món', body: 'Nhóm chọn: Cơm', metadata: { roomId: 'room-a', resultId: 'r1' } })];
  await tick(INBOX_POLL_MS);
  expect(mockNotify).not.toHaveBeenCalled();
});

test('reading stops while the app is in the background and resumes on return', async () => {
  let listener: (state: string) => void = () => undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => { listener = handler as (state: string) => void; return { remove: jest.fn() }; });
  await render(<InboxBadgeProvider>{null}</InboxBadgeProvider>);
  await tick(1);
  const before = mockList.mock.calls.length;
  await act(async () => { listener('background'); });
  await tick(INBOX_POLL_MS * 3);
  expect(mockList.mock.calls.length).toBe(before);
  await act(async () => { listener('active'); await jest.advanceTimersByTimeAsync(0); });
  expect(mockList.mock.calls.length).toBe(before + 1);
});
