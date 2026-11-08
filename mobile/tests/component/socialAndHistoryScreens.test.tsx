import { act } from 'react';
import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { MockApiClient, type InboxItem } from '../../src/data/api';
import { FriendsScreen } from '../../src/features/friends/screens/FriendsScreen';
import { InboxScreen } from '../../src/features/inbox/screens/InboxScreen';
import { LiveInboxScreen } from '../../src/features/inbox/screens/LiveInboxScreen';
import { LiveHistoryScreen } from '../../src/features/history/screens/LiveHistoryScreen';
import { HistoryScreen } from '../../src/features/history/screens/HistoryScreen';

const nav = jest.fn();
const home = jest.fn();
const inboxInviteFixtures: InboxItem[] = [
  { id: 'inbox_room_accept', eventId: 'evt_room_accept', type: 'room_invite', title: 'Room accept', body: 'Room accept fixture', read: false, metadata: { invitationId: 'room_invite_accept', roomCode: 'GCD234', expiresAt: '2099-01-01T00:00:00Z' }, createdAt: '2026-10-11T07:45:00Z' },
  { id: 'inbox_room_reject', eventId: 'evt_room_reject', type: 'room_invite', title: 'Room reject', body: 'Room reject fixture', read: false, metadata: { invitationId: 'room_invite_reject', roomCode: 'GCD234', expiresAt: '2099-01-01T00:00:00Z' }, createdAt: '2026-10-11T07:46:00Z' },
  { id: 'inbox_friend_accept', eventId: 'evt_friend_accept', type: 'friend_invite', title: 'Friend accept', body: 'Friend accept fixture', read: false, metadata: { invitationId: 'friend_invite_accept', expiresAt: '2099-01-01T00:00:00Z' }, createdAt: '2026-10-11T07:47:00Z' },
  { id: 'inbox_friend_reject', eventId: 'evt_friend_reject', type: 'friend_invite', title: 'Friend reject', body: 'Friend reject fixture', read: false, metadata: { invitationId: 'friend_invite_reject', expiresAt: '2099-01-01T00:00:00Z' }, createdAt: '2026-10-11T07:48:00Z' },
  { id: 'inbox_room_expired', eventId: 'evt_room_expired', type: 'room_invite', title: 'Expired invite', body: 'Expired invite fixture', read: true, metadata: { invitationId: 'room_invite_expired', roomCode: 'GCD234', expiresAt: '2020-01-01T00:00:00Z' }, createdAt: '2020-01-01T00:00:00Z' },
  { id: 'inbox_friend_missing', eventId: 'evt_friend_missing', type: 'friend_invite', title: 'Missing reference', body: 'Missing reference fixture', read: false, metadata: { expiresAt: '2099-01-01T00:00:00Z' }, createdAt: '2026-10-11T07:49:00Z' },
];

beforeEach(() => { nav.mockClear(); home.mockClear(); });

