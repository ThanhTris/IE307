import { renderRouter } from 'expo-router/testing-library';
import { router } from 'expo-router';
import { act } from 'react';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { store } from 'expo-router/build/global-state/router-store';
import Layout from '../../src/app/_layout';
import Index from '../../src/app/index';
import Foundation from '../../src/app/foundation';
import NotFound from '../../src/app/+not-found';
import Components from '../../src/app/components';
import Features from '../../src/app/features';
import Lobby from '../../src/app/gm11/lobby';
import RoomStatus from '../../src/app/gm11/status';
import Friends from '../../src/app/gm14/friends';
import Inbox from '../../src/app/gm14/inbox';
import History from '../../src/app/gm14/history';
import Shell from '../../src/app/shell';
import CreateRoom from '../../src/app/create-room';
import JoinRoom from '../../src/app/join-room';
import RoomPreview from '../../src/app/room-preview';
import Gm12Vote from '../../src/app/gm12/vote';
import Gm12Final from '../../src/app/gm12/final';
import { rememberPreviewRoom, setPreviewScenario } from '../../src/bootstrap/roomPreview';

const routes = {
  _layout: Layout,
  index: Index,
  foundation: Foundation,
  components: Components,
  features: Features,
  'gm11/lobby': Lobby,
  'gm11/status': RoomStatus,
  'gm14/friends': Friends,
  'gm14/inbox': Inbox,
  'gm14/history': History,
  shell: Shell,
  'create-room': CreateRoom,
  'join-room': JoinRoom,
  'room-preview': RoomPreview,
  '+not-found': NotFound,
  'gm12/vote': Gm12Vote,
  'gm12/final': Gm12Final,
};
beforeEach(() => setPreviewScenario('default'));
afterEach(() => jest.useRealTimers());

test('real route modules navigate from shell to foundation and back', async () => {
  await renderRouter(routes, { initialUrl: '/shell' });
  expect(store.getRouteInfo().pathname).toBe('/shell');
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.press(screen.getByRole('button', { name: 'Xem cấu trúc ứng dụng' }));
  await waitFor(() => expect(store.getRouteInfo().pathname).toBe('/foundation'));
  await user.press(screen.getByRole('button', { name: 'Quay lại' }));
  await waitFor(() => expect(store.getRouteInfo().pathname).toBe('/shell'));
});

test('foundation exposes the GM-05 component preview route', async () => {
  await renderRouter(routes, { initialUrl: '/foundation' });
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.press(screen.getByRole('button', { name: 'Mở component mẫu GM-05' }));
  await waitFor(() => expect(store.getRouteInfo().pathname).toBe('/components'));
  expect(screen.getByText('GM-05 · Component dùng chung')).toBeOnTheScreen();
  expect(screen.getByText('Phở bò tái nạm')).toBeOnTheScreen();
});

test('unknown deep link renders not-found and recovers to shell', async () => {
  await renderRouter(routes, { initialUrl: '/khong-co-trang' });
  expect(screen.getByText('Không tìm thấy trang')).toBeOnTheScreen();
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.press(screen.getByRole('button', { name: 'Về trang đầu' }));
  await waitFor(() => expect(store.getRouteInfo().pathname).toBe('/'));
  expect(screen.getByText(/Chọn một món/)).toBeOnTheScreen();
});

test('foundation preview opens GM-11 and GM-14 routes through Expo Router', async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await renderRouter(routes, { initialUrl: '/foundation' });
  await user.press(screen.getByRole('button', { name: 'Mở các màn mock GM-11 và GM-14' }));
  await waitFor(() => expect(store.getRouteInfo().pathname).toBe('/features'));
  await user.press(screen.getByRole('button', { name: 'GM-14 · Lịch sử · Mở' }));
  await waitFor(() => expect(store.getRouteInfo().pathname).toBe('/gm14/history'));
  expect(await screen.findByText('Quyền lưu lịch sử')).toBeOnTheScreen();
});

test('Home navigates create/join with back to Home and preserves foundation tools', async () => {
  await renderRouter(routes, { initialUrl: '/' });
  const user = userEvent.setup();
  await screen.findByText(/Chào /);
  await user.press(screen.getByRole('button', { name: '＋ Tạo kèo ăn' }));
  await waitFor(() => expect(store.getRouteInfo().pathname).toBe('/create-room'));
  await user.press(screen.getByRole('button', { name: '‹ Quay lại' }));
  await screen.findByText(/Chào /);
  await user.press(screen.getByRole('button', { name: 'Tôi có mã phòng' }));
  await waitFor(() => expect(store.getRouteInfo().pathname).toBe('/join-room'));
  await user.press(screen.getByRole('button', { name: '‹ Quay lại' }));
  await waitFor(() => expect(store.getRouteInfo().pathname).toBe('/'));
});

test('join deep link pre-fills code but waits for user confirmation', async () => {
  await renderRouter(routes, { initialUrl: '/join-room?code=gcd234' });
  expect(screen.getByLabelText('Mã phòng (6 ký tự)').props.value).toBe('GCD234');
  expect(screen.queryByText('Đã nhận yêu cầu mô phỏng')).toBeNull();
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Tên của bạn'), 'Tuấn');
  await user.press(screen.getByRole('button', { name: 'Vào phòng →' }));
  await user.press(screen.getByRole('button', { name: 'Xác nhận vào phòng mô phỏng' }));
  await waitFor(() => expect(store.getRouteInfo().pathname).toBe('/room-preview'));
  expect(await screen.findByLabelText('Mã phòng GCD234')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: '‹ Quay lại' }));
  await screen.findByText('Phòng mẫu #GCD234');
  await user.press(screen.getByRole('button', { name: 'Quay lại phòng mô phỏng' }));
  await waitFor(() => expect(store.getRouteInfo().pathname).toBe('/room-preview'));
});

