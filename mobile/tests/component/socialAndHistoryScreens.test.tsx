import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { type InboxItem } from '../../src/data/api';
import { InboxScreen } from '../../src/features/inbox/screens/InboxScreen';
import { HistoryScreen } from '../../src/features/history/screens/HistoryScreen';

const nav = jest.fn();
const home = jest.fn();

beforeEach(() => { nav.mockClear(); home.mockClear(); });

test('live inbox shows an empty state without a device push settings button', async () => {
  await render(<InboxScreen
    repository={{ list: jest.fn().mockResolvedValue({ ok: true, data: { items: [], fetchedAt: '2026-11-08T00:00:00Z' } }) } as any}
    displayName="Trí"
    onNavigate={nav}
    onHome={home}
  />);
  expect(await screen.findByText('Chưa có thông báo')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Cài đặt thông báo trên thiết bị' })).toBeNull();
});

test('notification navigation opens the server-owned invitation without accepting it', async () => {
  const user = userEvent.setup();
  const item: InboxItem = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    eventId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    type: 'room_invite',
    title: 'Lời mời phòng',
    body: 'Bạn được mời vào phòng',
    read: false,
    metadata: { invitationId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', roomId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' },
    createdAt: '2026-11-08T00:00:00Z',
  };
  const repository = {
    list: jest.fn().mockResolvedValue({ ok: true, data: { items: [item], fetchedAt: '2026-11-08T00:00:00Z' } }),
    acceptRoom: jest.fn(),
  };
  await render(<InboxScreen
    repository={repository as any}
    displayName="Trí"
    onNavigate={nav}
    onHome={home}
    openEventId={item.eventId}
  />);
  expect(await screen.findByText('Lời mời phòng')).toBeOnTheScreen();
  expect(screen.queryByText('Thông báo từ máy chủ')).toBeNull();
  // Opening the notification never answers it; only the button does, and it acts at once (no confirmation sheet).
  expect(repository.acceptRoom).not.toHaveBeenCalled();
  await user.press(screen.getByRole('button', { name: 'Vào phòng' }));
  expect(screen.queryByText('Xác nhận chấp nhận')).toBeNull();
  expect(repository.acceptRoom).toHaveBeenCalledTimes(1);
});

test('notification retry resolves the same event from authenticated inbox after a network error', async () => {
  const user = userEvent.setup();
  const item: InboxItem = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    eventId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    type: 'room_invite',
    title: 'Lời mời phòng',
    body: 'Bạn được mời vào phòng',
    read: false,
    metadata: { invitationId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' },
    createdAt: '2026-11-08T00:00:00Z',
  };
  let online = false;
  const repository = {
    list: jest.fn(async () => online
      ? { ok: true as const, data: { items: [item], fetchedAt: '2026-11-08T00:00:00Z' } }
      : { ok: false as const, error: { messageKey: 'NETWORK_ERROR' as const } }),
  };

  await render(<InboxScreen
    repository={repository as any}
    displayName="Trí"
    onNavigate={nav}
    onHome={home}
    openEventId={item.eventId}
    notificationStatus="retry"
  />);
  expect(await screen.findByRole('button', { name: 'Thử lại tải thông báo' })).toBeOnTheScreen();
  expect(screen.getByText('Chưa tải được thông báo từ máy chủ. Hãy thử lại cùng thông báo.')).toBeOnTheScreen();

  online = true;
  await user.press(screen.getByRole('button', { name: 'Thử lại tải thông báo' }));

  expect(await screen.findByText('Lời mời phòng')).toBeOnTheScreen();
  expect(repository.list).toHaveBeenCalledTimes(2);
});

test('live inbox hides a handled invitation after the server accepts it', async () => {
  const user = userEvent.setup();
  const item: InboxItem = {
    id: '11111111-1111-4111-8111-111111111111',
    eventId: '22222222-2222-4222-8222-222222222222',
    type: 'friend_invite',
    title: 'Lời mời kết bạn',
    body: 'Có lời mời mới',
    read: false,
    metadata: { invitationId: '33333333-3333-4333-8333-333333333333' },
    createdAt: '2026-11-08T00:00:00Z',
  };
  let handled = false;
  const repository = {
    list: jest.fn(async () => ({ ok: true as const, data: { items: handled ? [] : [item], fetchedAt: '2026-11-08T00:00:00Z' } })),
    markHandled: jest.fn(() => { handled = true; }),
    acceptFriend: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
    rejectFriend: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
  };
  await render(<InboxScreen repository={repository as any} displayName="Trí" onNavigate={nav} onHome={home} />);
  await user.press(await screen.findByRole('button', { name: 'Đồng ý' }));

  expect(await screen.findByText('Chưa có thông báo')).toBeOnTheScreen();
  expect(repository.acceptFriend).toHaveBeenCalledWith('33333333-3333-4333-8333-333333333333');
  expect(repository.markHandled).toHaveBeenCalledWith(item.eventId);
  expect(screen.queryByRole('button', { name: 'Đồng ý' })).toBeNull();
});