test('friends supports confirmed accept, expired invite and unfriend', async () => {
  const user = userEvent.setup();
  await render(<FriendsScreen onNavigate={nav} onHome={home} />);
  expect(await screen.findByText('Tuấn')).toBeOnTheScreen();
  expect(screen.getByText(/Đã hết hạn/)).toBeOnTheScreen();

  await user.press(screen.getAllByRole('button', { name: 'Chấp nhận' })[0]!);
  expect(screen.getByText('Chấp nhận Linh?')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Xác nhận chấp nhận' }));
  expect(await screen.findByText('Đã chấp nhận lời mời mock của Linh.')).toBeOnTheScreen();

  await user.press(screen.getAllByRole('button', { name: 'Xóa bạn' })[0]!);
  expect(screen.getByText('Xóa Tuấn?')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Xác nhận xóa bạn' }));
  expect(await screen.findByText(/Đã xóa .* khỏi danh sách mock/)).toBeOnTheScreen();
});

test('friends exposes explicit empty and error adapter states', async () => {
  const user = userEvent.setup();
  await render(<FriendsScreen onNavigate={nav} onHome={home} />);
  await screen.findByText('Tuấn');
  await user.press(screen.getByRole('button', { name: 'Trạng thái Trống' }));
  expect(await screen.findByText('Chưa có bạn bè')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Trạng thái Lỗi mạng' }));
  expect(await screen.findByText('Không tải được bạn bè')).toBeOnTheScreen();
});

test('friends confirms reject and outgoing invite with the expected adapter calls', async () => {
  const user = userEvent.setup();
  const mockClient = new MockApiClient({ delayMs: 0 });
  const rejectPartner = jest.spyOn(mockClient, 'rejectPartner');
  const invitePartner = jest.spyOn(mockClient, 'invitePartner');
  await render(<FriendsScreen onNavigate={nav} onHome={home} mockClient={mockClient} />);
  await screen.findByText('Tuấn');

  await user.press(screen.getAllByRole('button', { name: 'Từ chối' })[0]!);
  expect(screen.getByText('Từ chối Linh?')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Xác nhận từ chối' }));
  expect(await screen.findByText('Đã từ chối lời mời mock.')).toBeOnTheScreen();
  expect(rejectPartner).toHaveBeenCalledWith('friend_invite_01', expect.any(String));

  await user.type(screen.getByLabelText('Mã bạn bè'), 'CODE77');
  await user.press(screen.getByRole('button', { name: 'Gửi lời mời' }));
  expect(screen.getByText('Gửi lời mời kết bạn?')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Gửi lời mời mock' }));
  expect(await screen.findByText('Đã gửi lời mời mock. Người nhận chưa tự động trở thành bạn.')).toBeOnTheScreen();
  expect(invitePartner).toHaveBeenCalledWith({ friendCode: 'CODE77', requestId: expect.any(String) });
});

test('inbox remains available with denied push permission and confirms invite actions', async () => {
  const user = userEvent.setup();
  await render(<InboxScreen onNavigate={nav} onHome={home} />);
  expect(await screen.findByText('Quyền bị từ chối · bạn vẫn đọc được inbox bên dưới.')).toBeOnTheScreen();
  expect(screen.getByText('Lời mời ăn trưa')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Chấp nhận Lời mời ăn trưa' }));
  expect(screen.getByText('Chấp nhận lời mời?')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Xác nhận chấp nhận' }));
  expect(await screen.findByText('Đã chấp nhận lời mời trong mock.')).toBeOnTheScreen();
});

test('live inbox does not link to the unimplemented push settings route', async () => {
  await render(<LiveInboxScreen
    repository={{ list: jest.fn().mockResolvedValue({ ok: true, data: { items: [], fetchedAt: '2026-11-08T00:00:00Z' } }) } as any}
    displayName="Trí"
    onNavigate={nav}
    onHome={home}
  />);
  expect(await screen.findByText('Chưa có thông báo')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Cài đặt thông báo' })).toBeNull();
  expect(nav).not.toHaveBeenCalledWith('/push-settings');
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
  await render(<LiveInboxScreen repository={repository as any} displayName="Trí" onNavigate={nav} onHome={home} />);
  await user.press(await screen.findByRole('button', { name: 'Chấp nhận' }));
  await user.press(screen.getByRole('button', { name: 'Xác nhận chấp nhận' }));

  expect(await screen.findByText('Chưa có thông báo')).toBeOnTheScreen();
  expect(repository.acceptFriend).toHaveBeenCalledWith('33333333-3333-4333-8333-333333333333');
  expect(repository.markHandled).toHaveBeenCalledWith(item.eventId);
  expect(screen.queryByRole('button', { name: 'Chấp nhận' })).toBeNull();
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

  await render(<LiveInboxScreen repository={repository as any} displayName="Trí" onNavigate={nav} onHome={home} />);
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
  await render(<LiveInboxScreen repository={repository as any} displayName="Trí" onNavigate={nav} onHome={home} />);
  await user.press(await screen.findByRole('button', { name: 'Đọc tất cả' }));
  expect(await screen.findByText(/thử lại an toàn/)).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Đọc tất cả' }));
  expect(await screen.findByText('Đã đánh dấu các thông báo hiện có là đã đọc.')).toBeOnTheScreen();
  expect(requestIds).toHaveLength(2);
  expect(requestIds[1]).toBe(requestIds[0]);
  expect(screen.getByText('Trước đó')).toBeOnTheScreen();
  expect(screen.getByText('Không có thông báo chưa đọc trên trang')).toBeOnTheScreen();
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
  await render(<LiveHistoryScreen repository={repository as any} onNavigate={nav} onHome={home} />);
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
  await render(<LiveHistoryScreen repository={repository as any} onNavigate={nav} onHome={home} />);
  expect(await screen.findByText('Riêng tư món')).toBeOnTheScreen();
  expect(screen.queryByText('Không hiển thị nhóm offline')).toBeNull();
  expect(screen.getByText('Đang ngoại tuyến')).toBeOnTheScreen();
});

test('inbox passes invitation IDs, distinct from event IDs, for all accept/reject types', async () => {
  const user = userEvent.setup();
  const mockClient = new MockApiClient({ delayMs: 0 });
  jest.spyOn(mockClient, 'listPartnerInbox').mockResolvedValue({ ok: true, data: inboxInviteFixtures });
  const acceptRoom = mockClient.acceptRoomInvite.bind(mockClient);
  const rejectRoom = mockClient.rejectRoomInvite.bind(mockClient);
  const acceptFriend = mockClient.acceptPartner.bind(mockClient);
  const rejectFriend = mockClient.rejectPartner.bind(mockClient);
  const acceptRoomInvite = jest.spyOn(mockClient, 'acceptRoomInvite');
  const rejectRoomInvite = jest.spyOn(mockClient, 'rejectRoomInvite');
  const acceptPartner = jest.spyOn(mockClient, 'acceptPartner');
  const rejectPartner = jest.spyOn(mockClient, 'rejectPartner');
  const valid = {
    room: new Set(['room_invite_accept', 'room_invite_reject']),
    friend: new Set(['friend_invite_accept', 'friend_invite_reject']),
  };
  const invalidInput = () => Promise.resolve({ ok: false as const, error: { messageKey: 'INVALID_INPUT' as const } });
  acceptRoomInvite.mockImplementation(request => valid.room.has(request.invitationId) ? acceptRoom(request) : invalidInput());
  rejectRoomInvite.mockImplementation((id, requestId) => valid.room.has(id) ? rejectRoom(id, requestId) : invalidInput());
  acceptPartner.mockImplementation((id, requestId) => valid.friend.has(id) ? acceptFriend(id, requestId) : invalidInput());
  rejectPartner.mockImplementation((id, requestId) => valid.friend.has(id) ? rejectFriend(id, requestId) : invalidInput());
  await render(<InboxScreen onNavigate={nav} onHome={home} mockClient={mockClient} />);
  await screen.findByText('Room accept');

  await user.press(screen.getAllByRole('button', { name: /^Chấp nhận / }).find(button => !button.props.accessibilityState.disabled)!);
  await user.press(screen.getByRole('button', { name: 'Xác nhận chấp nhận' }));
  expect(acceptRoomInvite).toHaveBeenCalledWith({ invitationId: 'room_invite_accept', displayName: 'Bạn mock', requestId: expect.any(String) });
  expect(await screen.findByText('Đã chấp nhận lời mời trong mock.')).toBeOnTheScreen();

  await user.press(screen.getAllByRole('button', { name: /^Từ chối / }).find(button => !button.props.accessibilityState.disabled)!);
  await user.press(screen.getByRole('button', { name: 'Xác nhận từ chối' }));
  expect(await screen.findByText('Đã từ chối lời mời trong mock.')).toBeOnTheScreen();
  expect(rejectRoomInvite).toHaveBeenCalledWith('room_invite_reject', expect.any(String));

  const enabledAccept = screen.getAllByRole('button', { name: /^Chấp nhận / }).find(button => !button.props.accessibilityState.disabled);
  expect(enabledAccept).toBeDefined();
  await user.press(enabledAccept!);
  await user.press(screen.getByRole('button', { name: 'Xác nhận chấp nhận' }));
  expect(await screen.findByText('Đã chấp nhận lời mời trong mock.')).toBeOnTheScreen();
  expect(acceptPartner).toHaveBeenCalledWith('friend_invite_accept', expect.any(String));

  await user.press(screen.getAllByRole('button', { name: /^Từ chối / }).find(button => !button.props.accessibilityState.disabled)!);
  await user.press(screen.getByRole('button', { name: 'Xác nhận từ chối' }));
  expect(await screen.findByText('Đã từ chối lời mời trong mock.')).toBeOnTheScreen();
  expect(rejectPartner).toHaveBeenCalledWith('friend_invite_reject', expect.any(String));

  expect((await mockClient.acceptRoomInvite({ invitationId: 'evt_room_accept', displayName: 'Bạn mock' })).ok).toBe(false);
  expect((await mockClient.rejectRoomInvite('evt_room_reject')).ok).toBe(false);
  expect((await mockClient.acceptPartner('evt_friend_accept')).ok).toBe(false);
  expect((await mockClient.rejectPartner('evt_friend_reject')).ok).toBe(false);
});

test('inbox disables expired invitations and entries without an invitation reference', async () => {
  const user = userEvent.setup();
  const mockClient = new MockApiClient({ delayMs: 0 });
  jest.spyOn(mockClient, 'listPartnerInbox').mockResolvedValue({ ok: true, data: inboxInviteFixtures });
  await render(<InboxScreen onNavigate={nav} onHome={home} mockClient={mockClient} />);
  await screen.findByText('Room accept');
  expect(screen.getByText('Lời mời đã hết hạn; thao tác bị khóa.')).toBeOnTheScreen();
  expect(screen.getAllByRole('button', { name: /^Chấp nhận / }).some(button => button.props.accessibilityState.disabled)).toBe(true);
  expect(screen.getByText('Thiếu mã lời mời; không thể xử lý mục này.')).toBeOnTheScreen();
  expect(screen.getAllByRole('button', { name: /^Từ chối / }).some(button => button.props.accessibilityState.disabled)).toBe(true);
  const disabledAccept = screen.getAllByRole('button', { name: /^Chấp nhận / }).find(button => button.props.accessibilityState.disabled);
  expect(disabledAccept).toBeDefined();
  await user.press(disabledAccept!);
  expect(screen.queryByText('Chấp nhận lời mời?')).toBeNull();
});

test('history shows fetched time, updates consent, and confirms deletion', async () => {
  const user = userEvent.setup();
  await render(<HistoryScreen onNavigate={nav} onHome={home} />);
  expect(await screen.findByText('Phở bò tái nạm')).toBeOnTheScreen();
  expect(screen.getByText(/Lấy từ fixture lúc/)).toBeOnTheScreen();
  await act(async () => { fireEvent(screen.getByRole('switch', { name: 'Tóm tắt nhóm' }), 'valueChange', false); });
  expect(await screen.findByText('Đã tắt consent group; summary tương ứng được ẩn khỏi màn này.')).toBeOnTheScreen();
  expect(screen.queryByText('Phở bò tái nạm')).toBeNull();

  await act(async () => { fireEvent(screen.getByRole('switch', { name: 'Tóm tắt nhóm' }), 'valueChange', true); });
  expect(await screen.findByText('Phở bò tái nạm')).toBeOnTheScreen();
  await user.press(screen.getAllByRole('button', { name: 'Xóa mục lịch sử' })[0]!);
  expect(screen.getByText('Xóa mục lịch sử?')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Xác nhận xóa' }));
  expect(await screen.findByText('Đã xóa summary trong adapter mock.')).toBeOnTheScreen();
  expect(screen.queryByText('Phở bò tái nạm')).toBeNull();
});
