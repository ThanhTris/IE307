import { render, screen, userEvent } from '@testing-library/react-native';
import { MockApiClient } from '../../src/data/api';
import { LobbyScreen } from '../../src/features/rooms/screens/LobbyScreen';
import { RoomStatusScreen } from '../../src/features/rooms/screens/RoomStatusScreen';

const nav = jest.fn();
const home = jest.fn();

beforeEach(() => { nav.mockClear(); home.mockClear(); });

test('host lobby is ready to start without member-ready ballots and shows the 20-person cap', async () => {
  const user = userEvent.setup();
  await render(<LobbyScreen onNavigate={nav} onHome={home} />);
  expect(await screen.findByText('Thành viên · 2/20')).toBeOnTheScreen();
  expect(screen.getByText('Mã hiển thị là fixture; QR chưa được tạo và không thể tham gia phòng thật.')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: /sẵn sàng/i })).toBeNull();
  const start = screen.getByRole('button', { name: 'Bắt đầu chọn món' });
  expect(start.props.accessibilityState.disabled).not.toBe(true);
  await user.press(start);
  expect(await screen.findByText('Fixture chuyển sang vòng 1. Chưa có lượt gọi nghiệp vụ thật.')).toBeOnTheScreen();
});

test('member lobby does not expose host-only start or context controls', async () => {
  const user = userEvent.setup();
  await render(<LobbyScreen onNavigate={nav} onHome={home} />);
  await screen.findByText('Thành viên · 2/20');
  await user.press(screen.getByRole('button', { name: 'Đang xem vai trò: Host · đổi vai trò' }));
  expect(screen.queryByRole('button', { name: 'Bắt đầu chọn món' })).toBeNull();
  expect(screen.queryByRole('button', { name: /đổi bối cảnh/i })).toBeNull();
  expect(screen.queryByRole('button', { name: /sẵn sàng/i })).toBeNull();
  expect(screen.getByRole('button', { name: 'Rời phòng' })).toBeOnTheScreen();
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