test('legacy result notification routes to the read-only legacy result screen', async () => {
  const user = userEvent.setup();
  const roomId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const resultId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const item: InboxItem = {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    eventId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    type: 'room_result',
    title: 'Phòng đã có kết quả',
    body: 'Mở kết quả đã chốt',
    read: true,
    metadata: { roomId, resultId },
    createdAt: '2026-11-08T00:00:00Z',
  };
  const repository = {
    list: jest.fn().mockResolvedValue({ ok: true, data: { items: [item], fetchedAt: '2026-11-08T00:00:00Z' } }),
    resolveRoomResult: jest.fn().mockResolvedValue({ ok: true, data: { roomId, destination: 'result', resultId, resultContract: 'legacy' } }),
  };

  await render(<InboxScreen repository={repository as any} displayName="Trí" onNavigate={nav} onHome={home} />);
  await user.press(await screen.findByRole('button', { name: 'Mở kết quả: Phòng đã có kết quả' }));

  expect(repository.resolveRoomResult).toHaveBeenCalledWith(roomId, resultId, undefined);
  expect(nav).toHaveBeenCalledWith(`/inbox-result?roomId=${roomId}&resultId=${resultId}`);
});

test('live inbox marks all pages read and keeps the request ID after an uncertain response', async () => {
  const user = userEvent.setup();
  const item: InboxItem = {
    id: '11111111-1111-4111-8111-111111111111', eventId: '22222222-2222-4222-8222-222222222222',
    type: 'friend_invite', title: 'Lời mời kết bạn', body: 'Có lời mời mới', read: false,
    metadata: { invitationId: '33333333-3333-4333-8333-333333333333' }, createdAt: '2026-11-08T00:00:00Z',
  };
  let read = false;
  const requestIds: string[] = [];
  const repository = {
    list: jest.fn(async () => ({ ok: true as const, data: { items: [{ ...item, read }], fetchedAt: '2026-11-08T00:00:00Z' } })),
    markAllRead: jest.fn(async (requestId: string) => {
      requestIds.push(requestId);
      if (requestIds.length === 1) return { ok: false as const, error: { messageKey: 'TIMEOUT' as const } };
      read = true;
      return { ok: true as const, requestId, data: undefined };
    }),
  };
  await render(<InboxScreen repository={repository as any} displayName="Trí" onNavigate={nav} onHome={home} />);
  await user.press(await screen.findByRole('button', { name: 'Đánh dấu tất cả đã đọc' }));
  expect(await screen.findByText(/thử lại an toàn/)).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Đánh dấu tất cả đã đọc' }));
  // Success needs no toast: the list simply shows everything as read.
  await waitFor(() => expect(requestIds).toHaveLength(2));
  expect(screen.queryByText(/Đã đánh dấu/)).toBeNull();
  expect(requestIds).toHaveLength(2);
  expect(requestIds[1]).toBe(requestIds[0]);
  expect(screen.getByText('08/11/2026')).toBeOnTheScreen();
  expect(screen.queryByText(/chưa đọc trên trang/)).toBeNull();
  expect(screen.queryByText(/Cập nhật lúc/)).toBeNull();
});