test('Home create flow reaches the adapter receipt and preserves the room on return', async () => {
  await renderRouter(routes, { initialUrl: '/' });
  const user = userEvent.setup();
  await screen.findByText(/Chào /);
  await user.press(screen.getByRole('button', { name: '＋ Tạo kèo ăn' }));
  await screen.findByRole('button', { name: 'Hồ Con Rùa' });
  await user.type(screen.getByLabelText('Tên của bạn (chủ phòng)'), 'Tuấn');
  await user.press(screen.getByRole('button', { name: 'Hồ Con Rùa' }));
  expect(screen.getByText('BỐI CẢNH PHÒNG')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Tôi xác nhận điểm ăn, buổi và giờ' }));
  await user.press(screen.getByRole('button', { name: 'Tạo phòng mô phỏng' }));
  await waitFor(() => expect(store.getRouteInfo().pathname).toBe('/room-preview'));
  expect(await screen.findByText('Đã tạo phòng mẫu')).toBeOnTheScreen();
  expect(screen.getByText('Đã nhận yêu cầu mô phỏng')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: '‹ Quay lại' }));
  await waitFor(() => expect(store.getRouteInfo().pathname).toBe('/'));
  expect(screen.getByRole('button', { name: 'Quay lại phòng mô phỏng' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: '＋ Tạo kèo ăn' })).toBeDisabled();
});

test('a warm route parameter updates the code without joining or keeping the previous confirmation', async () => {
  await renderRouter(routes, { initialUrl: '/join-room?code=GCD234' });
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Tên của bạn'), 'Tuấn');
  await user.press(screen.getByRole('button', { name: 'Vào phòng →' }));
  expect(screen.getByRole('button', { name: 'Xác nhận vào phòng mô phỏng' })).toBeOnTheScreen();
  await act(async () => router.setParams({ code: 'xyz789' }));
  await waitFor(() => expect(screen.getByLabelText('Mã phòng (6 ký tự)').props.value).toBe('XYZ789'));
  expect(screen.getByLabelText('Tên của bạn').props.value).toBe('Tuấn');
  expect(screen.queryByRole('button', { name: 'Xác nhận vào phòng mô phỏng' })).toBeNull();
  expect(screen.queryByText('Đã nhận yêu cầu mô phỏng')).toBeNull();
  expect(store.getRouteInfo().pathname).toBe('/join-room');
});

test('changing fixture on join renders full error and can reset for retry', async () => {
  await renderRouter(routes, { initialUrl: '/join-room' });
  const user = userEvent.setup();
  expect(screen.queryByRole('button', { name: 'Đầy phòng' })).toBeNull();
  await user.press(screen.getByRole('button', { name: 'Công cụ kiểm thử' }));
  await user.press(screen.getByRole('button', { name: 'Đầy phòng' }));
  await user.type(screen.getByLabelText('Tên của bạn'), 'Tuấn');
  await user.press(screen.getByRole('button', { name: 'Điền mã mẫu GCD234' }));
  await user.press(screen.getByRole('button', { name: 'Vào phòng →' }));
  await user.press(screen.getByRole('button', { name: 'Xác nhận vào phòng mô phỏng' }));
  expect(await screen.findByText(/Phòng đã đủ người/)).toBeOnTheScreen();
  expect(store.getRouteInfo().pathname).toBe('/join-room');
  await user.press(screen.getByRole('button', { name: 'Công cụ kiểm thử' }));
  await user.press(screen.getByRole('button', { name: 'Bình thường' }));
  expect(screen.queryByText(/Phòng đã đủ người/)).toBeNull();
});

test('receipt deep link without memory offers safe recovery instead of inventing room', async () => {
  await renderRouter(routes, { initialUrl: '/room-preview' });
  expect(screen.getByText('Phiên mẫu chỉ lưu trong bộ nhớ')).toBeOnTheScreen();
  const user = userEvent.setup();
  await user.press(screen.getByRole('button', { name: '‹ Quay lại' }));
  await waitFor(() => expect(store.getRouteInfo().pathname).toBe('/'));
});

test.each(['/create-room', '/join-room'])('active receipt guards direct navigation to %s', async initialUrl => {
  rememberPreviewRoom({ roomId: 'room_mock_001', code: 'GCD234', version: 1, role: 'host' });
  await renderRouter(routes, { initialUrl });
  expect(screen.getByText('Đã nhận yêu cầu mô phỏng')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Tên của bạn (chủ phòng)')).toBeNull();
  expect(screen.queryByLabelText('Tên của bạn')).toBeNull();
});

test('shell navigates to GM-12 vote route and renders voting screen', async () => {
  await renderRouter(routes, { initialUrl: '/shell' });
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.press(screen.getByRole('button', { name: 'Mở bình chọn GM-12' }));
  await waitFor(() => expect(store.getRouteInfo().pathname).toBe('/gm12/vote'));
  expect(screen.getByText('GM-12 · UI Chọn món Vòng 1 (Flashcard Vote)')).toBeOnTheScreen();
});
