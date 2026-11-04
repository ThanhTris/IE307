import { render, screen, userEvent } from '@testing-library/react-native';
import { MockApiClient } from '../../src/data/api';
import { LobbyScreen } from '../../src/features/rooms/screens/LobbyScreen';
import { RoomStatusScreen } from '../../src/features/rooms/screens/RoomStatusScreen';

const nav = jest.fn();
const home = jest.fn();

beforeEach(() => { nav.mockClear(); home.mockClear(); });

test('host identity matches the mock room, host-only actions remain available, and Start needs no ready ballots', async () => {
  const user = userEvent.setup();
  const mockClient = new MockApiClient({ delayMs: 0 });
  const session = await mockClient.restoreSession('fixture-token');
  const before = await mockClient.getRoomSnapshot('room_mock_001');
  if (!session.ok || !before.ok) throw new Error('Expected seeded mock identity and room');
  expect(before.data.hostUserId).toBe(session.data.id);
  await render(<LobbyScreen onNavigate={nav} onHome={home} mockClient={mockClient} />);
  expect(await screen.findByText('Thành viên · 2/20')).toBeOnTheScreen();
  expect(screen.getByText('Mã hiển thị là fixture; QR chưa được tạo và không thể tham gia phòng thật.')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: /sẵn sàng/i })).toBeNull();
  expect(screen.getByRole('button', { name: 'Mô phỏng đổi bối cảnh (Host)' })).toBeOnTheScreen();
  const start = screen.getByRole('button', { name: 'Bắt đầu chọn món' });
  expect(start.props.accessibilityState.disabled).not.toBe(true);
  await user.press(start);
  expect(await screen.findByText('Fixture chuyển sang vòng 1. Chưa có lượt gọi nghiệp vụ thật.')).toBeOnTheScreen();
});

test('member role updates the same mock identity, hides host controls, and leave removes that user after refetch', async () => {
  const user = userEvent.setup();
  const mockClient = new MockApiClient({ delayMs: 0 });
  const initial = await mockClient.getRoomSnapshot('room_mock_001');
  if (!initial.ok) throw new Error('Expected seeded mock room');
  const hostId = initial.data.hostUserId;
  const member = initial.data.members.find(row => row.userId !== hostId);
  if (!member) throw new Error('Expected a non-host member in the fixture');
  const setCurrentUser = jest.spyOn(mockClient, 'setCurrentUser');
  await render(<LobbyScreen onNavigate={nav} onHome={home} mockClient={mockClient} />);
  await screen.findByText('Thành viên · 2/20');
  await user.press(screen.getByRole('button', { name: 'Đang xem vai trò: Host · đổi vai trò' }));
  expect(screen.getByRole('button', { name: 'Đang xem vai trò: Member · đổi vai trò' })).toBeOnTheScreen();
  expect(setCurrentUser).toHaveBeenLastCalledWith({ id: member.userId, displayName: member.displayName, isGuest: true, createdAt: member.joinedAt });
  const activeIdentity = await mockClient.restoreSession('fixture-token');
  if (!activeIdentity.ok) throw new Error('Expected mock identity after switching role');
  expect(activeIdentity.data.id).toBe(member.userId);
  expect(screen.queryByRole('button', { name: 'Bắt đầu chọn món' })).toBeNull();
  expect(screen.queryByRole('button', { name: /đổi bối cảnh/i })).toBeNull();
  expect(screen.queryByRole('button', { name: /sẵn sàng/i })).toBeNull();
  expect(screen.getByRole('button', { name: 'Rời phòng' })).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Đang xem vai trò: Member · đổi vai trò' }));
  const hostIdentity = await mockClient.restoreSession('fixture-token');
  if (!hostIdentity.ok) throw new Error('Expected mock identity after switching back to host');
  expect(hostIdentity.data.id).toBe(hostId);
  expect(screen.getByRole('button', { name: 'Bắt đầu chọn món' })).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Đang xem vai trò: Host · đổi vai trò' }));
  const memberIdentity = await mockClient.restoreSession('fixture-token');
  if (!memberIdentity.ok) throw new Error('Expected mock identity after switching back to member');
  expect(memberIdentity.data.id).toBe(member.userId);
  await user.press(screen.getByRole('button', { name: 'Rời phòng' }));
  expect(screen.getByText('Xác nhận rời phòng?')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Xác nhận rời' }));
  expect(await screen.findByText('Bạn đã rời fixture này.')).toBeOnTheScreen();
  const afterLeave = await mockClient.getRoomSnapshot('room_mock_001');
  if (!afterLeave.ok) throw new Error('Expected room snapshot after member leave');
  expect(afterLeave.data.members.map(row => row.userId)).toEqual([hostId]);
  expect(await screen.findByText('Thành viên · 1/20')).toBeOnTheScreen();
  expect((await mockClient.restoreSession('fixture-token')).ok).toBe(true);
  expect(setCurrentUser).toHaveBeenLastCalledWith({ id: member.userId, displayName: member.displayName, isGuest: true, createdAt: member.joinedAt });
});

test('mock roster preview supports the 1, 3, and 20 member states', async () => {
  const user = userEvent.setup();
  await render(<LobbyScreen onNavigate={nav} onHome={home} />);
  await screen.findByText('Thành viên · 2/20');
  await user.press(screen.getByRole('button', { name: '3 thành viên' }));
  expect(await screen.findByText('Thành viên · 3/20')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: '20 thành viên' }));
  expect(await screen.findByText('Thành viên · 20/20')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: '1 thành viên' }));
  expect(await screen.findByText('Thành viên · 1/20')).toBeOnTheScreen();
});

test('room status confirms host cancellation and exposes expired/network states', async () => {
  const user = userEvent.setup();
  await render(<RoomStatusScreen onNavigate={nav} onHome={home} />);
  expect(await screen.findByText('Đang chờ thành viên')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Xác nhận hủy phòng' }));
  expect(screen.getByText('Hủy phòng mock?')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Xác nhận hủy' }));
  expect(await screen.findByText('Phòng mock đã hủy.')).toBeOnTheScreen();

  await user.press(screen.getByRole('button', { name: 'Mô phỏng mất kết nối' }));
  expect(screen.getByText(/Mất kết nối/)).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Thử kết nối lại' }));
  expect(await screen.findByText('Đã hủy')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Trạng thái Hết hạn' }));
  expect(await screen.findByText(/ROOM_EXPIRED/)).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Trạng thái Dữ liệu cũ' }));
  expect(await screen.findByText(/VERSION_CONFLICT/)).toBeOnTheScreen();
});

test('loading controls are deterministic and the mock does not expose ready actions', async () => {
  const user = userEvent.setup();
  const mockClient = new MockApiClient({ delayMs: 0 });
  await render(<LobbyScreen onNavigate={nav} onHome={home} mockClient={mockClient} />);
  await screen.findByText('Thành viên · 2/20');
  await user.press(screen.getByRole('button', { name: 'Trạng thái Đang tải' }));
  expect(screen.getByText('Đang tải phòng mock…')).toBeOnTheScreen();
  expect(await screen.findByText('Thành viên · 2/20')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: /sẵn sàng/i })).toBeNull();
});