test('live history opens the saved projection without re-reading the operational room', async () => {
  const user = userEvent.setup();
  const saved = {
    historyId: '11111111-1111-4111-8111-111111111111', roomId: '22222222-2222-4222-8222-222222222222',
    resultId: '33333333-3333-4333-8333-333333333333', scope: 'group',
    createdAt: '2026-11-07T11:00:00Z', expiresAt: '2026-12-07T11:00:00Z', desiredAt: '2026-11-07T12:00:00Z',
    finalizedAt: '2026-11-07T11:59:00Z', memberCount: 2,
    participants: [{ displayName: 'Linh', role: 'HOST' }, { displayName: 'Tú', role: 'MEMBER' }],
    result: {
      resultId: '33333333-3333-4333-8333-333333333333',
      contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B-supplement',
      policyVersion: 'dish-decision-v4/ADR-019-30PCT-MIN1', status: 'DECIDED', round: 2,
      winner: { dishId: '44444444-4444-4444-8444-444444444444', roundDishId: '55555555-5555-4555-8555-555555555555', name: 'Bún bò Huế', description: null, artwork: null, priceReference: null },
      reasonCode: 'ACCEPTABLE_FINAL', finalizedAt: '2026-11-07T11:59:00Z',
      scoreVersion: 'want2-ok1-round1-v1', rankingVersion: 'score-desc-dense-rank-v1',
      round1BallotCount: 2,
      topDishes: [{ dish: { dishId: '44444444-4444-4444-8444-444444444444', roundDishId: '55555555-5555-4555-8555-555555555555', name: 'Bún bò Huế', description: null, artwork: null, priceReference: null }, score: 4, rank: 1, isWinner: true }],
    },
  };
  const repository = {
    cached: () => undefined, cachedDurable: async () => undefined,
    fetch: async () => ({ ok: true as const, data: { items: [saved], fetchedAt: '2026-11-08T00:00:00Z' } }),
    updateConsent: jest.fn(), delete: jest.fn(), invalidate: jest.fn(),
  };
  await render(<HistoryScreen repository={repository as any} onNavigate={nav} onHome={home} />);
  expect(await screen.findByText(/Linh, Tú/)).toBeOnTheScreen();
  await user.press(await screen.findByRole('button', { name: 'Xem chi tiết đã lưu' }));
  expect(screen.getByText('Chi tiết bữa ăn')).toBeOnTheScreen();
  expect(screen.getByText('Xếp hạng của nhóm')).toBeOnTheScreen();
  expect(screen.getByText('Bún bò Huế · Món được chọn')).toBeOnTheScreen();
  expect(screen.getAllByText('4 điểm')).toHaveLength(2);
  expect(screen.getByText('Linh')).toBeOnTheScreen();
  expect(screen.getByText('Tú')).toBeOnTheScreen();
  expect(screen.getByText(/Bữa ăn dự kiến/)).toBeOnTheScreen();
  expect(screen.getByText(/Kết quả chốt/)).toBeOnTheScreen();
  expect(nav).not.toHaveBeenCalledWith(expect.stringContaining('/room/result'));
});

test('offline history cache hides group projections and keeps only personal rows', async () => {
  const personal = { historyId: '11111111-1111-4111-8111-111111111111', roomId: '22222222-2222-4222-8222-222222222222', resultId: '33333333-3333-4333-8333-333333333333', scope: 'personal', createdAt: '2026-11-07T11:00:00Z', expiresAt: '2026-12-07T11:00:00Z', memberCount: 2, result: { capability: 'legacy-unscored-v1', status: 'DECIDED', winner: { dishId: '44444444-4444-4444-8444-444444444444', roundDishId: '55555555-5555-4555-8555-555555555555', name: 'Riêng tư món', description: null, artwork: null, priceReference: null }, finalizedAt: '2026-11-07T11:59:00Z' } };
  const group = { ...personal, historyId: '66666666-6666-4666-8666-666666666666', scope: 'group', result: { ...personal.result, winner: { ...personal.result.winner, name: 'Không hiển thị nhóm offline' } } };
  const repository = {
    cached: () => ({ items: [group, personal], fetchedAt: '2026-11-07T12:00:00Z' }),
    cachedDurable: async () => undefined,
    fetch: async () => ({ ok: false as const, error: { messageKey: 'NETWORK_ERROR' as const } }),
    updateConsent: jest.fn(), delete: jest.fn(), invalidate: jest.fn(),
  };
  await render(<HistoryScreen repository={repository as any} onNavigate={nav} onHome={home} />);
  expect(await screen.findByText('Riêng tư món')).toBeOnTheScreen();
  expect(screen.queryByText('Không hiển thị nhóm offline')).toBeNull();
  expect(screen.getByText('Đang ngoại tuyến')).toBeOnTheScreen();
});

test('tapping a notification marks that one read; an invite shows the sender, with Từ chối left of Đồng ý', async () => {
  const user = userEvent.setup();
  const item: InboxItem = {
    id: '11111111-1111-4111-8111-111111111111', eventId: '22222222-2222-4222-8222-222222222222',
    type: 'friend_invite', title: 'Linh', body: 'muốn kết bạn với bạn', read: false,
    metadata: { invitationId: '33333333-3333-4333-8333-333333333333' }, createdAt: '2026-11-08T00:00:00Z',
  };
  const repository = {
    list: jest.fn(async () => ({ ok: true as const, data: { items: [item], fetchedAt: '2026-11-08T00:00:00Z' } })),
    markRead: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
  };
  await render(<InboxScreen repository={repository as any} displayName="Trí" onNavigate={nav} onHome={home} />);
  expect(await screen.findByText(/uốn kết bạn với bạn/)).toBeOnTheScreen();
  expect(screen.queryByText('Lời mời kết bạn')).toBeNull();
  const labels = screen.getAllByRole('button').map(button => button.props.accessibilityLabel).filter(label => label === 'Từ chối' || label === 'Đồng ý');
  expect(labels).toEqual(['Từ chối', 'Đồng ý']);
  await user.press(screen.getByRole('summary'));
  expect(repository.markRead).toHaveBeenCalledWith(item.eventId);
});
