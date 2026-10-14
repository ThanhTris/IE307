import { act } from 'react';
import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
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

  await user.press(screen.getByRole('button', { name: 'Chấp nhận' }));
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

test('inbox remains available with denied push permission and confirms invite actions', async () => {
  const user = userEvent.setup();
  await render(<InboxScreen onNavigate={nav} onHome={home} />);
  expect(await screen.findByText('Quyền bị từ chối · bạn vẫn đọc được inbox bên dưới.')).toBeOnTheScreen();
  expect(screen.getByText('Lời mời ăn trưa')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Chấp nhận' }));
  expect(screen.getByText('Chấp nhận lời mời?')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Xác nhận chấp nhận' }));
  expect(await screen.findByText('Đã chấp nhận lời mời trong mock.')).toBeOnTheScreen();
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
