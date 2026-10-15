import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { MockApiClient } from '../../src/data/api';
import { LobbyScreen } from '../../src/features/rooms/screens/LobbyScreen';
import { RoomStatusScreen } from '../../src/features/rooms/screens/RoomStatusScreen';

const nav = jest.fn();
const home = jest.fn();

beforeEach(() => { nav.mockClear(); home.mockClear(); });

test('lobby shows the fixture, host/member state, and requires ready before host start', async () => {
  const user = userEvent.setup();
  await render(<LobbyScreen onNavigate={nav} onHome={home} />);
  expect(await screen.findByText('Thành viên · 2/8')).toBeOnTheScreen();
  expect(screen.getByText('Mã hiển thị là fixture; QR chưa được tạo và không thể tham gia phòng thật.')).toBeOnTheScreen();
  const start = screen.getByRole('button', { name: 'Bắt đầu chọn món' });
  expect(start.props.accessibilityState.disabled).toBe(true);

  await user.press(screen.getByRole('button', { name: 'Tôi sẵn sàng' }));
  expect(await screen.findByText('Đã ghi nhận bạn sẵn sàng trong fixture.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Bắt đầu chọn món' }).props.accessibilityState.disabled).toBe(false);
  await user.press(screen.getByRole('button', { name: 'Bắt đầu chọn món' }));
  expect(await screen.findByText('Fixture chuyển sang vòng 1. Chưa có lượt gọi nghiệp vụ thật.')).toBeOnTheScreen();
});

test('member view does not expose host start action', async () => {
  const user = userEvent.setup();
  await render(<LobbyScreen onNavigate={nav} onHome={home} />);
  await screen.findByText('Thành viên · 2/8');
  await user.press(screen.getByRole('button', { name: 'Đang xem vai trò: Host · đổi vai trò' }));
  expect(screen.getByRole('button', { name: 'Tắt sẵn sàng' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Bắt đầu chọn món' })).toBeNull();
  expect(screen.queryByRole('button', { name: /đổi bối cảnh/ })).toBeNull();
  expect(screen.getByText('Ready là thao tác chủ động. Chỉ host bắt đầu khi tất cả thành viên trong fixture đã sẵn sàng.')).toBeOnTheScreen();
});

test('changing the room context resets ready flags in the UI fixture', async () => {
  const user = userEvent.setup();
  await render(<LobbyScreen onNavigate={nav} onHome={home} />);
  await screen.findByText('Thành viên · 2/8');
  await user.press(screen.getByRole('button', { name: 'Tôi sẵn sàng' }));
  await screen.findByText('Đã ghi nhận bạn sẵn sàng trong fixture.');
  await user.press(screen.getByRole('button', { name: 'Mô phỏng đổi bối cảnh · reset ready (Host)' }));
  expect(await screen.findByText('Bối cảnh đổi; trạng thái sẵn sàng của mọi người đã được đặt lại.')).toBeOnTheScreen();
  expect(screen.getAllByText('Chưa sẵn sàng')).toHaveLength(2);
});

test('member ready and leave mutate that identity in the same mock room and refetch accurately', async () => {
  const user = userEvent.setup();
  const mockClient = new MockApiClient({ delayMs: 0 });
  await render(<LobbyScreen onNavigate={nav} onHome={home} mockClient={mockClient} />);
  await screen.findByText('Thành viên · 2/8');

  await user.press(screen.getByRole('button', { name: 'Mô phỏng đổi bối cảnh · reset ready (Host)' }));
  await screen.findByText('Bối cảnh đổi; trạng thái sẵn sàng của mọi người đã được đặt lại.');
  await user.press(screen.getByRole('button', { name: 'Đang xem vai trò: Host · đổi vai trò' }));
  expect(screen.getByRole('button', { name: 'Đang xem vai trò: Member · đổi vai trò' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Mô phỏng đổi bối cảnh · reset ready (Host)' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Bắt đầu chọn món' })).toBeNull();

  await user.press(screen.getByRole('button', { name: 'Tôi sẵn sàng' }));
  await screen.findByText('Đã ghi nhận bạn sẵn sàng trong fixture.');
  const afterReady = await mockClient.getRoomSnapshot('room_mock_001');
  expect(afterReady.ok).toBe(true);
  if (!afterReady.ok) throw new Error('Expected room snapshot after member ready');
  expect(afterReady.data.members.find(member => member.userId === afterReady.data.hostUserId)?.ready).toBe(false);
  const member = afterReady.data.members.find(member => member.userId !== afterReady.data.hostUserId);
  expect(member?.displayName).toBe('Tuấn');
  expect(member?.ready).toBe(true);

  await user.press(screen.getByRole('button', { name: 'Rời phòng' }));
  await user.press(screen.getByRole('button', { name: 'Xác nhận rời' }));
  await screen.findByText('Bạn đã rời fixture này.');
  const afterLeave = await mockClient.getRoomSnapshot('room_mock_001');
  expect(afterLeave.ok).toBe(true);
  if (!afterLeave.ok) throw new Error('Expected room snapshot after member leave');
  expect(afterLeave.data.members.map(row => row.userId)).toEqual([afterLeave.data.hostUserId]);
  expect(await screen.findByText('Thành viên · 1/8')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Tôi sẵn sàng' })).toBeNull();
});

test('room status confirms cancellation and exposes expired and network states', async () => {
  const user = userEvent.setup();
  await render(<RoomStatusScreen onNavigate={nav} onHome={home} />);
  expect(await screen.findByText('Đang chờ thành viên')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Xác nhận hủy phòng (host)' }));
  expect(screen.getByText('Hủy phòng mock?')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Xác nhận hủy' }));
  expect(await screen.findByText('Đã hủy')).toBeOnTheScreen();

  await user.press(screen.getByRole('button', { name: 'Mô phỏng mất kết nối' }));
  expect(screen.getByText(/Mất kết nối/)).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Thử kết nối lại' }));
  await waitFor(() => expect(screen.getByText('Đã hủy')).toBeOnTheScreen());
  await user.press(screen.getByRole('button', { name: 'Trạng thái Hết hạn' }));
  expect(await screen.findByText(/ROOM_EXPIRED/)).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Trạng thái Dữ liệu cũ' }));
  expect(await screen.findByText(/VERSION_CONFLICT/)).toBeOnTheScreen();
});

test('lobby exposes loading fixture before returning the room', async () => {
  const user = userEvent.setup();
  await render(<LobbyScreen onNavigate={nav} onHome={home} />);
  await screen.findByText('Thành viên · 2/8');
  await user.press(screen.getByRole('button', { name: 'Trạng thái Đang tải' }));
  expect(screen.getByText('Đang tải phòng mock…')).toBeOnTheScreen();
  expect(await screen.findByText('Thành viên · 2/8')).toBeOnTheScreen();
});
