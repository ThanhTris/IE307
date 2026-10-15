import { act } from 'react';
import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { MockApiClient } from '../../src/data/api';
import { FriendsScreen } from '../../src/features/friends/screens/FriendsScreen';
import { InboxScreen } from '../../src/features/inbox/screens/InboxScreen';
import { HistoryScreen } from '../../src/features/history/screens/HistoryScreen';

const nav = jest.fn();
const home = jest.fn();

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
  const acceptRoomInvite = jest.spyOn(mockClient, 'acceptRoomInvite');
  const rejectRoomInvite = jest.spyOn(mockClient, 'rejectRoomInvite');
  const acceptPartner = jest.spyOn(mockClient, 'acceptPartner');
  const rejectPartner = jest.spyOn(mockClient, 'rejectPartner');
  await render(<InboxScreen onNavigate={nav} onHome={home} mockClient={mockClient} />);
  await screen.findByText('Lời mời ăn trưa');

  await user.press(screen.getByRole('button', { name: 'Chấp nhận Lời mời ăn trưa' }));
  await user.press(screen.getByRole('button', { name: 'Xác nhận chấp nhận' }));
  expect(await screen.findByText('Đã chấp nhận lời mời trong mock.')).toBeOnTheScreen();
  expect(acceptRoomInvite).toHaveBeenCalledWith({ invitationId: 'room_invite_01', displayName: 'Bạn mock', requestId: expect.any(String) });

  await user.press(screen.getByRole('button', { name: 'Từ chối Lời mời ăn tối' }));
  await user.press(screen.getByRole('button', { name: 'Xác nhận từ chối' }));
  expect(await screen.findByText('Đã từ chối lời mời trong mock.')).toBeOnTheScreen();
  expect(rejectRoomInvite).toHaveBeenCalledWith('room_invite_02', expect.any(String));

  await user.press(screen.getByRole('button', { name: 'Chấp nhận Linh muốn kết bạn' }));
  await user.press(screen.getByRole('button', { name: 'Xác nhận chấp nhận' }));
  expect(await screen.findByText('Đã chấp nhận lời mời trong mock.')).toBeOnTheScreen();
  expect(acceptPartner).toHaveBeenCalledWith('friend_invite_01', expect.any(String));

  await user.press(screen.getByRole('button', { name: 'Từ chối Mai muốn kết bạn' }));
  await user.press(screen.getByRole('button', { name: 'Xác nhận từ chối' }));
  expect(await screen.findByText('Đã từ chối lời mời trong mock.')).toBeOnTheScreen();
  expect(rejectPartner).toHaveBeenCalledWith('friend_invite_02', expect.any(String));

  expect((await mockClient.acceptRoomInvite({ invitationId: 'evt_invite_01', displayName: 'Bạn mock' })).ok).toBe(false);
  expect((await mockClient.rejectRoomInvite('evt_invite_01')).ok).toBe(false);
  expect((await mockClient.acceptPartner('evt_friend_invite_01')).ok).toBe(false);
  expect((await mockClient.rejectPartner('evt_friend_invite_01')).ok).toBe(false);
});

test('inbox disables expired invitations and entries without an invitation reference', async () => {
  const user = userEvent.setup();
  await render(<InboxScreen onNavigate={nav} onHome={home} />);
  await screen.findByText('Lời mời ăn trưa');
  expect(screen.getByText('Lời mời đã hết hạn; thao tác bị khóa.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Chấp nhận Lời mời đã hết hạn' }).props.accessibilityState.disabled).toBe(true);
  expect(screen.getByText('Thiếu mã lời mời; không thể xử lý mục này.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Từ chối Thiếu mã lời mời' }).props.accessibilityState.disabled).toBe(true);
  await user.press(screen.getByRole('button', { name: 'Chấp nhận Lời mời đã hết hạn' }));
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
