import { act } from 'react';
import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { MockApiClient, type InboxItem } from '../../src/data/api';
import { FriendsScreen } from '../../src/features/friends/screens/FriendsScreen';
import { InboxScreen } from '../../src/features/inbox/screens/InboxScreen';
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

  await user.press(screen.getByRole('button', { name: 'Chấp nhận Room accept' }));
  await user.press(screen.getByRole('button', { name: 'Xác nhận chấp nhận' }));
  expect(acceptRoomInvite).toHaveBeenCalledWith({ invitationId: 'room_invite_accept', displayName: 'Bạn mock', requestId: expect.any(String) });
  expect(await screen.findByText('Đã chấp nhận lời mời trong mock.')).toBeOnTheScreen();

  await user.press(screen.getByRole('button', { name: 'Từ chối Room reject' }));
  await user.press(screen.getByRole('button', { name: 'Xác nhận từ chối' }));
  expect(await screen.findByText('Đã từ chối lời mời trong mock.')).toBeOnTheScreen();
  expect(rejectRoomInvite).toHaveBeenCalledWith('room_invite_reject', expect.any(String));

  await user.press(screen.getByRole('button', { name: 'Chấp nhận Friend accept' }));
  await user.press(screen.getByRole('button', { name: 'Xác nhận chấp nhận' }));
  expect(await screen.findByText('Đã chấp nhận lời mời trong mock.')).toBeOnTheScreen();
  expect(acceptPartner).toHaveBeenCalledWith('friend_invite_accept', expect.any(String));

  await user.press(screen.getByRole('button', { name: 'Từ chối Friend reject' }));
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
  expect(screen.getByRole('button', { name: 'Chấp nhận Expired invite' }).props.accessibilityState.disabled).toBe(true);
  expect(screen.getByText('Thiếu mã lời mời; không thể xử lý mục này.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Từ chối Missing reference' }).props.accessibilityState.disabled).toBe(true);
  await user.press(screen.getByRole('button', { name: 'Chấp nhận Expired invite' }));
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
